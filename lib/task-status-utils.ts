export type TaskSource = 'development' | 'purchase' | 'admin'
export type TaskScope = 'week' | 'overdue' | 'bossDecision' | 'salesSupport' | 'admin'
export type TaskPriority = '高' | '中' | '低'

export interface TaskStatusLike {
  source?: TaskSource
  status: string
  isArchived?: boolean
  dueDate?: Date | string | null
  needBossDecision?: boolean | null
  needSalesSupport?: boolean | null
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function toDate(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getWeekRange(date: Date = new Date()) {
  const current = startOfDay(date)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(current)
  monday.setDate(current.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: startOfDay(monday),
    end: endOfDay(sunday),
  }
}

export function isThisWeekDue(dueDate?: Date | string | null, baseDate: Date = new Date()) {
  const due = toDate(dueDate)
  if (!due) return false

  const { start, end } = getWeekRange(baseDate)
  return due >= start && due <= end
}

export function isOverdue(dueDate?: Date | string | null, baseDate: Date = new Date()) {
  const due = toDate(dueDate)
  if (!due) return false

  return startOfDay(due) < startOfDay(baseDate)
}

export function isOpenDevelopmentStatus(status: string) {
  return !['已完成', '淘汰'].includes(status)
}

export function isOpenPurchaseStatus(status: string) {
  return !['已完成', '异常'].includes(status)
}

export function isOpenAdminStatus(status: string) {
  return status !== '已完成'
}

export function isBossDecisionTask(item: TaskStatusLike) {
  return item.needBossDecision === true
}

export function isSalesSupportTask(item: TaskStatusLike) {
  return item.source === 'development' && item.needSalesSupport === true
}

export function isOpenTask(item: TaskStatusLike) {
  if (item.isArchived) return false

  if (item.source === 'development') return isOpenDevelopmentStatus(item.status)
  if (item.source === 'purchase') return isOpenPurchaseStatus(item.status)
  if (item.source === 'admin') return isOpenAdminStatus(item.status)

  return true
}
