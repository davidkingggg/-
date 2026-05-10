import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export type DataQualitySeverity = 'high' | 'medium' | 'low'

export type DataQualityCheckKey =
  | 'duplicateSuppliers'
  | 'suppliersMissingContacts'
  | 'suppliersMissingValidScores'
  | 'quoteItemsMissingCompareKey'
  | 'developmentMissingFollowUp'
  | 'purchaseMissingFollowUp'
  | 'longPausedOrAbnormalOpenItems'
  | 'overdueAdminTasks'
  | 'salesMaterialsMissingFormalText'

export interface DataQualityIssue {
  id: string
  entityType: string
  entityId: string
  title: string
  subtitle?: string
  categoryName?: string
  supplierName?: string
  status?: string
  severity: DataQualitySeverity
  reason: string
  suggestion: string
  href?: string
  updatedAt?: string
  meta?: Record<string, string | number | boolean | null>
}

export interface DataQualityCheckResult {
  key: DataQualityCheckKey
  title: string
  description: string
  severity: DataQualitySeverity
  count: number
  returnedCount: number
  hasMore: boolean
  items: DataQualityIssue[]
}

export interface DataQualityResponse {
  summary: {
    totalIssues: number
    highCount: number
    mediumCount: number
    lowCount: number
    generatedAt: string
  }
  checks: DataQualityCheckResult[]
}

export interface DataQualityFilters {
  check?: DataQualityCheckKey
  severity?: DataQualitySeverity
  categoryId?: string
  limit: number
}

const CHECK_KEYS: DataQualityCheckKey[] = [
  'duplicateSuppliers',
  'suppliersMissingContacts',
  'suppliersMissingValidScores',
  'quoteItemsMissingCompareKey',
  'developmentMissingFollowUp',
  'purchaseMissingFollowUp',
  'longPausedOrAbnormalOpenItems',
  'overdueAdminTasks',
  'salesMaterialsMissingFormalText',
]

const SEVERITIES: DataQualitySeverity[] = ['high', 'medium', 'low']
const DEVELOPMENT_CLOSED_STATUSES = ['已完成', '淘汰']
const PURCHASE_CLOSED_STATUSES = ['已完成']
const ADMIN_DONE_STATUS = '已完成'
const LONG_STALE_DAYS = 30

type CheckDefinition = {
  key: DataQualityCheckKey
  title: string
  description: string
  severity: DataQualitySeverity
}

const CHECK_DEFINITIONS: Record<DataQualityCheckKey, CheckDefinition> = {
  duplicateSuppliers: {
    key: 'duplicateSuppliers',
    title: '重复供应商',
    description: '同一品类下供应商名称规范化后重复，可能影响评分、报价和流程归集。',
    severity: 'medium',
  },
  suppliersMissingContacts: {
    key: 'suppliersMissingContacts',
    title: '供应商缺少联系人',
    description: '未归档供应商没有可用联系人，后续询价和跟进会受影响。',
    severity: 'medium',
  },
  suppliersMissingValidScores: {
    key: 'suppliersMissingValidScores',
    title: '供应商缺少有效评分',
    description: '供应商没有未归档评分，或最新评分缺少总分、最终等级。',
    severity: 'medium',
  },
  quoteItemsMissingCompareKey: {
    key: 'quoteItemsMissingCompareKey',
    title: '报价明细缺少 compareKey',
    description: '报价明细缺少对比标识，无法稳定进入报价对比。',
    severity: 'high',
  },
  developmentMissingFollowUp: {
    key: 'developmentMissingFollowUp',
    title: '开发流程缺少跟进信息',
    description: '开放中的开发流程缺少截止日期，或负责人关联异常。',
    severity: 'high',
  },
  purchaseMissingFollowUp: {
    key: 'purchaseMissingFollowUp',
    title: '采购流程缺少跟进信息',
    description: '开放中的采购流程缺少截止日期，或负责人关联异常。',
    severity: 'high',
  },
  longPausedOrAbnormalOpenItems: {
    key: 'longPausedOrAbnormalOpenItems',
    title: '长期异常/暂停未关闭事项',
    description: `暂停或异常状态超过 ${LONG_STALE_DAYS} 天未更新，建议确认是否关闭、恢复或归档。`,
    severity: 'medium',
  },
  overdueAdminTasks: {
    key: 'overdueAdminTasks',
    title: '行政事项超期未完成',
    description: '行政事项已超过截止日期但仍未完成。',
    severity: 'high',
  },
  salesMaterialsMissingFormalText: {
    key: 'salesMaterialsMissingFormalText',
    title: '销售/商务资料缺少正式正文',
    description: '销售或商务资料未填写正式正文，暂不适合直接对外使用。',
    severity: 'medium',
  },
}

