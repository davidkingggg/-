import { constants } from 'fs'
import { copyFile, mkdir, readdir, stat } from 'fs/promises'
import path from 'path'
import {
  buildDataHealthReport,
  getDatabaseStatus,
  resolveSqliteDatabasePath,
  type DataHealthReport,
} from './data-health'

export type BackupType = 'normal' | 'before-restore'

export interface BackupSummary {
  tableCounts: DataHealthReport['tableCounts']
  adminCount: number
}

export interface BackupItem {
  fileName: string
  type: BackupType
  size: number
  createdAt: string
  updatedAt: string
}

export const CONFIRM_RESTORE_TEXT = '确认恢复'

const NORMAL_PREFIX = 'backup-'
const BEFORE_RESTORE_PREFIX = 'before-restore-'
const BACKUP_NAME_PATTERN =
  /^(backup|personal-workship-v0-9-2|boiler-procurement-db|before-restore)-\d{8}-\d{6}(?:-\d{3})?(?:-\d+)?\.sqlite$/

function assertError(message: string): never {
  throw new Error(message)
}

function formatLocalTimestamp(date = new Date()) {
  const pad = (value: number, width = 2) => value.toString().padStart(width, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    '-',
    pad(date.getMilliseconds(), 3),
  ].join('')
}

function getBackupDir() {
  return path.resolve(process.env.BACKUP_DIR?.trim() || path.join(process.cwd(), 'backups'))
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function createUniqueBackupFileName(prefix: string) {
  await ensureBackupDir()
  let suffix = ''
  const backupDir = getBackupDir()
  for (let index = 0; index < 100; index += 1) {
    const fileName = `${prefix}${formatLocalTimestamp()}${suffix}.sqlite`
    const targetPath = path.join(backupDir, fileName)
    if (!(await pathExists(targetPath))) return { fileName, targetPath }
    suffix = `-${index + 1}`
  }
  assertError('备份文件名生成失败，请稍后重试。')
}

export async function ensureBackupDir() {
  await mkdir(getBackupDir(), { recursive: true })
}

export function getBackupType(fileName: string): BackupType | null {
  if (fileName.startsWith(BEFORE_RESTORE_PREFIX)) return 'before-restore'
  if (BACKUP_NAME_PATTERN.test(fileName)) return 'normal'
  return null
}

export function validateBackupFileName(fileName: unknown): string {
  if (typeof fileName !== 'string' || !fileName.trim()) {
    assertError('请选择要恢复的备份文件。')
  }

  if (
    fileName.includes('../') ||
    fileName.includes('..\\') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    path.isAbsolute(fileName)
  ) {
    assertError('备份文件名不合法，禁止使用路径。')
  }

  if (path.extname(fileName) !== '.sqlite') {
    assertError('备份文件扩展名必须为 .sqlite。')
  }

  if (!BACKUP_NAME_PATTERN.test(fileName)) {
    assertError('备份文件名不符合允许的命名规则。')
  }

  return fileName
}

export function resolveBackupPath(fileName: string) {
  const backupDir = getBackupDir()
  const targetPath = path.resolve(backupDir, fileName)
  const relativePath = path.relative(backupDir, targetPath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    assertError('备份文件路径不在允许的备份目录内。')
  }
  return targetPath
}

export async function summarizeDatabaseFile(filePath: string): Promise<BackupSummary> {
  const report = await buildDataHealthReport(filePath)
  return {
    tableCounts: report.tableCounts,
    adminCount: report.adminCount,
  }
}

export async function getDatabaseStatusFromEnv() {
  return getDatabaseStatus()
}

export async function listBackups(): Promise<BackupItem[]> {
  await ensureBackupDir()
  const backupDir = getBackupDir()
  const entries = await readdir(backupDir, { withFileTypes: true })
  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const fileName = entry.name
        if (!BACKUP_NAME_PATTERN.test(fileName)) return null
        const type = getBackupType(fileName)
        if (!type) return null
        const fileStat = await stat(path.join(backupDir, fileName))
        return {
          fileName,
          type,
          size: fileStat.size,
          createdAt: fileStat.birthtime.toISOString(),
          updatedAt: fileStat.mtime.toISOString(),
        }
      })
  )

  return backups
    .filter((item): item is BackupItem => Boolean(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getBackupsSnapshot() {
  const [database, backups] = await Promise.all([buildDataHealthReport(), listBackups()])
  return { database, backups }
}

export async function createBackup(prefix = NORMAL_PREFIX) {
  const databasePath = await resolveSqliteDatabasePath()
  if (!(await pathExists(databasePath))) assertError('当前数据库文件不存在，无法创建备份。')

  const database = await buildDataHealthReport(databasePath)
  const { fileName, targetPath } = await createUniqueBackupFileName(prefix)
  await copyFile(databasePath, targetPath, constants.COPYFILE_EXCL)
  const backupStat = await stat(targetPath)
  const summary = await summarizeDatabaseFile(targetPath)

  return {
    message: prefix === BEFORE_RESTORE_PREFIX ? '恢复前安全备份已创建。' : '备份创建成功。',
    backup: {
      fileName,
      type: getBackupType(fileName) ?? 'normal',
      size: backupStat.size,
      createdAt: backupStat.birthtime.toISOString(),
      updatedAt: backupStat.mtime.toISOString(),
      summary,
    },
    warnings: database.warnings,
  }
}

export async function restoreBackup(
  fileName: unknown,
  confirmText: unknown,
  beforeReplace?: () => Promise<void>
) {
  if (confirmText !== CONFIRM_RESTORE_TEXT) {
    assertError('请输入确认短语“确认恢复”后再执行恢复。')
  }

  const safeFileName = validateBackupFileName(fileName)
  await ensureBackupDir()
  const backupPath = resolveBackupPath(safeFileName)
  if (!(await pathExists(backupPath))) assertError('指定的备份文件不存在。')

  const databasePath = await resolveSqliteDatabasePath()
  if (!(await pathExists(databasePath))) assertError('当前数据库文件不存在，无法执行恢复。')

  const before = await buildDataHealthReport(databasePath)
  const backup = await summarizeDatabaseFile(backupPath)
  const beforeRestore = await createBackup(BEFORE_RESTORE_PREFIX)
  if (beforeReplace) await beforeReplace()
  await copyFile(backupPath, databasePath)
  const after = await buildDataHealthReport(databasePath)

  if (after.adminCount < 1) {
    assertError('恢复后的数据库没有可用管理员账号，请改用包含管理员账号的备份。')
  }

  return {
    message: '恢复已完成。请重启服务并刷新系统，确保 Prisma 连接重新加载。',
    restoredFrom: safeFileName,
    beforeRestoreBackup: beforeRestore.backup,
    before,
    backup,
    after,
    warnings: [...before.warnings, ...after.warnings],
  }
}
