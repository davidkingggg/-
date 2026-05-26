import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function assertUsesAdminTaskOwner(relativePath: string) {
  const source = read(relativePath)
  assert(
    /await\s+ensureAdminTaskOwnerPersonId\(\)/.test(source),
    `${relativePath} must require an authenticated bound person before handling admin task data`,
  )
}

function assertIncludes(source: string, needle: string, message: string) {
  assert(source.includes(needle), message)
}

function assertExcludes(source: string, needle: string, message: string) {
  assert(!source.includes(needle), message)
}

function assertGlobalArchiveExcludesAdminTask() {
  const globalArchiveFiles = [
    'app/api/archive/route.ts',
    'app/api/archive/[type]/[id]/restore/route.ts',
    'app/api/archive/delete/route.ts',
    'app/archive/page.tsx',
  ]

  for (const relativePath of globalArchiveFiles) {
    const source = read(relativePath)
    assertExcludes(source, 'admintask', `${relativePath} must not expose admin tasks through the global archive`)
    assertExcludes(source, 'adminTask', `${relativePath} must not operate on AdminTask through the global archive`)
  }
}

function assertAdminTaskDetailSafeguards() {
  const relativePath = 'app/api/admin-tasks/[id]/route.ts'
  const source = read(relativePath)
  assertUsesAdminTaskOwner(relativePath)
  assertIncludes(source, 'findOwnedAdminTask', `${relativePath} must scope update/status/archive actions to owned tasks`)
  assertIncludes(source, 'isArchived: true', `${relativePath} must archive tasks logically instead of deleting them`)
  assertIncludes(source, 'archivedAt: new Date()', `${relativePath} must stamp archive time`)
}

function assertAdminTaskRestoreSafeguards() {
  const relativePath = 'app/api/admin-task-archive/[id]/restore/route.ts'
  const source = read(relativePath)
  assertUsesAdminTaskOwner(relativePath)
  assertIncludes(source, 'findOwnedArchivedAdminTask', `${relativePath} must restore only owned archived tasks`)
  assertIncludes(source, '确认恢复', `${relativePath} must require the restore confirmation phrase`)
  assertIncludes(source, 'updateMany', `${relativePath} must use a guarded restore mutation`)
  assertIncludes(source, 'ownerPersonId', `${relativePath} must scope restore mutation to the owner`)
  assertIncludes(source, 'isArchived: true', `${relativePath} must restore only archived tasks`)
  assertIncludes(source, 'isArchived: false', `${relativePath} must unarchive the task`)
  assertIncludes(source, 'archivedAt: null', `${relativePath} must clear archive time`)
  assertExcludes(source, 'prisma.adminTask.update({', `${relativePath} must not restore by raw id with update()`)
}

function assertAdminTaskDeleteSafeguards() {
  const relativePath = 'app/api/admin-task-archive/[id]/delete/route.ts'
  const source = read(relativePath)
  assertUsesAdminTaskOwner(relativePath)
  assertIncludes(source, '确认彻底删除', `${relativePath} must require the permanent delete confirmation phrase`)
  assertIncludes(source, 'deleteMany', `${relativePath} must use a guarded delete query`)
  assertIncludes(source, 'ownerPersonId', `${relativePath} must scope permanent deletion to the owner`)
  assertIncludes(source, 'isArchived: true', `${relativePath} must delete only archived tasks`)
}

async function fetchWithTimeout(path: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2_000)

  try {
    return await fetch(new URL(path, BASE_URL), {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function tryHttpSmoke() {
  try {
    const archiveResponse = await fetchWithTimeout('/api/admin-task-archive')
    assert.equal(archiveResponse.status, 401, 'GET /api/admin-task-archive must reject unauthenticated requests')

    const createResponse = await fetchWithTimeout('/api/admin-tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: '未登录行政事项烟测',
        type: '会议',
        taskDate: '2026-05-26',
        status: '未开始',
      }),
    })
    assert.equal(createResponse.status, 401, 'POST /api/admin-tasks must reject unauthenticated requests')
    console.log('admin calendar archive HTTP smoke passed')
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) {
      console.log(`admin calendar archive HTTP smoke skipped: server unavailable at ${BASE_URL}`)
      return
    }
    throw error
  }
}

async function main() {
  assertGlobalArchiveExcludesAdminTask()
  assertUsesAdminTaskOwner('app/api/admin-task-archive/route.ts')
  assertUsesAdminTaskOwner('app/api/admin-tasks/route.ts')
  assertAdminTaskDetailSafeguards()
  assertAdminTaskRestoreSafeguards()
  assertAdminTaskDeleteSafeguards()

  console.log('admin calendar archive static checks passed')

  await tryHttpSmoke()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
