import type { Prisma } from '@prisma/client'
import { buildCSVContent, formatCSVDateTime, type CSVValue } from '@/lib/csv-utils'

export const TARGET_AUDIENCES = ['销售部门', '商务总助', '安装公司', '老板', '客户', '其他'] as const

export type TargetAudience = (typeof TARGET_AUDIENCES)[number]

export interface SalesMaterialLike {
  title: string
  targetAudience: string | null
  coreSellingPoints: string | null
  priceAdvantage: string | null
  supplierAdvantage: string | null
  qualificationSupport: string | null
  deliveryAdvantage: string | null
  afterSalesAdvantage: string | null
  riskNotice: string | null
  formalText: string | null
  updatedAt?: Date | string
  category?: {
    name: string
  } | null
}

export function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function isValidTargetAudience(value: string | null | undefined) {
  return !value || TARGET_AUDIENCES.includes(value as TargetAudience)
}

export function buildSalesMaterialWhere(searchParams: URLSearchParams): Prisma.SalesMaterialWhereInput {
  const categoryId = searchParams.get('categoryId')?.trim()
  const targetAudience = searchParams.get('targetAudience')?.trim()
  const keyword = searchParams.get('keyword')?.trim()
  const includeArchived = searchParams.get('includeArchived') === 'true'

  const where: Prisma.SalesMaterialWhereInput = {}
  if (!includeArchived) where.isArchived = false
  if (categoryId) where.categoryId = categoryId
  if (targetAudience) where.targetAudience = targetAudience
  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { targetAudience: { contains: keyword } },
      { coreSellingPoints: { contains: keyword } },
      { priceAdvantage: { contains: keyword } },
      { supplierAdvantage: { contains: keyword } },
      { qualificationSupport: { contains: keyword } },
      { deliveryAdvantage: { contains: keyword } },
      { afterSalesAdvantage: { contains: keyword } },
      { riskNotice: { contains: keyword } },
      { formalText: { contains: keyword } },
    ]
  }

  return where
}

export function buildSalesMaterialPreview(material: SalesMaterialLike) {
  const formalText = material.formalText?.trim()
  if (formalText) return formalText

  const rows = [
    ['资料名称', material.title],
    ['适用品类', material.category?.name || ''],
    ['目标对象', material.targetAudience || ''],
    ['核心卖点', material.coreSellingPoints || ''],
    ['价格优势', material.priceAdvantage || ''],
    ['供应商优势', material.supplierAdvantage || ''],
    ['资质背书', material.qualificationSupport || ''],
    ['交付优势', material.deliveryAdvantage || ''],
    ['售后优势', material.afterSalesAdvantage || ''],
    ['风险提示', material.riskNotice || ''],
  ].filter(([, value]) => value.trim())

  return rows.map(([label, value]) => `${label}：${value}`).join('\n')
}

export function buildSalesMaterialCsv(materials: SalesMaterialLike[]) {
  const headers = [
    '资料名称',
    '品类',
    '目标对象',
    '核心卖点',
    '价格优势',
    '供应商优势',
    '资质背书',
    '交付优势',
    '售后优势',
    '风险提示',
    '正式资料正文',
    '更新时间',
  ]

  const rows: CSVValue[][] = [
    headers,
    ...materials.map((material) => [
      material.title,
      material.category?.name || '',
      material.targetAudience || '',
      material.coreSellingPoints || '',
      material.priceAdvantage || '',
      material.supplierAdvantage || '',
      material.qualificationSupport || '',
      material.deliveryAdvantage || '',
      material.afterSalesAdvantage || '',
      material.riskNotice || '',
      buildSalesMaterialPreview(material),
      formatDateTime(material.updatedAt),
    ]),
  ]

  return buildCSVContent(rows)
}

export function buildSalesMaterialMarkdown(materials: SalesMaterialLike[]) {
  if (materials.length === 0) return '# 销售/商务资料\n\n暂无符合条件的销售/商务资料。'

  const sections = materials.map((material) => {
    const meta = [
      `- 品类：${material.category?.name || '-'}`,
      `- 目标对象：${material.targetAudience || '-'}`,
      `- 更新时间：${formatDateTime(material.updatedAt) || '-'}`,
    ].join('\n')

    return `## ${material.title}\n\n${meta}\n\n${buildSalesMaterialPreview(material)}`
  })

  return `# 销售/商务资料\n\n${sections.join('\n\n')}\n`
}

function formatDateTime(value: Date | string | undefined) {
  return formatCSVDateTime(value)
}
