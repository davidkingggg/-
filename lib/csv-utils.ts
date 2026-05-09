/**
 * CSV 解析与校验工具库
 * 支持严格事务模式：先校验全部行，再统一写入
 */

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
  // 支持 YYYY-MM-DD 和 YYYY/MM/DD
  const match = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (!match) {
    return { ok: false, error: `日期格式错误「${value}」，请使用 YYYY-MM-DD 格式` }
  }
  const date = new Date(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}T00:00:00.000Z`)
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

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(line => parseCSVLine(line))
  return { headers, rows }
}

// ─── 行错误类型 ────────────────────────────────────────────
export interface RowError {
  row: number        // 行号（从 2 开始，1 是表头）
  field: string      // 字段名
  message: string    // 中文错误原因
}

// ─── CSV 导出 ─────────────────────────────────────────────
export function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCSVRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(escapeCSV).join(',')
}
