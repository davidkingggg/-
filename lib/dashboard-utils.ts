import { prisma } from '@/lib/db'
import { buildTaskAggregation, type TaskItem } from '@/lib/task-aggregation'
import { isOpenDevelopmentStatus, isOpenPurchaseStatus } from '@/lib/task-status-utils'

const RECOMMENDED_SUPPLIER_LEVELS = ['A优先推荐', 'B备选']

export interface DashboardData {
  generatedAt: string
  summary: {
    recommendedSupplierCount: number
    activeCategoryCount: number
    quoteSheetCount: number
    openMainlineProcessCount: number
    weekTodoCount: number
    overdueTodoCount: number
    bossDecisionCount: number
    adminTodoCount: number
  }
  mainline: {
    openDevelopmentCount: number
    openPurchaseCount: number
    salesSupportCount: number
    weekCount: number
    overdueCount: number
    bossDecisionCount: number
    weekItems: TaskItem[]
    overdueItems: TaskItem[]
    bossDecisionItems: TaskItem[]
  }
  admin: {
    openCount: number
    weekCount: number
    overdueCount: number
    items: TaskItem[]
  }
}

function takeTop(items: TaskItem[], count: number) {
  return items.slice(0, count)
}

export async function buildDashboardData(): Promise<DashboardData> {
  const [tasks, recommendedSupplierCount, activeCategoryCount, quoteSheetCount, developmentProcesses, purchaseProcesses] = await Promise.all([
    buildTaskAggregation(),
    prisma.supplier.count({
      where: {
        isArchived: false,
        recommendedLevel: { in: RECOMMENDED_SUPPLIER_LEVELS },
      },
    }),
    prisma.category.count({ where: { isArchived: false } }),
    prisma.quoteSheet.count({ where: { isArchived: false } }),
    prisma.supplierDevelopmentProcess.findMany({
      where: { isArchived: false },
      select: { status: true },
    }),
    prisma.purchaseExecutionProcess.findMany({
      where: { isArchived: false },
      select: { status: true },
    }),
  ])

  const openDevelopmentCount = developmentProcesses.filter((item) => isOpenDevelopmentStatus(item.status)).length
  const openPurchaseCount = purchaseProcesses.filter((item) => isOpenPurchaseStatus(item.status)).length

  const mainlineWeekItems = tasks.sections.week.filter((item) => item.source !== 'admin')
  const mainlineOverdueItems = tasks.sections.overdue.filter((item) => item.source !== 'admin')
  const adminItems = tasks.sections.admin

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      recommendedSupplierCount,
      activeCategoryCount,
      quoteSheetCount,
      openMainlineProcessCount: openDevelopmentCount + openPurchaseCount,
      weekTodoCount: tasks.summary.weekCount,
      overdueTodoCount: tasks.summary.overdueCount,
      bossDecisionCount: tasks.summary.bossDecisionCount,
      adminTodoCount: tasks.summary.adminCount,
    },
    mainline: {
      openDevelopmentCount,
      openPurchaseCount,
      salesSupportCount: tasks.summary.salesSupportCount,
      weekCount: mainlineWeekItems.length,
      overdueCount: mainlineOverdueItems.length,
      bossDecisionCount: tasks.summary.bossDecisionCount,
      weekItems: takeTop(mainlineWeekItems, 6),
      overdueItems: takeTop(mainlineOverdueItems, 6),
      bossDecisionItems: takeTop(tasks.sections.bossDecision, 6),
    },
    admin: {
      openCount: adminItems.length,
      weekCount: adminItems.filter((item) => item.isThisWeek).length,
      overdueCount: adminItems.filter((item) => item.isOverdue).length,
      items: takeTop(adminItems, 6),
    },
  }
}