export function parseDataQualityFilters(request: Request): DataQualityFilters {
  const { searchParams } = new URL(request.url)
  const check = searchParams.get('check')?.trim()
  const severity = searchParams.get('severity')?.trim()
  const categoryId = searchParams.get('categoryId')?.trim()
  const limitParam = searchParams.get('limit')?.trim()

  if (check && !CHECK_KEYS.includes(check as DataQualityCheckKey)) {
    throw new Error('检查项参数无效')
  }
  if (severity && !SEVERITIES.includes(severity as DataQualitySeverity)) {
    throw new Error('严重程度参数无效')
  }

  let limit = 50
  if (limitParam) {
    const parsed = Number(limitParam)
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error('每类显示数量必须是正整数')
    }
    limit = Math.min(parsed, 200)
  }

  return {
    check: check ? (check as DataQualityCheckKey) : undefined,
    severity: severity ? (severity as DataQualitySeverity) : undefined,
    categoryId: categoryId || undefined,
    limit,
  }
}

export async function buildDataQualityReport(filters: DataQualityFilters): Promise<DataQualityResponse> {
  const builders: Record<DataQualityCheckKey, () => Promise<DataQualityCheckResult>> = {
    duplicateSuppliers: () => buildDuplicateSuppliersCheck(filters),
    suppliersMissingContacts: () => buildSuppliersMissingContactsCheck(filters),
    suppliersMissingValidScores: () => buildSuppliersMissingValidScoresCheck(filters),
    quoteItemsMissingCompareKey: () => buildQuoteItemsMissingCompareKeyCheck(filters),
    developmentMissingFollowUp: () => buildDevelopmentMissingFollowUpCheck(filters),
    purchaseMissingFollowUp: () => buildPurchaseMissingFollowUpCheck(filters),
    longPausedOrAbnormalOpenItems: () => buildLongPausedOrAbnormalOpenItemsCheck(filters),
    overdueAdminTasks: () => buildOverdueAdminTasksCheck(filters),
    salesMaterialsMissingFormalText: () => buildSalesMaterialsMissingFormalTextCheck(filters),
  }

  const keys = filters.check ? [filters.check] : CHECK_KEYS
  const checks = await Promise.all(keys.map((key) => builders[key]()))
  const visibleChecks = filters.severity ? checks.filter((check) => check.severity === filters.severity) : checks

  return {
    summary: {
      totalIssues: visibleChecks.reduce((sum, check) => sum + check.count, 0),
      highCount: visibleChecks.filter((check) => check.severity === 'high').reduce((sum, check) => sum + check.count, 0),
      mediumCount: visibleChecks.filter((check) => check.severity === 'medium').reduce((sum, check) => sum + check.count, 0),
      lowCount: visibleChecks.filter((check) => check.severity === 'low').reduce((sum, check) => sum + check.count, 0),
      generatedAt: new Date().toISOString(),
    },
    checks: visibleChecks,
  }
}

function finishCheck(definition: CheckDefinition, issues: DataQualityIssue[], limit: number): DataQualityCheckResult {
  const items = issues.slice(0, limit)

  return {
    ...definition,
    count: issues.length,
    returnedCount: items.length,
    hasMore: issues.length > items.length,
    items,
  }
}

function normalizeSupplierName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN')
}

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0
}

