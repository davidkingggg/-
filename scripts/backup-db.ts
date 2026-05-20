import { createBackup } from '../lib/backup-utils'

function readPrefixArg() {
  const prefixArg = process.argv.find((arg) => arg.startsWith('--prefix='))
  return prefixArg ? prefixArg.slice('--prefix='.length) : undefined
}

async function main() {
  const backup = await createBackup(readPrefixArg())
  console.log(JSON.stringify(backup, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
