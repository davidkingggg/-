import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  AGENT_TOKEN_PREFIX,
  createAgentApiTokenSecret,
  hashAgentApiToken,
} from '../lib/agent-api-tokens'

const first = createAgentApiTokenSecret()
const second = createAgentApiTokenSecret()

assert(first.raw.startsWith(AGENT_TOKEN_PREFIX), 'agent token must use the public prefix')
assert(first.prefix.startsWith(AGENT_TOKEN_PREFIX), 'stored prefix must include the public prefix')
assert.notEqual(first.raw, second.raw, 'agent token generation must be random')
assert.notEqual(hashAgentApiToken(first.raw), first.raw, 'stored token hash must not be plaintext')
assert.equal(hashAgentApiToken(first.raw), hashAgentApiToken(first.raw), 'token hashing must be stable')

const apiRoot = join(process.cwd(), 'app', 'api')
const authPatterns = [
  /await\s+requireUser\(/,
  /await\s+requireAdmin\(/,
  /await\s+requireSessionAdmin\(/,
  /await\s+requireSessionAdminForDestructive\(/,
  /await\s+ensureAdminTaskOwnerPersonId\(/,
  /await\s+getCurrentUser\(/,
]

function listRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) return listRouteFiles(fullPath)
    return entry === 'route.ts' ? [fullPath] : []
  })
}

const unauthenticatedRoutes = listRouteFiles(apiRoot).filter((file) => {
  const relativePath = relative(apiRoot, file).replace(/\\/g, '/')
  if (relativePath.startsWith('auth/')) return false
  const source = readFileSync(file, 'utf8')
  return !authPatterns.some((pattern) => pattern.test(source))
})

assert.deepEqual(
  unauthenticatedRoutes,
  [],
  `non-public API routes must call an auth helper before Bearer tokens can pass proxy: ${unauthenticatedRoutes
    .map((file) => relative(process.cwd(), file).replace(/\\/g, '/'))
    .join(', ')}`,
)

assert(existsSync(join(process.cwd(), 'prisma', 'migrations', '20260525120000_add_agent_api_tokens', 'migration.sql')))

console.log('All agent API token checks passed.')