function toIso(value?: Date | string | null) {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function daysBetween(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.max(0, Math.floor((end - start) / 86_400_000))
}

function supplierCategoryFilter(categoryId?: string): Prisma.SupplierWhereInput {
  return {
    isArchived: false,
    ...(categoryId ? { categoryId } : {}),
  }
}

async function buildDuplicateSuppliersCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.duplicateSuppliers
  const suppliers = await prisma.supplier.findMany({
    where: supplierCategoryFilter(filters.categoryId),
    include: {
      category: { select: { name: true } },
    },
    orderBy: [{ categoryId: 'asc' }, { name: 'asc' }, { createdAt: 'asc' }],
  })

  const groups = new Map<string, typeof suppliers>()
  suppliers.forEach((supplier) => {
    const key = `${supplier.categoryId}::${normalizeSupplierName(supplier.name)}`
    groups.set(key, [...(groups.get(key) || []), supplier])
  })

  const issues = Array.from(groups.values())
    .filter((group) => group.length > 1)
    .map((group) => {
      const first = group[0]
      return {
        id: `duplicate-suppliers-${first.categoryId}-${normalizeSupplierName(first.name)}`,
        entityType: 'Supplier',
        entityId: first.id,
        title: `同品类下存在 ${group.length} 条“${first.name}”`,
        subtitle: group.map((supplier) => supplier.name).join('、'),
        categoryName: first.category.name,
        supplierName: first.name,
        severity: definition.severity,
        reason: '供应商名称规范化后重复，可能造成资料、报价和评分分散。',
        suggestion: '请进入供应商库核对是否确为同一供应商，第一版仅提示，不自动合并。',
        href: `/suppliers?search=${encodeURIComponent(first.name)}`,
        updatedAt: toIso(group.reduce((latest, supplier) => (supplier.updatedAt > latest ? supplier.updatedAt : latest), first.updatedAt)),
        meta: {
          duplicateCount: group.length,
        },
      } satisfies DataQualityIssue
    })

  return finishCheck(definition, issues, filters.limit)
}

async function buildSuppliersMissingContactsCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.suppliersMissingContacts
  const suppliers = await prisma.supplier.findMany({
    where: {
      ...supplierCategoryFilter(filters.categoryId),
      contacts: { none: { isArchived: false } },
    },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const issues = suppliers.map((supplier) => ({
    id: `supplier-missing-contact-${supplier.id}`,
    entityType: 'Supplier',
    entityId: supplier.id,
    title: supplier.name,
    subtitle: supplier.region || undefined,
    categoryName: supplier.category.name,
    supplierName: supplier.name,
    severity: definition.severity,
    reason: '该供应商没有未归档联系人。',
    suggestion: '请在供应商详情中补充至少一位可联系人员。',
    href: `/suppliers/${supplier.id}`,
    updatedAt: toIso(supplier.updatedAt),
    meta: {
      recommendedLevel: supplier.recommendedLevel,
    },
  }))

  return finishCheck(definition, issues, filters.limit)
}

async function buildSuppliersMissingValidScoresCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.suppliersMissingValidScores
  const suppliers = await prisma.supplier.findMany({
    where: supplierCategoryFilter(filters.categoryId),
    include: {
      category: { select: { name: true } },
      scores: {
        where: { isArchived: false },
        orderBy: [{ scoreDate: 'desc' }, { createdAt: 'desc' }],
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const issues = suppliers.flatMap((supplier) => {
    const latestScore = supplier.scores[0]
    if (latestScore && latestScore.totalScore !== null && !isBlank(latestScore.finalLevel)) return []

    const reason = !latestScore
      ? '该供应商没有未归档评分记录。'
      : latestScore.totalScore === null
        ? '最新评分缺少总分。'
        : '最新评分缺少最终等级。'

    return [{
      id: `supplier-missing-score-${supplier.id}`,
      entityType: 'Supplier',
      entityId: supplier.id,
      title: supplier.name,
      categoryName: supplier.category.name,
      supplierName: supplier.name,
      severity: definition.severity,
      reason,
      suggestion: '请进入供应商评分补充完整评分，便于推荐等级判断。',
      href: '/scores',
      updatedAt: toIso(latestScore?.updatedAt || supplier.updatedAt),
      meta: {
        recommendedLevel: supplier.recommendedLevel,
        latestScoreDate: toIso(latestScore?.scoreDate) || null,
      },
    } satisfies DataQualityIssue]
  })

  return finishCheck(definition, issues, filters.limit)
}

async function buildQuoteItemsMissingCompareKeyCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.quoteItemsMissingCompareKey
  const quoteItems = await prisma.quoteItem.findMany({
    where: {
      isArchived: false,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      quoteSheet: { select: { id: true, title: true, quoteNumber: true, quoteDate: true, isArchived: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const issues = quoteItems
    .filter((item) => isBlank(item.compareKey))
    .map((item) => ({
      id: `quote-item-missing-compare-key-${item.id}`,
      entityType: 'QuoteItem',
      entityId: item.id,
      title: item.productName,
      subtitle: item.model || item.quoteSheet.title || item.quoteSheet.quoteNumber || undefined,
      categoryName: item.category.name,
      supplierName: item.supplier.name,
      severity: definition.severity,
      reason: '该报价明细的 compareKey 为空，无法稳定参与横向报价对比。',
      suggestion: '请在报价明细中补充统一的对比标识。',
      href: `/quotes/${item.quoteSheet.id}`,
      updatedAt: toIso(item.updatedAt),
      meta: {
        quoteDate: toIso(item.quoteSheet.quoteDate) || null,
        quoteSheetArchived: item.quoteSheet.isArchived,
      },
    }))

  return finishCheck(definition, issues, filters.limit)
}

async function buildDevelopmentMissingFollowUpCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.developmentMissingFollowUp
  const processes = await prisma.supplierDevelopmentProcess.findMany({
    where: {
      isArchived: false,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      status: { notIn: DEVELOPMENT_CLOSED_STATUSES },
    },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const issues = processes.flatMap((process) => {
    const owner = (process as typeof process & { owner?: { name: string } | null }).owner
    const missingReasons = [
      !process.dueDate ? '缺少截止日期' : '',
      !owner ? '负责人关联异常' : '',
    ].filter(Boolean)

    if (missingReasons.length === 0) return []

    return [{
      id: `development-missing-follow-up-${process.id}`,
      entityType: 'SupplierDevelopmentProcess',
      entityId: process.id,
      title: `${process.supplier.name}开发流程`,
      subtitle: process.currentStage,
      categoryName: process.category.name,
      supplierName: process.supplier.name,
      status: process.status,
      severity: definition.severity,
      reason: missingReasons.join('、'),
      suggestion: '请在开发看板中补齐跟进信息，保证事项能进入正常跟进节奏。',
      href: '/development-board',
      updatedAt: toIso(process.updatedAt),
      meta: {
        ownerName: owner?.name || null,
        dueDate: toIso(process.dueDate) || null,
      },
    } satisfies DataQualityIssue]
  })

  return finishCheck(definition, issues, filters.limit)
}

async function buildPurchaseMissingFollowUpCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.purchaseMissingFollowUp
  const processes = await prisma.purchaseExecutionProcess.findMany({
    where: {
      isArchived: false,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      status: { notIn: PURCHASE_CLOSED_STATUSES },
    },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const issues = processes.flatMap((process) => {
    const owner = (process as typeof process & { owner?: { name: string } | null }).owner
    const missingReasons = [
      !process.dueDate ? '缺少截止日期' : '',
      !owner ? '负责人关联异常' : '',
    ].filter(Boolean)

    if (missingReasons.length === 0) return []

    return [{
      id: `purchase-missing-follow-up-${process.id}`,
      entityType: 'PurchaseExecutionProcess',
      entityId: process.id,
      title: process.title,
      subtitle: process.currentStage,
      categoryName: process.category.name,
      supplierName: process.supplier.name,
      status: process.status,
      severity: definition.severity,
      reason: missingReasons.join('、'),
      suggestion: '请在采购看板中补齐跟进信息，避免采购事项脱离待办视图。',
      href: '/purchase-board',
      updatedAt: toIso(process.updatedAt),
      meta: {
        ownerName: owner?.name || null,
        dueDate: toIso(process.dueDate) || null,
      },
    } satisfies DataQualityIssue]
  })

  return finishCheck(definition, issues, filters.limit)
}

async function buildLongPausedOrAbnormalOpenItemsCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.longPausedOrAbnormalOpenItems
  const staleBefore = new Date()
  staleBefore.setDate(staleBefore.getDate() - LONG_STALE_DAYS)

  const [developmentProcesses, purchaseProcesses] = await Promise.all([
    prisma.supplierDevelopmentProcess.findMany({
      where: {
        isArchived: false,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        status: '暂停',
        updatedAt: { lt: staleBefore },
      },
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { updatedAt: 'asc' },
    }),
    prisma.purchaseExecutionProcess.findMany({
      where: {
        isArchived: false,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        status: { in: ['暂停', '异常'] },
        updatedAt: { lt: staleBefore },
      },
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { updatedAt: 'asc' },
    }),
  ])

  const now = new Date()
  const developmentIssues = developmentProcesses.map((process) => ({
    id: `long-paused-development-${process.id}`,
    entityType: 'SupplierDevelopmentProcess',
    entityId: process.id,
    title: `${process.supplier.name}开发流程`,
    subtitle: process.currentStage,
    categoryName: process.category.name,
    supplierName: process.supplier.name,
    status: process.status,
    severity: definition.severity,
    reason: `该开发流程已处于暂停状态 ${daysBetween(process.updatedAt, now)} 天。`,
    suggestion: '请确认该事项应恢复推进、关闭淘汰，还是归档留存。',
    href: '/development-board',
    updatedAt: toIso(process.updatedAt),
    meta: {
      staleDays: daysBetween(process.updatedAt, now),
    },
  }))

  const purchaseIssues = purchaseProcesses.map((process) => ({
    id: `long-paused-purchase-${process.id}`,
    entityType: 'PurchaseExecutionProcess',
    entityId: process.id,
    title: process.title,
    subtitle: process.currentStage,
    categoryName: process.category.name,
    supplierName: process.supplier.name,
    status: process.status,
    severity: definition.severity,
    reason: `该采购流程已处于${process.status}状态 ${daysBetween(process.updatedAt, now)} 天。`,
    suggestion: '请确认该事项应恢复推进、完成关闭，还是归档留存。',
    href: '/purchase-board',
    updatedAt: toIso(process.updatedAt),
    meta: {
      staleDays: daysBetween(process.updatedAt, now),
    },
  }))

  return finishCheck(definition, [...developmentIssues, ...purchaseIssues], filters.limit)
}

async function buildOverdueAdminTasksCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.overdueAdminTasks
  if (filters.categoryId) return finishCheck(definition, [], filters.limit)

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tasks = await prisma.adminTask.findMany({
    where: {
      isArchived: false,
      dueDate: { lt: startOfToday },
      status: { not: ADMIN_DONE_STATUS },
    },
    orderBy: { dueDate: 'asc' },
  })

  const issues = tasks.map((task) => ({
    id: `overdue-admin-task-${task.id}`,
    entityType: 'AdminTask',
    entityId: task.id,
    title: task.title,
    subtitle: task.type,
    status: task.status,
    severity: definition.severity,
    reason: `该行政事项已逾期 ${task.dueDate ? daysBetween(task.dueDate, today) : 0} 天。`,
    suggestion: '请在行政事项中更新完成状态、截止日期或后续处理说明。',
    href: '/admin-tasks',
    updatedAt: toIso(task.updatedAt),
    meta: {
      priority: task.priority,
      dueDate: toIso(task.dueDate) || null,
    },
  }))

  return finishCheck(definition, issues, filters.limit)
}

async function buildSalesMaterialsMissingFormalTextCheck(filters: DataQualityFilters) {
  const definition = CHECK_DEFINITIONS.salesMaterialsMissingFormalText
  const materials = await prisma.salesMaterial.findMany({
    where: {
      isArchived: false,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const issues = materials
    .filter((material) => isBlank(material.formalText))
    .map((material) => ({
      id: `sales-material-missing-formal-text-${material.id}`,
      entityType: 'SalesMaterial',
      entityId: material.id,
      title: material.title,
      subtitle: material.targetAudience || undefined,
      categoryName: material.category.name,
      severity: definition.severity,
      reason: '该销售/商务资料缺少正式正文。',
      suggestion: '请在销售/商务资料页面补充可直接对外使用的正式正文。',
      href: '/sales-materials',
      updatedAt: toIso(material.updatedAt),
      meta: {
        hasCoreSellingPoints: !isBlank(material.coreSellingPoints),
      },
    }))

  return finishCheck(definition, issues, filters.limit)
}
