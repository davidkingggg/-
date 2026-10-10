/**
 * CSV 解析与校验工具库
 * 支持严格事务模式：先校验全部行，再统一写入
 */

export const CSV_BOM = '\uFEFF'

export type CSVValue = string | number | boolean | null | undefined
export type CSVRow = string[] & { rowNumber?: number }

// ─── 布尔值解析 ───────────────────────────────────────────────
const BOOLEAN_TRUE = new Set(['是', 'true', 'yes', '1'])
const BOOLEAN_FALSE = new Set(['否', 'false', 'no', '0'])

export function parseBoolean(value: string | undefined | null): { ok: true; value: boolean } | { ok: false; error: string } {
  if (value === undefined || value === null || value.trim() === '') {
    return { ok: false, error: '布尔值不能为空' }
  }
  const v = value.trim().toLowerCase()
  if (BOOLEAN_TRUE.has(v)) return { ok: true, value: true }
  if (BOOLEAN_FALSE.has(v)) return { ok: true, value: false }
  return { ok: false, error: `布尔值格式错误「${value}」，只接受：是/否、true/false、yes/no、1/0` }
}

export function parseBooleanOptional(value: string | undefined | null): { ok: true; value: boolean | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value.trim() === '') {
    return { ok: true, value: null }
  }
  const v = value.trim().toLowerCase()
  if (BOOLEAN_TRUE.has(v)) return { ok: true, value: true }
  if (BOOLEAN_FALSE.has(v)) return { ok: true, value: false }
  return { ok: false, error: `布尔值格式错误「${value}」，只接受：是/否、true/false、yes/no、1/0` }
}

// ─── 税率解析 ───────────────────────────────────────────────
export function parseTaxRate(value: string | undefined | null): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value.trim() === '') {
    return { ok: true, value: null }
  }
  let v = value.trim()
  // 去掉尾部 % 号
  const hasPercent = v.endsWith('%')
  if (hasPercent) v = v.slice(0, -1).trim()

  const num = Number(v)
  if (isNaN(num)) {
    return { ok: false, error: `税率格式错误「${value}」，无法解析为数字` }
  }
  if (num < 0 || num > 100) {
    return { ok: false, error: `税率「${value}」超出范围，必须在 0-100 之间` }
  }
  // 如果有 % 号，或值大于 1（按百分数处理）
  if (!hasPercent && num === 1) {
    return { ok: false, error: '税率 1 语义不明确，请使用 100% 或 0.01' }
  }
  if (hasPercent || num > 1) {
    return { ok: true, value: num / 100 }
  }
  // 值在 0~1 之间（含边界），直接作为小数
  return { ok: true, value: num }
}

