import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { buildCSVContent as buildUnifiedCSVContent } from '@/lib/csv-utils'
import { isOpenAdminStatus, isOverdue, isThisWeekDue } from '@/lib/task-status-utils'

type ReportSource = 'development' | 'purchase'
type RiskLevel = 'high' | 'watch'

export interface BossReportFilter {
  startDate?: string | null
  endDate?: string | null
  currentPersonId?: string | null
}

export interface BossReportItem {
  id: string
  source: ReportSource
  sourceLabel: string
  title: string
  supplierName: string
  categoryId: string
  categoryName: string
  ownerName: string
  status: string
  currentStage: string
  priority?: string | null
  dueDate?: string | null
  currentProblem?: string | null
  nextAction?: string | null
  needBossDecision: boolean
  updatedAt: string
  href: string
}

export interface BossReportRiskItem extends BossReportItem {
  riskLevel: RiskLevel
  riskLabel: string
  riskReasons: string[]
}

export interface BossReportCategoryFocus {
  categoryId: string
  categoryName: string
  developmentCount: number
  purchaseCount: number
  riskCount: number
  totalCount: number
}

export interface BossReportData {
  range: {
    startDate: string
    endDate: string
    label: string
  }
  summary: {
    developmentProgressCount: number
    purchaseProgressCount: number
    bossDecisionCount: number
    highRiskCount: number
    watchRiskCount: number
    currentRiskCount: number
  }
  focusCategories: BossReportCategoryFocus[]
  developmentProgress: BossReportItem[]
  purchaseProgress: BossReportItem[]
  bossDecisions: BossReportItem[]
  currentRisks: BossReportRiskItem[]
  personal: {
    personBound: boolean
    adminOpenCount: number
    adminWeekCount: number
    adminOverdueCount: number
    adminItems: Array<{
      id: string
      title: string
      type: string
      status: string
      priority?: string | null
      dueDate?: string | null
      notes?: string | null
    }>
  }
  markdown: string
}

type DevelopmentProcess = Prisma.SupplierDevelopmentProcessGetPayload<{
  include: {
    supplier: { select: { name: true } }
    category: { select: { id: true; name: true } }
    owner: { select: { name: true } }
  }
}>

type PurchaseProcess = Prisma.PurchaseExecutionProcessGetPayload<{
  include: {
    supplier: { select: { name: true } }
    category: { select: { id: true; name: true } }
    owner: { select: { name: true } }
  }
}>

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function getDefaultWeekRange(baseDate = new Date()) {
  const current = startOfDay(baseDate)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(current)
  start.setDate(current.getDate() + diffToMonday)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return { start, end: endOfDay(end) }
}

