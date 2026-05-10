import { constants } from 'fs'
import { access, copyFile, mkdir, readdir, readFile, stat } from 'fs/promises'
import path from 'path'

export type BackupType = 'normal' | 'before-restore'

export interface DatabaseStatus {
  exists: boolean
  size: number | null
  updatedAt: string | null
  journalFiles: string[]
  warnings: string[]
}

export interface BackupItem {
  fileName: string
  type: BackupType
  size: number
  createdAt: string
  updatedAt: string
}

export const CONFIRM_RESTORE_TEXT = '确认恢复'
export const SQLITE_JOURNAL_WARNING =
  '检测到 SQLite 临时/日志文件，建议关闭开发服务后再备份或恢复，以获得更稳的一致性快照。'

const PRISMA_SCHEMA_PATH = path.join(/* turbopackIgnore: true */ process.cwd(), 'prisma', 'schema.prisma')
const BACKUP_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'backups')
const NORMAL_PREFIX = 'boiler-procurement-db-'
const BEFORE_RESTORE_PREFIX = 'before-restore-'
const BACKUP_NAME_PATTERN =
  /^(boiler-procurement-db|before-restore)-\d{8}-\d{6}-\d{3}(?:-\d+)?\.sqlite$/

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

async function pathExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function createUniqueBackupFileName(prefix: string) {
  await ensureBackupDir()
  let suffix = ''
  for (let index = 0; index < 100; index += 1) {
    const fileName = `${prefix}${formatLocalTimestamp()}${suffix}.sqlite`
    const targetPath = path.join(BACKUP_DIR, fileName)
    if (!(await pathExists(targetPath))) return { fileName, targetPath }
    suffix = `-${index + 1}`
  }
  assertError('备份文件名生成失败，请稍后重试。')
}

function extractDatasourceBlock(schema: string) {
  const match = schema.match(/datasource\s+\w+\s*\{([\s\S]*?)\}/)
  return match?.[1] ?? null
}

export async function resolveSqliteDatabasePath() {
  const schema = await readFile(PRISMA_SCHEMA_PATH, 'utf8')
  const datasource = extractDatasourceBlock(schema)
  if (!datasource) assertError('未找到 Prisma datasource 配置。')

  if (!/provider\s*=\s*"sqlite"/.test(datasource)) {
    assertError('当前仅支持 SQLite 本地数据库备份。')
  }

  if (/url\s*=\s*env\s*\(/.test(datasource)) {
    assertError('当前仅支持 schema.prisma 中显式 file: SQLite 路径，暂不支持 env 数据库地址解析。')
  }

  const urlMatch = datasource.match(/url\s*=\s*"([^"]+)"/)
  const url = urlMatch?.[1]
  if (!url) assertError('未找到 Prisma SQLite 数据库路径。')
  if (!url.startsWith('file:')) assertError('当前仅支持 schema.prisma 中显式 file: SQLite 路径。')

  const sqlitePath = url.slice('file:'.length)
  if (!sqlitePath || sqlitePath.startsWith('http://') || sqlitePath.startsWith('https://')) {
    assertError('当前仅支持本地 SQLite 文件路径。')
  }

  if (path.isAbsolute(sqlitePath)) return path.normalize(sqlitePath)
  return path.resolve(/* turbopackIgnore: true */ path.dirname(PRISMA_SCHEMA_PATH), sqlitePath)
}

export async function getJournalFiles(databasePath: string) {
  const candidates = [`${databasePath}-wal`, `${databasePath}-shm`, `${databasePath}-journal`]
  const found = await Promise.all(
    candidates.map(async (filePath) => ((await pathExists(filePath)) ? path.basename(filePath) : null))
  )
  return found.filter((fileName): fileName is string => Boolean(fileName))
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const databasePath = await resolveSqliteDatabasePath()
  const exists = await pathExists(databasePath)
  const journalFiles = await getJournalFiles(databasePath)
  const warnings = journalFiles.length > 0 ? [SQLITE_JOURNAL_WARNING] : []

  if (!exists) {
    return { exists, size: null, updatedAt: null, journalFiles, warnings }
  }

  const databaseStat = await stat(databasePath)
  return {
    exists,
    size: databaseStat.size,
    updatedAt: databaseStat.mtime.toISOString(),
    journalFiles,
    warnings,
  }
}

export async function ensureBackupDir() {
  await mkdir(BACKUP_DIR, { recursive: true })
}

export function getBackupType(fileName: string): BackupType | null {
  if (fileName.startsWith(NORMAL_PREFIX)) return 'normal'
  if (fileName.startsWith(BEFORE_RESTORE_PREFIX)) return 'before-restore'
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
  const targetPath = path.resolve(/* turbopackIgnore: true */ BACKUP_DIR, fileName)
  const relativePath = path.relative(BACKUP_DIR, targetPath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    assertError('备份文件路径不在允许的备份目录内。')
  }
  return targetPath
}

export async function listBackups(): Promise<BackupItem[]> {
  await ensureBackupDir()
  const entries = await readdir(BACKUP_DIR, { withFileTypes: true })
  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const fileName = entry.name
        if (!BACKUP_NAME_PATTERN.test(fileName)) return null
        const type = getBackupType(fileName)
        if (!type) return null
        const fileStat = await stat(path.join(BACKUP_DIR, fileName))
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
  const [database, backups] = await Promise.all([getDatabaseStatus(), listBackups()])
  return { database, backups }
}

export async function createBackup(prefix = NORMAL_PREFIX) {
  const databasePath = await resolveSqliteDatabasePath()
  if (!(await pathExists(databasePath))) assertError('当前数据库文件不存在，无法创建备份。')

  const database = await getDatabaseStatus()
  const { fileName, targetPath } = await createUniqueBackupFileName(prefix)
  await copyFile(databasePath, targetPath, constants.COPYFILE_EXCL)
  const backupStat = await stat(targetPath)

  return {
    message: prefix === BEFORE_RESTORE_PREFIX ? '恢复前安全备份已创建。' : '备份创建成功。',
    backup: {
      fileName,
      type: getBackupType(fileName) ?? 'normal',
      size: backupStat.size,
      createdAt: backupStat.birthtime.toISOString(),
      updatedAt: backupStat.mtime.toISOString(),
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

  const database = await getDatabaseStatus()
  const beforeRestore = await createBackup(BEFORE_RESTORE_PREFIX)
  if (beforeReplace) await beforeReplace()
  await copyFile(backupPath, databasePath)

  return {
    message: '恢复已完成，请重启本地服务并刷新系统，以确保 Prisma 连接重新加载。',
    restoredFrom: safeFileName,
    beforeRestoreBackup: beforeRestore.backup,
    warnings: database.warnings,
  }
}
