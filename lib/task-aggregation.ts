import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  isBossDecisionTask,
  isOpenTask,
  isOverdue,
  isSalesSupportTask,
  isThisWeekDue,
  type TaskPriority,
  type TaskScope,
  type TaskSource,
} from '@/lib/task-status-utils'

export interface TaskItem {
  id: string
  source: TaskSource
  sourceLabel: string
  title: string
  supplierName?: string
  categoryName?: string
  ownerName?: string
  priority?: string
  dueDate?: string
  status: string
  currentStage?: string
  nextAction?: string
  currentProblem?: string
  isOverdue: boolean
  isThisWeek: boolean
  needBossDecision: boolean
  needSalesSupport: boolean
  href: string
}

export interface TaskResponse {
  meta: {
    personBound: boolean
  }
  summary: {
    weekCount: number
    overdueCount: number
    bossDecisionCount: number
    salesSupportCount: number
    adminCount: number
  }
  sections: {
    week: TaskItem[]
    overdue: TaskItem[]
    bossDecision: TaskItem[]
    salesSupport: TaskItem[]
    admin: TaskItem[]
  }
}

export type TaskQueryFilters = {
  source?: TaskSource
  scope?: TaskScope
  priority?: TaskPriority
  categoryId?: string
  ownerId?: string
  status?: string
  from?: Date
  to?: Date
}

const SOURCES: TaskSource[] = ['development', 'purchase', 'admin']
const SCOPES: TaskScope[] = ['week', 'overdue', 'bossDecision', 'salesSupport', 'admin']
const PRIORITIES: TaskPriority[] = ['高', '中', '低']

type DevelopmentProcess = Prisma.SupplierDevelopmentProcessGetPayload<{
  include: {
    supplier: { select: { name: true } }
    category: { select: { name: true } }
    owner: { select: { name: true } }
  }
}>

type PurchaseProcess = Prisma.PurchaseExecutionProcessGetPayload<{
  include: {
    supplier: { select: { name: true } }
    category: { select: { name: true } }
    owner: { select: { name: true } }
  }
}>

type AdminTask = Prisma.AdminTaskGetPayload<{
  include: {
    ownerPerson: { select: { name: true } }
  }
}>

