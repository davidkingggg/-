import { constants } from 'fs'
import { access, readFile, realpath, stat } from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from './db'

export interface DatabaseStatus {
  exists: boolean
  path: string
  realPath: string | null
  size: number | null
  updatedAt: string | null
  journalFiles: string[]
  warnings: string[]
}

export interface CoreTableCounts {
  categories: number
  suppliers: number
  supplierContacts: number
  people: number
  quoteSheets: number
  quoteItems: number
  supplierScores: number
  investigationRecords: number
  supplierDevelopmentProcesses: number
  purchaseExecutionProcesses: number
  adminTasks: number
  salesMaterials: number
  users: number
  attachments: number
  riskTags: number
  supplierRiskTags: number
  systemSettings: number
}

export interface DataHealthReport extends DatabaseStatus {
  tableCounts: CoreTableCounts
  adminCount: number
}

export const SQLITE_JOURNAL_WARNING =
  '检测到 SQLite 临时/日志文件，建议关闭开发服务后再备份或恢复，以获得更稳定的一致性快照。'

const CORE_TABLES = {
  categories: 'Category',
  suppliers: 'Supplier',
  supplierContacts: 'SupplierContact',
  people: 'Person',
  quoteSheets: 'QuoteSheet',
  quoteItems: 'QuoteItem',
  supplierScores: 'SupplierScore',
  investigationRecords: 'InvestigationRecord',
  supplierDevelopmentProcesses: 'SupplierDevelopmentProcess',
  purchaseExecutionProcesses: 'PurchaseExecutionProcess',
  adminTasks: 'AdminTask',
  salesMaterials: 'SalesMaterial',
  users: 'User',
  attachments: 'Attachment',
  riskTags: 'RiskTag',
  supplierRiskTags: 'SupplierRiskTag',
  systemSettings: 'SystemSetting',
} as const satisfies Record<keyof CoreTableCounts, string>

function assertError(message: string): never {
  throw new Error(message)
}

async function pathExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function unquote(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

async function readDatabaseUrlFromEnvFiles() {
  for (const fileName of ['.env.local', '.env']) {
    const envPath = path.join(/* turbopackIgnore: true */ process.cwd(), fileName)
    try {
      const content = await readFile(envPath, 'utf8')
      const line = content
        .split(/\r?\n/)
        .map((item) => item.trim())
        .find((item) => item.startsWith('DATABASE_URL='))
      if (line) return unquote(line.slice('DATABASE_URL='.length))
    } catch {
      // Missing env files are fine; scripts can also receive DATABASE_URL from the shell.
    }
  }
  return null
}

export async function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? (await readDatabaseUrlFromEnvFiles())
  if (!databaseUrl?.trim()) {
    assertError('未设置 DATABASE_URL，无法定位 SQLite 数据库。')
  }
  return unquote(databaseUrl)
}

export async function resolveSqliteDatabasePath(databaseUrl?: string) {
  const normalizedUrl = unquote(databaseUrl ?? (await getDatabaseUrl()))
  if (!normalizedUrl.startsWith('file:')) {
    assertError('当前仅支持 DATABASE_URL=file:... 的 SQLite 本地数据库。')
  }

  const sqlitePath = normalizedUrl.slice('file:'.length)
  if (!sqlitePath || sqlitePath.startsWith('http://') || sqlitePath.startsWith('https://')) {
    assertError('当前仅支持本地 SQLite 文件路径。')
  }

  const decodedPath = decodeURIComponent(sqlitePath)
  if (path.isAbsolute(decodedPath)) return path.normalize(decodedPath)
  const cwdPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), decodedPath)
  if (await pathExists(cwdPath)) return cwdPath
  const prismaRelativePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'prisma', decodedPath)
  if (await pathExists(prismaRelativePath)) return prismaRelativePath
  return cwdPath
}

export async function getJournalFiles(databasePath: string) {
  const absolutePath = path.resolve(/* turbopackIgnore: true */ databasePath)
  const candidates = [`${absolutePath}-wal`, `${absolutePath}-shm`, `${absolutePath}-journal`]
  const found = await Promise.all(
    candidates.map(async (filePath) => ((await pathExists(filePath)) ? path.basename(filePath) : null))
  )
  return found.filter((fileName): fileName is string => Boolean(fileName))
}

