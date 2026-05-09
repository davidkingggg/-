import { NextResponse } from 'next/server'
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

export const dynamic = 'force-dynamic'

const SOURCES: TaskSource[] = ['development', 'purchase', 'admin']
const SCOPES: TaskScope[] = ['week', 'overdue', 'bossDecision', 'salesSupport', 'admin']
const PRIORITIES: TaskPriority[] = ['高', '中', '低']

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

type QueryFilters = {
  source?: TaskSource
  scope?: TaskScope
  priority?: TaskPriority
  categoryId?: string
  ownerId?: string
  status?: string
  from?: Date
  to?: Date
}

function parseDateParam(value: string | null, label: string) {
  if (!value) return undefined

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label}必须是有效日期`)
  }

  return date
}

function parseFilters(request: Request): QueryFilters {
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
    from: parseDateParam(searchParams.get('from'), '开始日期'),
    to: parseDateParam(searchParams.get('to'), '结束日期'),
  }
}

function inDateRange(dueDate: Date | null, filters: QueryFilters) {
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

function shouldIncludeItem(item: TaskItem, filters: QueryFilters) {
  if (filters.scope === 'week') return item.isThisWeek
  if (filters.scope === 'overdue') return item.isOverdue
  if (filters.scope === 'bossDecision') return item.needBossDecision
  if (filters.scope === 'salesSupport') return item.needSalesSupport
  if (filters.scope === 'admin') return item.source === 'admin'
  return true
}

function sortTasks(items: TaskItem[]) {
  return [...items].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    if (aTime !== bTime) return aTime - bTime
    return a.title.localeCompare(b.title, 'zh-CN')
  })
}

export async function GET(request: Request) {
  try {
    const filters = parseFilters(request)
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
        : prisma.adminTask.findMany({
            where: {
              isArchived: false,
              ...(filters.priority ? { priority: filters.priority } : {}),
              ...(filters.status ? { status: filters.status } : {}),
            },
          }),
    ])

    const developmentItems: TaskItem[] = developmentProcesses
      .filter((item) => (filters.status ? true : isOpenTask({ ...item, source: 'development' })))
      .filter((item) => inDateRange(item.dueDate, filters))
      .map((item) => ({
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
      }))

    const purchaseItems: TaskItem[] = purchaseProcesses
      .filter((item) => (filters.status ? true : isOpenTask({ ...item, source: 'purchase' })))
      .filter((item) => inDateRange(item.dueDate, filters))
      .map((item) => ({
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
      }))

    const adminItems: TaskItem[] = adminTasks
      .filter((item) => (filters.status ? true : isOpenTask({ ...item, source: 'admin' })))
      .filter((item) => inDateRange(item.dueDate, filters))
      .map((item) => ({
        id: item.id,
        source: 'admin',
        sourceLabel: '行政事项',
        title: item.title,
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
      }))

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

    return NextResponse.json({
      summary: {
        weekCount: sections.week.length,
        overdueCount: sections.overdue.length,
        bossDecisionCount: sections.bossDecision.length,
        salesSupportCount: sections.salesSupport.length,
        adminCount: sections.admin.length,
      },
      sections,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取待办数据失败'
    const status = message.includes('无效') || message.includes('必须') || message.includes('只能') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
