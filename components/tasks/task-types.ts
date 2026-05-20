export type TaskSource = 'development' | 'purchase' | 'admin'
export type TaskScope = 'week' | 'overdue' | 'bossDecision' | 'salesSupport' | 'admin'

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

export interface TaskFiltersValue {
  source: string
  scope: string
  priority: string
  categoryId: string
  ownerId: string
  status: string
  from: string
  to: string
}

export interface LookupOption {
  id: string
  name: string
}