export function parseTaskDateParam(value: string | null, label: string) {
  if (!value) return undefined

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label}必须是有效日期`)
  }

  return date
}

export function parseTaskFilters(request: Request): TaskQueryFilters {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const scope = searchParams.get('scope')
  const priority = searchParams.get('priority')

  if (source && !SOURCES.includes(source as TaskSource)) {
    throw new Error('来源类型参数无效')
  }
  if (scope && !SCOPES.includes(scope as TaskScope)) {
    throw new Error('分区参数无效')
  }
  if (priority && !PRIORITIES.includes(priority as TaskPriority)) {
    throw new Error('优先级只能是高、中、低')
  }

  return {
    source: source ? (source as TaskSource) : undefined,
    scope: scope ? (scope as TaskScope) : undefined,
    priority: priority ? (priority as TaskPriority) : undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    ownerId: searchParams.get('ownerId') || undefined,
    status: searchParams.get('status') || undefined,
    from: parseTaskDateParam(searchParams.get('from'), '开始日期'),
    to: parseTaskDateParam(searchParams.get('to'), '结束日期'),
  }
}

function inDateRange(dueDate: Date | null, filters: TaskQueryFilters) {
  if (!filters.from && !filters.to) return true
  if (!dueDate) return false

  if (filters.from && dueDate < filters.from) return false
  if (filters.to) {
    const toEnd = new Date(filters.to)
    toEnd.setHours(23, 59, 59, 999)
    if (dueDate > toEnd) return false
  }

  return true
}

function shouldIncludeItem(item: TaskItem, filters: TaskQueryFilters) {
  if (filters.scope === 'week') return item.isThisWeek
  if (filters.scope === 'overdue') return item.isOverdue
  if (filters.scope === 'bossDecision') return item.needBossDecision
  if (filters.scope === 'salesSupport') return item.needSalesSupport
  if (filters.scope === 'admin') return item.source === 'admin'
  return true
}

export function sortTasks(items: TaskItem[]) {
  return [...items].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    if (aTime !== bTime) return aTime - bTime
    return a.title.localeCompare(b.title, 'zh-CN')
  })
}

function mapDevelopmentTask(item: DevelopmentProcess): TaskItem {
  return {
    id: item.id,
    source: 'development',
    sourceLabel: '开发流程',
    title: `${item.supplier.name}开发跟进`,
    supplierName: item.supplier.name,
    categoryName: item.category.name,
    ownerName: item.owner.name,
    priority: item.priority || undefined,
    dueDate: item.dueDate?.toISOString(),
    status: item.status,
    currentStage: item.currentStage,
    nextAction: item.nextAction || undefined,
    currentProblem: item.currentProblem || undefined,
    isOverdue: isOverdue(item.dueDate),
    isThisWeek: isThisWeekDue(item.dueDate),
    needBossDecision: isBossDecisionTask(item),
    needSalesSupport: isSalesSupportTask({ ...item, source: 'development' }),
    href: '/development-board',
  }
}

function mapPurchaseTask(item: PurchaseProcess): TaskItem {
  return {
    id: item.id,
    source: 'purchase',
    sourceLabel: '采购流程',
    title: item.title,
    supplierName: item.supplier.name,
    categoryName: item.category.name,
    ownerName: item.owner.name,
    priority: item.priority || undefined,
    dueDate: item.dueDate?.toISOString(),
    status: item.status,
    currentStage: item.currentStage,
    nextAction: item.nextAction || undefined,
    currentProblem: item.currentProblem || undefined,
    isOverdue: isOverdue(item.dueDate),
    isThisWeek: isThisWeekDue(item.dueDate),
    needBossDecision: isBossDecisionTask(item),
    needSalesSupport: false,
    href: '/purchase-board',
  }
}

function mapAdminTask(item: AdminTask): TaskItem {
  return {
    id: item.id,
    source: 'admin',
    sourceLabel: '我的行政',
    title: item.title,
    ownerName: item.ownerPerson?.name || undefined,
    priority: item.priority || undefined,
    dueDate: item.dueDate?.toISOString(),
    status: item.status,
    currentStage: item.type,
    nextAction: item.notes || undefined,
    isOverdue: isOverdue(item.dueDate),
    isThisWeek: isThisWeekDue(item.dueDate),
    needBossDecision: false,
    needSalesSupport: false,
    href: '/admin-tasks',
  }
}

export async function buildTaskAggregation(
  filters: TaskQueryFilters = {},
  currentPersonId?: string | null,
): Promise<TaskResponse> {
  const baseWhere = {
    isArchived: false,
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }

  const [developmentProcesses, purchaseProcesses, adminTasks] = await Promise.all([
    filters.source && filters.source !== 'development'
      ? Promise.resolve([])
      : prisma.supplierDevelopmentProcess.findMany({
          where: {
            ...baseWhere,
            ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
          },
          include: {
            supplier: { select: { name: true } },
            category: { select: { name: true } },
            owner: { select: { name: true } },
          },
        }),
    filters.source && filters.source !== 'purchase'
      ? Promise.resolve([])
      : prisma.purchaseExecutionProcess.findMany({
          where: {
            ...baseWhere,
            ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
          },
          include: {
            supplier: { select: { name: true } },
            category: { select: { name: true } },
            owner: { select: { name: true } },
          },
        }),
    filters.source && filters.source !== 'admin'
      ? Promise.resolve([])
      : currentPersonId
        ? prisma.adminTask.findMany({
            where: {
              isArchived: false,
              ownerPersonId: currentPersonId,
              ...(filters.priority ? { priority: filters.priority } : {}),
              ...(filters.status ? { status: filters.status } : {}),
            },
            include: {
              ownerPerson: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
  ])

  const developmentItems = developmentProcesses
    .filter((item) => (filters.status ? true : isOpenTask({ ...item, source: 'development' })))
    .filter((item) => inDateRange(item.dueDate, filters))
    .map(mapDevelopmentTask)

  const purchaseItems = purchaseProcesses
    .filter((item) => (filters.status ? true : isOpenTask({ ...item, source: 'purchase' })))
    .filter((item) => inDateRange(item.dueDate, filters))
    .map(mapPurchaseTask)

  const adminItems = adminTasks
    .filter((item) => (filters.status ? true : isOpenTask({ ...item, source: 'admin' })))
    .filter((item) => inDateRange(item.dueDate, filters))
    .map(mapAdminTask)

  const allItems = [...developmentItems, ...purchaseItems, ...adminItems].filter((item) =>
    shouldIncludeItem(item, filters),
  )

  const sections = {
    week: sortTasks(allItems.filter((item) => item.isThisWeek)),
    overdue: sortTasks(allItems.filter((item) => item.isOverdue)),
    bossDecision: sortTasks(allItems.filter((item) => item.needBossDecision)),
    salesSupport: sortTasks(allItems.filter((item) => item.needSalesSupport)),
    admin: sortTasks(allItems.filter((item) => item.source === 'admin')),
  }

  return {
    meta: {
      personBound: Boolean(currentPersonId),
    },
    summary: {
      weekCount: sections.week.length,
      overdueCount: sections.overdue.length,
      bossDecisionCount: sections.bossDecision.length,
      salesSupportCount: sections.salesSupport.length,
      adminCount: sections.admin.length,
    },
    sections,
  }
}