// ─── 日期解析 ───────────────────────────────────────────────
export function parseDate(value: string | undefined | null): { ok: true; value: Date | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value.trim() === '') {
    return { ok: true, value: null }
  }
  const v = value.trim()
  // 支持 YYYY-MM-DD、YYYY/MM/DD 和常见 Excel/美式 M/D/YYYY
  const ymdMatch = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  const mdyMatch = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const year = ymdMatch?.[1] ?? mdyMatch?.[3]
  const month = ymdMatch?.[2] ?? mdyMatch?.[1]
  const day = ymdMatch?.[3] ?? mdyMatch?.[2]
  if (!year || !month || !day) {
    return { ok: false, error: `日期格式错误「${value}」，请使用 YYYY-MM-DD 格式` }
  }
  const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`)
  if (isNaN(date.getTime())) {
    return { ok: false, error: `日期「${value}」无效` }
  }
  return { ok: true, value: date }
}

export function parseDateRequired(value: string | undefined | null): { ok: true; value: Date } | { ok: false; error: string } {
  if (value === undefined || value === null || value.trim() === '') {
    return { ok: false, error: '日期不能为空' }
  }
  const result = parseDate(value)
  if (!result.ok) return result
  if (!result.value) return { ok: false, error: '日期不能为空' }
  return { ok: true, value: result.value }
}

// ─── 数值解析 ───────────────────────────────────────────────
export function parseDecimal(value: string | undefined | null): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value.trim() === '') {
    return { ok: true, value: null }
  }
  const num = Number(value.trim())
  if (isNaN(num)) {
    return { ok: false, error: `数字格式错误「${value}」` }
  }
  return { ok: true, value: num }
}

export function parseInt(value: string | undefined | null): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value.trim() === '') {
    return { ok: true, value: null }
  }
  const num = Number(value.trim())
  if (isNaN(num) || !Number.isInteger(num)) {
    return { ok: false, error: `整数格式错误「${value}」` }
  }
  return { ok: true, value: num }
}

// ─── 文件路径解析 ────────────────────────────────────────────
export function parseFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

export function parseFileType(filePath: string): string {
  const name = parseFileName(filePath)
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return name.slice(dotIndex + 1).toLowerCase()
}

// ─── CSV 解析 ────────────────────────────────────────────────
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSV(text: string): { headers: CSVRow; rows: CSVRow[] } {
  const normalizedText = detectAndFixEncoding(text)
  const records = parseCSVRecords(normalizeCSVText(normalizedText)).filter((row) =>
    row.some((cell) => cell.trim() !== '')
  )
  if (records.length === 0) return { headers: [] as CSVRow, rows: [] }
  const headers = records[0]
  const rows = records.slice(1)
  return { headers, rows }
}

export function getCSVRowNumber(row: string[] | CSVRow, fallback: number) {
  return typeof (row as CSVRow).rowNumber === 'number' ? (row as CSVRow).rowNumber! : fallback
}

export function normalizeCSVText(text: string) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function parseCSVRecords(text: string): CSVRow[] {
  const records: CSVRow[] = []
  let row: CSVRow = [] as CSVRow
  let current = ''
  let inQuotes = false
  let lineNumber = 1
  let rowStartLine = 1

  const pushRow = () => {
    row.push(current.trim())
    row.rowNumber = rowStartLine
    records.push(row)
    row = [] as CSVRow
    current = ''
    rowStartLine = lineNumber + 1
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
        if (char === '\n') lineNumber++
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(current.trim())
      current = ''
    } else if (char === '\n') {
      pushRow()
      lineNumber++
    } else {
      current += char
    }
  }

  if (current !== '' || row.length > 0) {
    row.push(current.trim())
    row.rowNumber = rowStartLine
    records.push(row)
  }

  return records
}

/**
 * \u68C0\u6D4B\u5E76\u4FEE\u590D GBK/GB2312 \u7F16\u7801\u5BFC\u81F4\u7684\u4E71\u7801\u95EE\u9898
 * \u5F53\u6587\u672C\u4E2D\u5305\u542B\u5927\u91CF\u65E0\u6CD5\u8BC6\u522B\u7684 Unicode \u5B57\u7B26\u65F6\uFF0C\u53EF\u80FD\u662F GBK \u7F16\u7801\u88AB\u9519\u8BEF\u89E3\u7801
 */
function detectAndFixEncoding(text: string): string {
  // \u5982\u679C\u6587\u672C\u5DF2\u7ECF\u5305\u542B\u6B63\u5E38\u4E2D\u6587\u5B57\u7B26\uFF0C\u65E0\u9700\u5904\u7406
  const chineseChars = (text.match(/[\u4E00-\u9FA5]/g) ?? [])
  if (chineseChars.length > 10) {
    return text
  }

  // \u5982\u679C\u6587\u672C\u5305\u542B\u66FF\u6362\u5B57\u7B26(U+FFFD)\uFF0C\u8BF4\u660E\u662F\u7F16\u7801\u95EE\u9898
  const hasReplacementChars = text.includes('\uFFFD')

  // \u68C0\u6D4B GBK \u5B57\u8282\u6A21\u5F0F\uFF08\u5F53 GBK \u88AB\u9519\u8BEF\u5730\u4EE5 Latin-1 \u89E3\u7801\u65F6\u7684\u7279\u5F81\uFF09
  const hasHighBytes = /[\u00C0-\u00FF]{3,}/.test(text)
  const hasGBKBytePattern = text.length > 0 && /[\u0081-\u00FE][@-\u00FE]/.test(text)

  if (!hasReplacementChars && !hasHighBytes && !hasGBKBytePattern) {
    return text
  }

  // \u5C1D\u8BD5\u4F7F\u7528 TextDecoder \u8FDB\u884C GBK \u89E3\u7801
  if (typeof TextDecoder !== 'undefined') {
    try {
      const decoder = new TextDecoder('gbk')
      const bytes = text.includes('\uFFFD')
        ? recoverBytesFromMojibake(text)
        : new TextEncoder().encode(text)
      const decoded = decoder.decode(bytes)
      const decodedChinese = (decoded.match(/[\u4E00-\u9FA5]/g) ?? [])
      if (decodedChinese.length > chineseChars.length) {
        return decoded
      }
    } catch {
      // \u89E3\u7801\u5931\u8D25\uFF0C\u8FD4\u56DE\u539F\u6587
    }
  }

  return text
}

function recoverBytesFromMojibake(text: string): Uint8Array {
  const bytes: number[] = []
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code === 0xfffd) continue
    if (code <= 0xff) bytes.push(code)
  }
  return new Uint8Array(bytes)
}

// ─── 行错误类型 ────────────────────────────────────────────
export interface RowError {
  row: number        // 行号（从 2 开始，1 是表头）
  field: string      // 字段名
  value?: string     // 原始值
  reason?: string    // 中文错误原因
  suggestion?: string // 修改建议
  message?: string   // 兼容旧前端展示
}

// ─── CSV 导出 ─────────────────────────────────────────────
export function escapeCSV(value: CSVValue): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // OWASP CSV injection: neutralize formula trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCSVRow(values: CSVValue[]): string {
  return values.map(escapeCSV).join(',')
}

export function buildCSVContent(rows: CSVValue[][], options: { trailingNewline?: boolean } = {}) {
  const content = rows.map((row) => toCSVRow(row)).join('\n')
  return `${CSV_BOM}${content}${options.trailingNewline === false ? '' : '\n'}`
}

export function createCSVResponse(rows: CSVValue[][], fileName: string) {
  return new Response(buildCSVContent(rows), {
    headers: createCSVHeaders(fileName),
  })
}

export function createCSVHeaders(fileName: string) {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  }
}

export function formatCSVDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatCSVDateTime(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

export function formatCSVBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return ''
  return value ? '是' : '否'
}

export function formatCSVNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(6)))
}

export function formatCSVPercent(value: unknown) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return num <= 1 ? `${Number((num * 100).toFixed(4))}%` : `${Number(num.toFixed(4))}%`
}

export function buildErrorReportRows(errors: RowError[]): CSVValue[][] {
  return [
    ['行号', '字段', '原始值', '错误原因', '修改建议'],
    ...errors.map((error) => [
      error.row,
      error.field,
      error.value || '',
      error.reason || error.message || '',
      error.suggestion || '',
    ]),
  ]
}
