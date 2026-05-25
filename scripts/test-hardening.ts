import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

type Check = {
  name: string
  run: () => void
}

const root = process.cwd()
const failures: string[] = []

function file(relativePath: string) {
  return path.join(root, relativePath)
}

function read(relativePath: string) {
  return readFileSync(file(relativePath), 'utf8')
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function assertFile(relativePath: string) {
  assert(existsSync(file(relativePath)), `Missing required file: ${relativePath}`)
}

function assertIncludes(source: string, needle: string, message: string) {
  assert(source.includes(needle), message)
}

function assertNotIncludes(source: string, needle: string, message: string) {
  assert(!source.includes(needle), message)
}

function packageJson() {
  return JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
}

const checks: Check[] = [
  {
    name: 'required files exist',
    run: () => {
      ;[
        'package.json',
        'scripts/deploy-systemd.sh',
        'scripts/test-hardening.ts',
        'app/api/backups/route.ts',
        'app/api/backups/restore/route.ts',
        'app/api/users/route.ts',
        'app/api/users/[id]/route.ts',
        'lib/backup-utils.ts',
      ].forEach(assertFile)
    },
  },
  {
    name: 'package scripts exist',
    run: () => {
      const scripts = packageJson().scripts ?? {}
      assert(scripts.test?.includes('tsx scripts/test-hardening.ts'), 'package.json scripts.test must run tsx scripts/test-hardening.ts')
      assert(scripts.test?.includes('tsx scripts/test-agent-api-token.ts'), 'package.json scripts.test must run tsx scripts/test-agent-api-token.ts')
      ;['data:health', 'backup:create', 'backup:restore'].forEach((scriptName) => {
        assert(typeof scripts[scriptName] === 'string' && scripts[scriptName].length > 0, `Missing package script: ${scriptName}`)
      })
    },
  },
  {
    name: 'dangerous backup interfaces require admin',
    run: () => {
      ;['app/api/backups/route.ts', 'app/api/backups/restore/route.ts'].forEach((relativePath) => {
        const source = read(relativePath)
        assertIncludes(source, 'requireAdmin', `${relativePath} must import or call requireAdmin`)
        assert(/await\s+requireAdmin\(\)/.test(source), `${relativePath} must await requireAdmin() before doing backup work`)
      })
    },
  },
  {
    name: 'user interfaces include last-admin protection text',
    run: () => {
      const source = `${read('app/api/users/route.ts')}\n${read('app/api/users/[id]/route.ts')}`
      assert(
        source.includes('最后管理员') ||
          source.includes('最后一个管理员') ||
          source.includes('最后一个启用管理员') ||
          source.includes('last admin') ||
          source.includes('last administrator'),
        'User routes must include visible protection text for the last administrator'
      )
    },
  },
  {
    name: 'backup utility no longer parses schema datasource',
    run: () => {
      const source = read('lib/backup-utils.ts')
      assertNotIncludes(source, 'schema.prisma', 'Backup utility should not parse prisma/schema.prisma for the database path')
      assertNotIncludes(source, 'datasource\\s+', 'Backup utility should not search for Prisma datasource blocks')
      assertNotIncludes(source, 'extractDatasourceBlock', 'Backup utility should not keep schema datasource parsing helpers')
    },
  },
  {
    name: 'systemd deploy script verifies critical endpoints and services',
    run: () => {
      const source = read('scripts/deploy-systemd.sh')
      ;[
        '/login',
        '/api/auth/init',
        '/api/data-health',
        '/health',
        '/quote-compare',
        '/purchase-board',
        'git -C "$LOCAL_ROOT" archive --format=tar HEAD',
        'Refusing to deploy tracked sensitive or local data file',
        'prisma/dev.db',
        'prisma generate',
        'prisma migrate deploy',
        'cp -R .next/static .next/standalone/.next/static',
        'SESSION_PASSWORD',
        'ensure_runtime_database_link',
        'ln -sfn "$REMOTE_DB_PATH" "$REMOTE_APP_DIR/.next/standalone/prisma/dev.db"',
        'write_systemd_helper_scripts',
        'migrate-workship.sh',
        'run-workship.sh',
        'export HOSTNAME="127.0.0.1"',
        'chmod +x "$REMOTE_APP_DIR/migrate-workship.sh" "$REMOTE_APP_DIR/run-workship.sh"',
        'OK runtime database links',
        'OK _next/static',
        'SUDO_PASSWORD',
        'run_sudo systemctl restart "$APP_SERVICE"',
        'systemctl is-active --quiet "$APP_SERVICE"',
        'systemctl is-active --quiet "$WEB_SERVICE"',
        'systemctl is-active --quiet "$LICENSE_SERVICE"',
      ].forEach((needle) => assertIncludes(source, needle, `deploy-systemd.sh must contain: ${needle}`))
    },
  },
]

for (const check of checks) {
  try {
    check.run()
    console.log(`ok - ${check.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${check.name}: ${message}`)
    console.error(`not ok - ${check.name}`)
    console.error(`  ${message}`)
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} hardening check(s) failed.`)
  process.exit(1)
}

console.log('\nAll hardening checks passed.')
