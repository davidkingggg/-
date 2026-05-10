import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'

const successQuoteNumber = 'REG-8D3-SUCCESS-001'

type DbCounts = {
  quoteSheets: number
  quoteItems: number
  attachments: number
}

type ImportErrorRow = {
  row?: unknown
  field?: unknown
  value?: unknown
  reason?: unknown
  suggestion?: unknown
  message?: unknown
}

type ImportResult = {
  success?: boolean
  errors?: ImportErrorRow[]
  sheetsCreated?: number
  itemsCreated?: number
  attachmentsCreated?: number
}

function readSample(csvFileName: string) {
  return fs.readFileSync(path.join(process.cwd(), 'scratch', csvFileName), 'utf-8')
}

async function countDbState(): Promise<DbCounts> {
  const [quoteSheets, quoteItems, attachments] = await Promise.all([
    prisma.quoteSheet.count(),
    prisma.quoteItem.count(),
    prisma.attachment.count(),
  ])
  return { quoteSheets, quoteItems, attachments }
}

function assertCountsUnchanged(before: DbCounts, after: DbCounts, label: string) {
  const changed = Object.entries(before).filter(([key, value]) => after[key as keyof DbCounts] !== value)
  if (changed.length > 0) {
    throw new Error(`${label} expected no partial writes, but counts changed: ${JSON.stringify({ before, after })}`)
  }
}

function assertErrorShape(result: ImportResult, label: string) {
  if (result?.success !== false || !Array.isArray(result.errors) || result.errors.length === 0) {
    throw new Error(`${label} expected structured import errors`)
  }

  const missingFields = result.errors.filter((error) =>
    typeof error.row !== 'number' ||
    typeof error.field !== 'string' ||
    typeof (error.value ?? '') !== 'string' ||
    typeof (error.reason ?? error.message ?? '') !== 'string' ||
    typeof (error.suggestion ?? '') !== 'string',
  )

  if (missingFields.length > 0) {
    throw new Error(`${label} returned malformed error rows: ${JSON.stringify(missingFields, null, 2)}`)
  }
}

async function postImport(csvFileName: string, label: string) {
  const csvText = readSample(csvFileName)
  console.log(`\n--- ${label} (${csvFileName}) ---`)

  const response = await fetch(`${baseUrl}/api/quotes/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvText }),
  })

  const result = await response.json() as ImportResult
  console.log('Status:', response.status)
  console.log('Result:', JSON.stringify(result, null, 2))
  return { response, result }
}

async function expectFailure(csvFileName: string, label: string) {
  const before = await countDbState()
  const { response, result } = await postImport(csvFileName, label)
  const after = await countDbState()

  if (response.status < 400 || result?.success !== false) {
    throw new Error(`${label} expected failed import`)
  }
  assertErrorShape(result, label)
  assertCountsUnchanged(before, after, label)
  console.log(`${label}: verified whole-file failure with no QuoteSheet, QuoteItem, or Attachment writes.`)
}

async function expectSuccess() {
  const existing = await prisma.quoteSheet.findFirst({ where: { quoteNumber: successQuoteNumber } })
  if (existing) {
    throw new Error(
      `Success sample uses fixed quoteNumber ${successQuoteNumber}. Run npm run prisma:seed or restore a clean database before repeating this sample.`,
    )
  }

  const { response, result } = await postImport('import_quote_success_regression.csv', 'SUCCESS regression sample')
  if (!response.ok || result?.success !== true) {
    throw new Error('Success sample expected successful import')
  }

  if (result.sheetsCreated !== 2 || result.itemsCreated !== 3 || result.attachmentsCreated !== 1) {
    throw new Error(`Unexpected success counts: ${JSON.stringify(result)}`)
  }

  const [sheet, importedItems, attachmentCount] = await Promise.all([
    prisma.quoteSheet.findUnique({ where: { quoteNumber: successQuoteNumber } }),
    prisma.quoteItem.count({ where: { compareKey: { startsWith: '8D3-' } } }),
    prisma.attachment.count({ where: { relatedType: 'QuoteSheet', relatedId: { not: '' }, notes: 'CSV导入' } }),
  ])

  if (!sheet || importedItems < 3 || attachmentCount < 1) {
    throw new Error('Success sample did not create the expected QuoteSheet, QuoteItem, and Attachment records')
  }

  console.log('SUCCESS regression sample: wrote 2 QuoteSheet records, 3 QuoteItem records, and 1 Attachment record.')
}

async function run() {
  console.log(`CSV regression API base URL: ${baseUrl}`)
  console.log('Run npm run prisma:seed before the success sample. It writes to the local development database.')
  console.log('To return to a clean state after running it, rerun npm run prisma:seed or restore a database backup.')

  await expectFailure('import_quote_fail_validation_regression.csv', 'FAIL validation regression sample')
  await expectFailure('import_quote_fail_reference_regression.csv', 'FAIL reference/conflict regression sample')
  await expectSuccess()
}

run()
  .catch((error) => {
    console.error('CSV regression script failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
