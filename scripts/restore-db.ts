import { CONFIRM_RESTORE_TEXT, restoreBackup } from '../lib/backup-utils'

function getArg(name: string) {
  const prefix = `--${name}=`
  const arg = process.argv.find((item) => item.startsWith(prefix))
  return arg?.slice(prefix.length)
}

async function main() {
  const fileName = getArg('file') ?? process.argv[2]
  const confirmText = getArg('confirm') ?? process.argv[3]

  if (!fileName) {
    throw new Error('请提供要恢复的备份文件名，例如：tsx scripts/restore-db.ts backup-20260520-090000-000.sqlite --confirm=确认恢复')
  }

  if (confirmText !== CONFIRM_RESTORE_TEXT) {
    throw new Error('请通过 --confirm=确认恢复 确认恢复操作。')
  }

  const result = await restoreBackup(fileName, confirmText)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