function parseDateOnly(value: string | null | undefined, label: string) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label}必须是有效日期`)
  }
  return date
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(value?: string | Date | null) {
  if (!value) return '未设置'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '未设置'
  return date.toLocaleDateString('zh-CN')
}

function getReportRange(filter: BossReportFilter) {
  const defaultRange = getDefaultWeekRange()
  const start = parseDateOnly(filter.startDate, '开始日期') ?? defaultRange.start
  const endBase = parseDateOnly(filter.endDate, '结束日期') ?? defaultRange.end
  const end = endOfDay(endBase)

  if (start > end) {
    throw new Error('开始日期不能晚于结束日期')
  }

  return { start: startOfDay(start), end }
}

function inRange(value: Date | null | undefined, start: Date, end: Date) {
  return Boolean(value && value >= start && value <= end)
}

function isProgressInRange(item: { createdAt: Date; updatedAt: Date; dueDate: Date | null }, start: Date, end: Date) {
  return inRange(item.createdAt, start, end) || inRange(item.updatedAt, start, end) || inRange(item.dueDate, start, end)
}

function isClosedStatus(status: string) {
  return status === '已完成'
}

function isOverdueOpen(item: { dueDate: Date | null; status: string }, today = new Date()) {
  if (!item.dueDate || isClosedStatus(item.status)) return false
  return startOfDay(item.dueDate) < startOfDay(today)
}

function adminTaskDate(item: { taskDate: Date | null; dueDate: Date | null }) {
  return item.taskDate ?? item.dueDate
}

function hasCurrentProblem(value?: string | null) {
  return Boolean(value && value.trim())
}

function mapDevelopmentItem(item: DevelopmentProcess): BossReportItem {
  return {
    id: item.id,
    source: 'development',
    sourceLabel: '开发',
    title: `${item.supplier.name} 开发跟进`,
    supplierName: item.supplier.name,
    categoryId: item.category.id,
    categoryName: item.category.name,
    ownerName: item.owner.name,
    status: item.status,
    currentStage: item.currentStage,
    priority: item.priority,
    dueDate: item.dueDate?.toISOString() ?? null,
    currentProblem: item.currentProblem,
    nextAction: item.nextAction,
    needBossDecision: item.needBossDecision,
    updatedAt: item.updatedAt.toISOString(),
    href: '/development-board',
  }
}

function mapPurchaseItem(item: PurchaseProcess): BossReportItem {
  return {
    id: item.id,
    source: 'purchase',
    sourceLabel: '采购',
    title: item.title,
    supplierName: item.supplier.name,
    categoryId: item.category.id,
    categoryName: item.category.name,
    ownerName: item.owner.name,
    status: item.status,
    currentStage: item.currentStage,
    priority: item.priority,
    dueDate: item.dueDate?.toISOString() ?? null,
    currentProblem: item.currentProblem,
    nextAction: item.nextAction,
    needBossDecision: item.needBossDecision,
    updatedAt: item.updatedAt.toISOString(),
    href: '/purchase-board',
  }
}

function getDevelopmentRisk(item: DevelopmentProcess): { level: RiskLevel; reasons: string[] } | null {
  if (isClosedStatus(item.status)) return null

  const highReasons: string[] = []
  const watchReasons: string[] = []

  if (item.status === '淘汰') highReasons.push('开发淘汰')
  if (isOverdueOpen(item)) highReasons.push('超期未关闭')
  if (item.status === '暂停') watchReasons.push('状态暂停')
  if (hasCurrentProblem(item.currentProblem)) watchReasons.push('有当前问题')

  if (highReasons.length > 0) return { level: 'high', reasons: highReasons }
  if (watchReasons.length > 0) return { level: 'watch', reasons: watchReasons }
  return null
}

function getPurchaseRisk(item: PurchaseProcess): { level: RiskLevel; reasons: string[] } | null {
  if (isClosedStatus(item.status)) return null

  const highReasons: string[] = []
  const watchReasons: string[] = []

  if (item.status === '异常') highReasons.push('采购异常')
  if (isOverdueOpen(item)) highReasons.push('超期未关闭')
  if (item.status === '暂停') watchReasons.push('状态暂停')
  if (hasCurrentProblem(item.currentProblem)) watchReasons.push('有当前问题')

  if (highReasons.length > 0) return { level: 'high', reasons: highReasons }
  if (watchReasons.length > 0) return { level: 'watch', reasons: watchReasons }
  return null
}

function sortReportItems<T extends BossReportItem>(items: T[]) {
  return [...items].sort((a, b) => {
    if (a.needBossDecision !== b.needBossDecision) return a.needBossDecision ? -1 : 1
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    if (aDue !== bDue) return aDue - bDue
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

function buildFocusCategories(progressItems: BossReportItem[], rangeRiskItems: BossReportRiskItem[]) {
  const categoryMap = new Map<string, BossReportCategoryFocus>()

  function ensure(item: BossReportItem) {
    const existing = categoryMap.get(item.categoryId)
    if (existing) return existing
    const created = {
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      developmentCount: 0,
      purchaseCount: 0,
      riskCount: 0,
      totalCount: 0,
    }
    categoryMap.set(item.categoryId, created)
    return created
  }

  for (const item of progressItems) {
    const category = ensure(item)
    if (item.source === 'development') category.developmentCount += 1
    if (item.source === 'purchase') category.purchaseCount += 1
  }

  for (const item of rangeRiskItems) {
    ensure(item).riskCount += 1
  }

  for (const category of categoryMap.values()) {
    category.totalCount = category.developmentCount + category.purchaseCount + category.riskCount
  }

  return Array.from(categoryMap.values())
    .filter((item) => item.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount || a.categoryName.localeCompare(b.categoryName, 'zh-CN'))
    .slice(0, 5)
}

function formatMarkdownList(items: BossReportItem[], emptyText: string, withRisk = false) {
  if (items.length === 0) return `- ${emptyText}`

  return items
    .slice(0, 10)
    .map((item) => {
      const risk = withRisk && 'riskReasons' in item ? `，风险：${(item as BossReportRiskItem).riskReasons.join('、')}` : ''
      const decision = item.needBossDecision ? '，需老板决策' : ''
      const due = item.dueDate ? `，截止：${formatDisplayDate(item.dueDate)}` : ''
      const problem = item.currentProblem ? `，问题：${item.currentProblem}` : ''
      return `- [${item.sourceLabel}] ${item.title}（${item.categoryName}，负责人：${item.ownerName}，状态：${item.status}${due}${decision}${risk}${problem}）`
    })
    .join('\n')
}

function formatPersonalAdminMarkdown(data: Omit<BossReportData, 'markdown'>) {
  if (!data.personal.personBound) {
    return '- 当前账号未绑定人员，个人行政事项暂不可用'
  }
  if (data.personal.adminItems.length === 0) {
    return '- 当前暂无个人行政事项'
  }

  return data.personal.adminItems
    .map((item) => {
      const due = item.dueDate ? `，截止：${formatDisplayDate(item.dueDate)}` : ''
      const notes = item.notes ? `，备注：${item.notes}` : ''
      return `- [行政] ${item.title}，类型：${item.type}，状态：${item.status}${due}${notes}`
    })
    .join('\n')
}

export function buildBossReportMarkdown(data: Omit<BossReportData, 'markdown'>) {
  const highRisks = data.currentRisks.filter((item) => item.riskLevel === 'high')
  const watchRisks = data.currentRisks.filter((item) => item.riskLevel === 'watch')

  return [
    `# 采购经营简报（${data.range.label}）`,
    '',
    '## 一、核心概览',
    `- 开发进展：${data.summary.developmentProgressCount} 项`,
    `- 采购进展：${data.summary.purchaseProgressCount} 项`,
    `- 待老板决策：${data.summary.bossDecisionCount} 项`,
    `- 当前未解决风险：${data.summary.currentRiskCount} 项（高风险 ${data.summary.highRiskCount} 项，关注项 ${data.summary.watchRiskCount} 项）`,
    `- 我的行政待办：${data.personal.adminOpenCount} 项（本周 ${data.personal.adminWeekCount} 项，超期 ${data.personal.adminOverdueCount} 项）`,
    '',
    '## 二、重点品类（前 5）',
    data.focusCategories.length === 0
      ? '- 暂无重点品类'
      : data.focusCategories
          .map(
            (item, index) =>
              `${index + 1}. ${item.categoryName}：共 ${item.totalCount} 项（开发 ${item.developmentCount}，采购 ${item.purchaseCount}，风险 ${item.riskCount}）`,
          )
          .join('\n'),
    '',
    '## 三、本期开发/采购进展',
    formatMarkdownList([...data.developmentProgress, ...data.purchaseProgress], '本期暂无开发/采购进展'),
    '',
    '## 四、待决策事项',
    formatMarkdownList(data.bossDecisions, '当前暂无待老板决策事项'),
    '',
    '## 五、当前未解决风险/异常/暂停',
    '### 高风险',
    formatMarkdownList(highRisks, '当前暂无高风险事项', true),
    '',
    '### 关注项',
    formatMarkdownList(watchRisks, '当前暂无关注项', true),
    '',
    '## 六、我的行政事项',
    formatPersonalAdminMarkdown(data),
  ].join('\n')
}

