import { prisma } from '@/lib/db'
import { buildTaskAggregation, type TaskItem } from '@/lib/task-aggregation'
import { isOverdue, isThisWeekDue } from '@/lib/task-status-utils'

const RECOMMENDED_SUPPLIER_LEVELS = ['A优先推荐', 'B备选']
const PURCHASE_ISSUE_STATUSES = ['异常', '暂停']

export interface DashboardData {
  generatedAt: string
  summary: {
    supplierCount: number
    recommendedSupplierCount: number
    categoryCount: number
    activeCategoryCount: number
    quoteSheetCount: number
    salesMaterialCount: number
    openMainlineProcessCount: number
    weekTodoCount: number
    overdueTodoCount: number
    bossDecisionCount: number
    developmentInProgressCount: number
    purchaseInProgressCount: number
    purchaseIssueCount: number
    adminOpenCount: number
    adminOverdueCount: number
    adminTodoCount: number
  }
  todos: {
    weekItems: TaskItem[]
    overdueItems: TaskItem[]
    bossDecisionItems: TaskItem[]
  }
  mainline: {
    developmentInProgressCount: number
    purchaseInProgressCount: number
    purchaseIssueCount: number
    salesSupportCount: number
    weekCount: number
    overdueCount: number
    bossDecisionCount: number
    weekItems: TaskItem[]
    overdueItems: TaskItem[]
    bossDecisionItems: TaskItem[]
    purchaseIssueItems: TaskItem[]
  }
  admin: {
    openCount: number
    weekCount: number
    overdueCount: number
    items: TaskItem[]
  }
  personal: {
    adminCount: number
    weekCount: number
    overdueCount: number
    items: TaskItem[]
  }
}

function mapPurchaseIssueItem(item: {
  id: string
  title: string
  status: string
  currentStage: string
  priority: string | null
  dueDate: Date | null
  currentProblem: string | null
  nextAction: string | null
  needBossDecision: boolean
  supplier: { name: string }
  category: { name: string }
  owner: { name: string }
}): TaskItem {
  return {
    id: item.id,
    source: 'purchase',
    sourceLabel: item.status === '异常' ? '采购异常' : '采购暂停',
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
    needBossDecision: item.needBossDecision,
    needSalesSupport: false,
    href: '/purchase-board',
  }
}

function takeTop(items: TaskItem[], count: number) {
  return items.slice(0, count)
}

export async function buildDashboardData(currentPersonId?: string | null): Promise<DashboardData> {
  const tasks = await buildTaskAggregation({}, currentPersonId)

  const [supplierCount, recommendedSupplierCount, categoryCount, quoteSheetCount, salesMaterialCount, developmentProcesses, purchaseProcesses] = await Promise.all([
    prisma.supplier.count({ where: { isArchived: false } }),
    prisma.supplier.count({
      where: {
        isArchived: false,
        recommendedLevel: { in: RECOMMENDED_SUPPLIER_LEVELS },
      },
    }),
    prisma.category.count({ where: { isArchived: false } }),
    prisma.quoteSheet.count({ where: { isArchived: false } }),
    prisma.salesMaterial.count({ where: { isArchived: false } }),
    prisma.supplierDevelopmentProcess.findMany({
      where: { isArchived: false },
      select: { status: true },
    }),
    prisma.purchaseExecutionProcess.findMany({
      where: { isArchived: false },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
        owner: { select: { name: true } },
      },
    }),
  ])

  const developmentInProgressCount = developmentProcesses.filter((item) => item.status === '进行中').length
  const purchaseInProgressCount = purchaseProcesses.filter((item) => item.status === '进行中').length
  const purchaseIssueItems = purchaseProcesses
    .filter((item) => PURCHASE_ISSUE_STATUSES.includes(item.status))
    .map(mapPurchaseIssueItem)

  const mainlineWeekItems = tasks.sections.week.filter((item) => item.source !== 'admin')
  const mainlineOverdueItems = tasks.sections.overdue.filter((item) => item.source !== 'admin')
  const adminItems = tasks.sections.admin
  const adminOverdueItems = adminItems.filter((item) => item.isOverdue)

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      supplierCount,
      recommendedSupplierCount,
      categoryCount,
      activeCategoryCount: categoryCount,
      quoteSheetCount,
      salesMaterialCount,
      openMainlineProcessCount: developmentInProgressCount + purchaseInProgressCount,
      weekTodoCount: tasks.summary.weekCount,
      overdueTodoCount: tasks.summary.overdueCount,
      bossDecisionCount: tasks.summary.bossDecisionCount,
      developmentInProgressCount,
      purchaseInProgressCount,
      purchaseIssueCount: purchaseIssueItems.length,
      adminOpenCount: adminItems.length,
      adminOverdueCount: adminOverdueItems.length,
      adminTodoCount: tasks.summary.adminCount,
    },
    todos: {
      weekItems: takeTop(tasks.sections.week, 6),
      overdueItems: takeTop(tasks.sections.overdue, 6),
      bossDecisionItems: takeTop(tasks.sections.bossDecision, 6),
    },
    mainline: {
      developmentInProgressCount,
      purchaseInProgressCount,
      purchaseIssueCount: purchaseIssueItems.length,
      salesSupportCount: tasks.summary.salesSupportCount,
      weekCount: mainlineWeekItems.length,
      overdueCount: mainlineOverdueItems.length,
      bossDecisionCount: tasks.summary.bossDecisionCount,
      weekItems: takeTop(mainlineWeekItems, 6),
      overdueItems: takeTop(mainlineOverdueItems, 6),
      bossDecisionItems: takeTop(tasks.sections.bossDecision, 6),
      purchaseIssueItems: takeTop(purchaseIssueItems, 6),
    },
    admin: {
      openCount: adminItems.length,
      weekCount: adminItems.filter((item) => item.isThisWeek).length,
      overdueCount: adminOverdueItems.length,
      items: takeTop(adminItems, 6),
    },
    personal: {
      adminCount: adminItems.length,
      weekCount: tasks.sections.week.filter((item) => item.source === 'admin').length,
      overdueCount: adminOverdueItems.length,
      items: takeTop(adminItems, 6),
    },
  }
}