export async function getDatabaseStatus(databasePath?: string): Promise<DatabaseStatus> {
  const resolvedPath = path.resolve(
    /* turbopackIgnore: true */ databasePath ?? (await resolveSqliteDatabasePath())
  )
  const exists = await pathExists(resolvedPath)
  const journalFiles = await getJournalFiles(resolvedPath)
  const warnings = journalFiles.length > 0 ? [SQLITE_JOURNAL_WARNING] : []

  if (!exists) {
    return { exists, path: resolvedPath, realPath: null, size: null, updatedAt: null, journalFiles, warnings }
  }

  const [databaseStat, databaseRealPath] = await Promise.all([stat(resolvedPath), realpath(resolvedPath)])
  return {
    exists,
    path: resolvedPath,
    realPath: databaseRealPath,
    size: databaseStat.size,
    updatedAt: databaseStat.mtime.toISOString(),
    journalFiles,
    warnings,
  }
}

async function withPrismaForDatabase<T>(databasePath: string, action: (client: PrismaClient) => Promise<T>) {
  const resolvedPath = path.resolve(/* turbopackIgnore: true */ databasePath).replace(/\\/g, '/')

  // 优先使用共享单例客户端（路径匹配时），避免每次请求创建新连接
  const sharedDbPath = (await resolveSqliteDatabasePath().catch(() => '')).replace(/\\/g, '/')
  if (sharedDbPath && resolvedPath === sharedDbPath) {
    return action(sharedPrisma)
  }

  // 路径不匹配时才创建临时客户端
  const url = `file:${resolvedPath}`
  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
  })

  try {
    return await action(client)
  } finally {
    await client.$disconnect()
  }
}

async function countTable(client: PrismaClient, tableName: string) {
  const rows = await client.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `SELECT COUNT(*) AS count FROM "${tableName}"`
  )
  return Number(rows[0]?.count ?? 0)
}

export async function countCoreTables(databasePath?: string): Promise<CoreTableCounts> {
  const resolvedPath = path.resolve(
    /* turbopackIgnore: true */ databasePath ?? (await resolveSqliteDatabasePath())
  )

  return withPrismaForDatabase(resolvedPath, async (client) => {
    const entries = await Promise.all(
      Object.entries(CORE_TABLES).map(async ([key, tableName]) => [key, await countTable(client, tableName)] as const)
    )
    return Object.fromEntries(entries) as unknown as CoreTableCounts
  })
}

export async function countAdmins(databasePath?: string) {
  const resolvedPath = path.resolve(
    /* turbopackIgnore: true */ databasePath ?? (await resolveSqliteDatabasePath())
  )

  return withPrismaForDatabase(resolvedPath, async (client) => {
    const rows = await client.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      'SELECT COUNT(*) AS count FROM "User" WHERE "isAdmin" = 1 AND "isActive" = 1'
    )
    return Number(rows[0]?.count ?? 0)
  })
}

export async function assertReadableDatabase(databasePath?: string) {
  const resolvedPath = path.resolve(
    /* turbopackIgnore: true */ databasePath ?? (await resolveSqliteDatabasePath())
  )
  await withPrismaForDatabase(resolvedPath, async (client) => {
    await client.$queryRawUnsafe('SELECT 1')
  })
}

export async function buildDataHealthReport(databasePath?: string): Promise<DataHealthReport> {
  const status = await getDatabaseStatus(databasePath)
  const warnings = [...status.warnings]

  if (!status.exists) {
    return {
      ...status,
      tableCounts: Object.fromEntries(Object.keys(CORE_TABLES).map((key) => [key, 0])) as unknown as CoreTableCounts,
      adminCount: 0,
      warnings: [...warnings, '数据库文件不存在。'],
    }
  }

  const [tableCounts, adminCount] = await Promise.all([
    countCoreTables(status.path),
    countAdmins(status.path),
  ])

  if (adminCount < 1) warnings.push('未找到可用管理员账号。')

  return {
    ...status,
    tableCounts,
    adminCount,
    warnings,
  }
}