export function buildBossReportCsvRows(data: BossReportData) {
  const headers = ['分区', '层级', '来源', '事项', '供应商', '品类', '负责人', '状态', '阶段', '优先级', '截止日期', '需老板决策', '风险原因', '当前问题', '下一步']
  const rows: string[][] = [headers]

  function pushRow(section: string, item: BossReportItem, level = '', reasons = '') {
    rows.push([
      section,
      level,
      item.sourceLabel,
      item.title,
      item.supplierName,
      item.categoryName,
      item.ownerName,
      item.status,
      item.currentStage,
      item.priority || '',
      item.dueDate ? formatDisplayDate(item.dueDate) : '',
      item.needBossDecision ? '是' : '否',
      reasons,
      item.currentProblem || '',
      item.nextAction || '',
    ])
  }

  data.focusCategories.forEach((item, index) => {
    rows.push([
      '重点品类',
      `第 ${index + 1} 位`,
      '',
      `${item.categoryName}：共 ${item.totalCount} 项`,
      '',
      item.categoryName,
      '',
      '',
      '',
      '',
      '',
      '',
      `开发 ${item.developmentCount}；采购 ${item.purchaseCount}；风险 ${item.riskCount}`,
      '',
      '',
    ])
  })

  data.developmentProgress.forEach((item) => pushRow('本期开发进展', item))
  data.purchaseProgress.forEach((item) => pushRow('本期采购进展', item))
  data.bossDecisions.forEach((item) => pushRow('待老板决策', item))
  data.currentRisks.forEach((item) =>
    pushRow('当前未解决风险/异常/暂停', item, item.riskLabel, item.riskReasons.join('、')),
  )
  data.personal.adminItems.forEach((item) => {
    rows.push([
      '我的行政事项',
      '',
      '行政',
      item.title,
      '',
      '',
      '',
      item.status,
      item.type,
      item.priority || '',
      item.dueDate ? formatDisplayDate(item.dueDate) : '',
      '否',
      '',
      '',
      item.notes || '',
    ])
  })

  return rows
}

export function buildCsvContent(rows: string[][]) {
  return buildUnifiedCSVContent(rows)
}

