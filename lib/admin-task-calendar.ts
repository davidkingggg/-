export const ADMIN_RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const
export type AdminRecurrenceType = (typeof ADMIN_RECURRENCE_TYPES)[number]

type TaskCalendarDateFields = {
  taskDate: Date | null
  dueDate: Date | null
  createdAt: Date
}

export function parseDateOnly(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined
  }

  return date
}

export function parseTime(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined
}

export function validateTimeRange(startTime: string | null, endTime: string | null) {
  if (startTime && endTime && endTime <= startTime) {
    return '结束时间必须晚于开始时间'
  }
  return null
}

export function normalizeRecurrence(value: unknown): AdminRecurrenceType | undefined {
  if (value === undefined || value === null || value === '') return 'none'
  if (typeof value !== 'string') return undefined
  return ADMIN_RECURRENCE_TYPES.includes(value as AdminRecurrenceType)
    ? (value as AdminRecurrenceType)
    : undefined
}

export function startOfTodayUtcDateOnly() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

export function getTaskCalendarDate(task: TaskCalendarDateFields) {
  return task.taskDate ?? task.dueDate ?? task.createdAt
}

export function dateRangeForPeriod(period: string, anchorValue: string | null) {
  const anchor = parseDateOnly(anchorValue)
  if (!anchor) throw new Error('统计日期格式不正确')

  const start = new Date(anchor)
  const end = new Date(anchor)

  if (period === 'day') {
    end.setUTCDate(start.getUTCDate() + 1)
  } else if (period === 'week') {
    const day = start.getUTCDay() || 7
    start.setUTCDate(start.getUTCDate() - day + 1)
    end.setTime(start.getTime())
    end.setUTCDate(start.getUTCDate() + 7)
  } else if (period === 'month') {
    start.setUTCDate(1)
    end.setUTCFullYear(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
  } else if (period === 'year') {
    start.setUTCFullYear(start.getUTCFullYear(), 0, 1)
    end.setUTCFullYear(start.getUTCFullYear() + 1, 0, 1)
  } else {
    throw new Error('统计周期无效')
  }

  return { start, end }
}

export function isCompletedStatus(status: string) {
  return status === '已完成'
}