export async function buildBossReportData(filter: BossReportFilter = {}): Promise<BossReportData> {
  const currentPersonId = filter.currentPersonId ?? null
  const { start, end } = getReportRange(filter)

  const [developmentProcesses, purchaseProcesses, personalAdminTasks] = await Promise.all([
    prisma.supplierDevelopmentProcess.findMany({
      where: {
        isArchived: false,
        supplier: { isArchived: false },
        category: { isArchived: false },
      },
      include: {
        supplier: { select: { name: true } },
        category: { select: { id: true, name: true } },
        owner: { select: { name: true } },
      },
    }),
    prisma.purchaseExecutionProcess.findMany({
      where: {
        isArchived: false,
        supplier: { isArchived: false },
        category: { isArchived: false },
      },
      include: {
        supplier: { select: { name: true } },
        category: { select: { id: true, name: true } },
        owner: { select: { name: true } },
      },
    }),
    currentPersonId
      ? prisma.adminTask.findMany({
          where: {
            isArchived: false,
            ownerPersonId: currentPersonId,
          },
          orderBy: [{ taskDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }],
        })
      : Promise.resolve([]),
  ])

  const developmentProgress = sortReportItems(developmentProcesses.filter((item) => isProgressInRange(item, start, end)).map(mapDevelopmentItem))
  const purchaseProgress = sortReportItems(purchaseProcesses.filter((item) => isProgressInRange(item, start, end)).map(mapPurchaseItem))

  const bossDecisions = sortReportItems([
    ...developmentProcesses.filter((item) => item.needBossDecision && !isClosedStatus(item.status)).map(mapDevelopmentItem),
    ...purchaseProcesses.filter((item) => item.needBossDecision && !isClosedStatus(item.status)).map(mapPurchaseItem),
  ])

  const developmentRisks = developmentProcesses
    .map((item) => {
      const risk = getDevelopmentRisk(item)
      if (!risk) return null
      return {
        ...mapDevelopmentItem(item),
        riskLevel: risk.level,
        riskLabel: risk.level === 'high' ? '高风险' : '关注项',
        riskReasons: risk.reasons,
      } satisfies BossReportRiskItem
    })
    .filter((item): item is BossReportRiskItem => Boolean(item))

  const purchaseRisks = purchaseProcesses
    .map((item) => {
      const risk = getPurchaseRisk(item)
      if (!risk) return null
      return {
        ...mapPurchaseItem(item),
        riskLevel: risk.level,
        riskLabel: risk.level === 'high' ? '高风险' : '关注项',
        riskReasons: risk.reasons,
      } satisfies BossReportRiskItem
    })
    .filter((item): item is BossReportRiskItem => Boolean(item))

  const currentRisks = sortReportItems([...developmentRisks, ...purchaseRisks])
  const rangeRiskItems = currentRisks.filter((item) => {
    const sourceItems = item.source === 'development' ? developmentProcesses : purchaseProcesses
    const raw = sourceItems.find((process) => process.id === item.id)
    return raw ? isProgressInRange(raw, start, end) : false
  })

  const dataWithoutMarkdown: Omit<BossReportData, 'markdown'> = {
    range: {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
      label: `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`,
    },
    summary: {
      developmentProgressCount: developmentProgress.length,
      purchaseProgressCount: purchaseProgress.length,
      bossDecisionCount: bossDecisions.length,
      highRiskCount: currentRisks.filter((item) => item.riskLevel === 'high').length,
      watchRiskCount: currentRisks.filter((item) => item.riskLevel === 'watch').length,
      currentRiskCount: currentRisks.length,
    },
    focusCategories: buildFocusCategories([...developmentProgress, ...purchaseProgress], rangeRiskItems),
    developmentProgress,
    purchaseProgress,
    bossDecisions,
    currentRisks,
    personal: {
      personBound: Boolean(currentPersonId),
      adminOpenCount: personalAdminTasks.filter((item) => isOpenAdminStatus(item.status)).length,
      adminWeekCount: personalAdminTasks.filter((item) => isOpenAdminStatus(item.status) && isThisWeekDue(adminTaskDate(item))).length,
      adminOverdueCount: personalAdminTasks.filter((item) => isOpenAdminStatus(item.status) && isOverdue(adminTaskDate(item))).length,
      adminItems: personalAdminTasks.slice(0, 6).map((item) => {
        const date = adminTaskDate(item)

        return {
          id: item.id,
          title: item.title,
          type: item.type,
          status: item.status,
          priority: item.priority,
          dueDate: date?.toISOString() ?? null,
          notes: item.notes,
        }
      }),
    },
  }

  return {
    ...dataWithoutMarkdown,
    markdown: buildBossReportMarkdown(dataWithoutMarkdown),
  }
}
