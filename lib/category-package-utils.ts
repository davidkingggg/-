import { prisma } from '@/lib/db'
import { buildCSVContent, type CSVValue } from '@/lib/csv-utils'

export interface PackageFilter {
  categoryId: string
  quoteStartDate?: string | null
  quoteEndDate?: string | null
  includeNotes?: boolean
}

interface CategoryInfo {
  id: string
  name: string
  type: string | null
  standardLevel: string | null
  afterSalesRisk: string | null
  purchaseFrequency: string | null
  notes: string | null
}

interface SupplierInfo {
  id: string
  name: string
  region: string | null
  companyType: string | null
  cooperationWillingness: string | null
  priceLevel: string | null
  hasQuoted: boolean
  hasVisited: boolean
  recommendedLevel: string | null
  riskSummary: string | null
  riskTags: string[]
}

interface QuoteInfo {
  id: string
  quoteNumber: string | null
  title: string | null
  supplierId: string
  supplierName: string
  quoteDate: string
  quoteStage: string | null
  sourceType: string | null
  itemCount: number
  minPrice: number | null
  attachmentCount: number
}

interface ScoreInfo {
  supplierId: string
  supplierName: string
  totalScore: number | null
  finalLevel: string | null
  scoreDate: string
  scorerName: string
}

interface MaterialInfo {
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
}

interface DecisionInfo {
  id: string
  source: string
  sourceLabel: string
  title: string
  supplierName: string
  ownerName: string
  priority: string | null
  status: string
  dueDate: string | null
  currentProblem: string | null
  nextAction: string | null
}

export interface CategoryPackageData {
  category: CategoryInfo
  stats: {
    supplierCount: number
    quoteCount: number
    scoreCount: number
    materialCount: number
  }
  suppliers: SupplierInfo[]
  quotes: QuoteInfo[]
  scores: ScoreInfo[]
  materials: MaterialInfo[]
  decisions: DecisionInfo[]
  generatedAt: string
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function buildCategoryPackage(filter: PackageFilter): Promise<CategoryPackageData> {
  const { categoryId, quoteStartDate, quoteEndDate, includeNotes } = filter

  const category = await prisma.category.findUnique({
    where: { id: categoryId, isArchived: false },
    select: { id: true, name: true, type: true, standardLevel: true, afterSalesRisk: true, purchaseFrequency: true, notes: true },
  })
  if (!category) throw new Error('品类不存在或已归档')

  const quoteDateWhere: Record<string, unknown> = {}
  if (quoteStartDate) quoteDateWhere.gte = new Date(quoteStartDate + 'T00:00:00.000Z')
  if (quoteEndDate) quoteDateWhere.lte = new Date(quoteEndDate + 'T23:59:59.999Z')

  const [
    suppliers,
    allQuotes,
    allScores,
    materials,
    devDecisions,
    purchaseDecisions,
    supplierCount,
    quoteCount,
    scoreCount,
    materialCount,
  ] = await Promise.all([
    prisma.supplier.findMany({
      where: { categoryId, isArchived: false },
      select: {
        id: true, name: true, region: true, companyType: true,
        cooperationWillingness: true, priceLevel: true,
        hasQuoted: true, hasVisited: true, recommendedLevel: true,
        riskSummary: true,
        riskTags: { include: { riskTag: { select: { name: true } } } },
      },
      orderBy: [{ recommendedLevel: 'asc' }, { updatedAt: 'desc' }],
    }),
    prisma.quoteSheet.findMany({
      where: {
        categoryId,
        isArchived: false,
        ...(Object.keys(quoteDateWhere).length > 0 ? { quoteDate: quoteDateWhere } : {}),
      },
      include: {
        supplier: { select: { name: true } },
        items: { where: { isArchived: false }, select: { id: true, price: true } },
      },
      orderBy: { quoteDate: 'desc' },
    }),
    prisma.supplierScore.findMany({
      where: { categoryId, isArchived: false },
      include: { supplier: { select: { name: true } }, scorer: { select: { name: true } } },
      orderBy: [{ scoreDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.salesMaterial.findMany({
      where: { categoryId, isArchived: false },
      select: {
        title: true, targetAudience: true, coreSellingPoints: true,
        priceAdvantage: true, supplierAdvantage: true, qualificationSupport: true,
        deliveryAdvantage: true, afterSalesAdvantage: true, riskNotice: true, formalText: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.supplierDevelopmentProcess.findMany({
      where: { categoryId, isArchived: false, needBossDecision: true, status: { notIn: ['已完成', '淘汰'] } },
      include: { supplier: { select: { name: true } }, owner: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    }),
    prisma.purchaseExecutionProcess.findMany({
      where: { categoryId, isArchived: false, needBossDecision: true, status: { notIn: ['已完成'] } },
      include: { supplier: { select: { name: true } }, owner: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    }),
    prisma.supplier.count({ where: { categoryId, isArchived: false } }),
    prisma.quoteSheet.count({ where: { categoryId, isArchived: false, ...(Object.keys(quoteDateWhere).length > 0 ? { quoteDate: quoteDateWhere } : {}) } }),
    prisma.supplierScore.count({ where: { categoryId, isArchived: false } }),
    prisma.salesMaterial.count({ where: { categoryId, isArchived: false } }),
  ])

  // 报价去重：每个供应商取最近一条 QuoteSheet，计算最低价 + 附件数
  const supplierLatestQuote = new Map<string, { quote: typeof allQuotes[0]; minPrice: number | null; attachmentCount: number }>()
  for (const q of allQuotes) {
    if (!supplierLatestQuote.has(q.supplierId)) {
      const prices = q.items.map((i) => i.price).filter((p) => p != null).map((p) => Number(p))
      const minPrice = prices.length > 0 ? Math.min(...prices) : null
      supplierLatestQuote.set(q.supplierId, { quote: q, minPrice, attachmentCount: 0 })
    }
  }

  // 获取附件计数
  const quoteIds = allQuotes.map((q) => q.id)
  const attachmentCounts: Record<string, number> = {}
  if (quoteIds.length > 0) {
    const attachments = await prisma.attachment.findMany({
      where: { relatedType: 'QuoteSheet', relatedId: { in: quoteIds }, isArchived: false },
      select: { relatedId: true },
    })
    for (const a of attachments) {
      attachmentCounts[a.relatedId] = (attachmentCounts[a.relatedId] || 0) + 1
    }
  }
  for (const [, v] of supplierLatestQuote) {
    v.attachmentCount = attachmentCounts[v.quote.id] || 0
  }

  const quotes: QuoteInfo[] = allQuotes.map((q) => {
    const prices = q.items.map((i) => i.price).filter((p) => p != null).map((p) => Number(p))
    const minPrice = prices.length > 0 ? Math.min(...prices) : null
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      title: q.title,
      supplierId: q.supplierId,
      supplierName: q.supplier.name,
      quoteDate: fmtDate(q.quoteDate),
      quoteStage: q.quoteStage,
      sourceType: q.sourceType,
      itemCount: q.items.length,
      minPrice,
      attachmentCount: attachmentCounts[q.id] || 0,
    }
  })

  // 评分：每个供应商取最新一条
  const latestScoreMap = new Map<string, typeof allScores[0]>()
  for (const s of allScores) {
    if (!latestScoreMap.has(s.supplierId)) {
      latestScoreMap.set(s.supplierId, s)
    }
  }
  const scores: ScoreInfo[] = Array.from(latestScoreMap.values()).map((s) => ({
    supplierId: s.supplierId,
    supplierName: s.supplier.name,
    totalScore: s.totalScore != null ? Number(s.totalScore) : null,
    finalLevel: s.finalLevel,
    scoreDate: fmtDate(s.scoreDate),
    scorerName: s.scorer.name,
  }))

  const decisions: DecisionInfo[] = [
    ...devDecisions.map((d) => ({
      id: d.id,
      source: 'development' as const,
      sourceLabel: '供应商开发',
      title: d.currentStage,
      supplierName: d.supplier.name,
      ownerName: d.owner.name,
      priority: d.priority,
      status: d.status,
      dueDate: d.dueDate ? fmtDate(d.dueDate) : null,
      currentProblem: d.currentProblem,
      nextAction: d.nextAction,
    })),
    ...purchaseDecisions.map((p) => ({
      id: p.id,
      source: 'purchase' as const,
      sourceLabel: '采购执行',
      title: p.title,
      supplierName: p.supplier.name,
      ownerName: p.owner.name,
      priority: p.priority,
      status: p.status,
      dueDate: p.dueDate ? fmtDate(p.dueDate) : null,
      currentProblem: p.currentProblem,
      nextAction: p.nextAction,
    })),
  ].sort((a, b) => {
    const pOrder = { '高': 0, '中': 1, '低': 2 }
    const pa = pOrder[a.priority as keyof typeof pOrder] ?? 3
    const pb = pOrder[b.priority as keyof typeof pOrder] ?? 3
    if (pa !== pb) return pa - pb
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  return {
    category: includeNotes ? category : { ...category, notes: null },
    stats: { supplierCount, quoteCount, scoreCount, materialCount },
    suppliers: suppliers.map((s) => ({
      ...s,
      riskSummary: includeNotes ? s.riskSummary : null,
      riskTags: s.riskTags.map((rt) => rt.riskTag.name),
    })),
    quotes,
    scores,
    materials: materials.map((m) => ({
      ...m,
      // includeNotes=false 时不导出内部备注类字段
      coreSellingPoints: includeNotes ? m.coreSellingPoints : null,
      priceAdvantage: includeNotes ? m.priceAdvantage : null,
      supplierAdvantage: includeNotes ? m.supplierAdvantage : null,
      qualificationSupport: includeNotes ? m.qualificationSupport : null,
      deliveryAdvantage: includeNotes ? m.deliveryAdvantage : null,
      afterSalesAdvantage: includeNotes ? m.afterSalesAdvantage : null,
      riskNotice: includeNotes ? m.riskNotice : null,
      formalText: includeNotes ? m.formalText : null,
    })),
    decisions: decisions.map((d) => ({
      ...d,
      currentProblem: includeNotes ? d.currentProblem : null,
    })),
    generatedAt: new Date().toISOString(),
  }
}

export function buildCategoryPackageMarkdown(data: CategoryPackageData): string {
  const lines: string[] = []
  const { category, stats, suppliers, quotes, scores, materials, decisions } = data
  const includeNotes = data.materials.length > 0 ? data.materials[0].coreSellingPoints !== null || true : false

  lines.push(`# ${category.name} — 商务支持资料包`)
  lines.push('')
  lines.push(`> 生成时间：${new Date(data.generatedAt).toLocaleString('zh-CN', { hour12: false })}`)
  lines.push(`> 数据范围：仅未归档数据`)
  lines.push('')

  // 一、品类概况
  lines.push('## 一、品类概况')
  lines.push('')
  const overviewRows: string[][] = [
    ['品类名称', category.name],
    ['品类类型', category.type || '-'],
    ['标准化程度', category.standardLevel || '-'],
    ['售后风险', category.afterSalesRisk || '-'],
    ['采购频率', category.purchaseFrequency || '-'],
    ['供应商数量', String(stats.supplierCount)],
    ['报价单数量', String(stats.quoteCount)],
    ['评分记录数量', String(stats.scoreCount)],
    ['销售资料数量', String(stats.materialCount)],
  ]
  if (includeNotes && category.notes) {
    overviewRows.push(['品类备注', category.notes])
  }
  for (const [k, v] of overviewRows) {
    lines.push(`| ${k} | ${v} |`)
  }
  lines.push('')

  // 二、推荐供应商
  lines.push('## 二、推荐供应商')
  lines.push('')
  const levelOrder = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']
  for (const level of levelOrder) {
    const group = suppliers.filter((s) => (s.recommendedLevel || '未评级') === level)
    if (group.length === 0) continue
    lines.push(`### ${level}`)
    lines.push('')
    lines.push('| 供应商 | 地区 | 公司性质 | 合作意愿 | 价格水平 | 已报价 | 已考察 |')
    lines.push('|--------|------|----------|----------|----------|--------|--------|')
    for (const s of group) {
      lines.push(`| ${s.name} | ${s.region || '-'} | ${s.companyType || '-'} | ${s.cooperationWillingness || '-'} | ${s.priceLevel || '-'} | ${s.hasQuoted ? '是' : '否'} | ${s.hasVisited ? '是' : '否'} |`)
    }
    lines.push('')
  }

  // 三、报价概览
  lines.push('## 三、报价概览')
  lines.push('')
  if (quotes.length === 0) {
    lines.push('暂无报价记录。')
  } else {
    lines.push('| 编号 | 供应商 | 日期 | 阶段 | 来源 | 明细数 | 最低价 | 附件数 |')
    lines.push('|------|--------|------|------|------|--------|--------|--------|')
    for (const q of quotes) {
      lines.push(`| ${q.quoteNumber || '-'} | ${q.supplierName} | ${q.quoteDate} | ${q.quoteStage || '-'} | ${q.sourceType || '-'} | ${q.itemCount} | ${q.minPrice != null ? q.minPrice.toFixed(2) : '-'} | ${q.attachmentCount} |`)
    }
  }
  lines.push('')
  lines.push('> 附件路径仅为系统记录路径，不代表文件一定存在。')

  // 四、供应商评分与风险
  lines.push('## 四、供应商评分与风险')
  lines.push('')
  const scoredIds = new Set(scores.map((s) => s.supplierId))
  const allSupplierIds = new Set(suppliers.map((s) => s.id))
  const unscoredIds = new Set([...allSupplierIds].filter((id) => !scoredIds.has(id)))

  lines.push('| 供应商 | 总分 | 等级 | 评分日期 | 评分人 | 风险标签 |')
  lines.push('|--------|------|------|----------|--------|----------|')
  for (const s of scores) {
    const supplier = suppliers.find((sup) => sup.id === s.supplierId)
    const tags = supplier?.riskTags?.join('；') || '-'
    lines.push(`| ${s.supplierName} | ${s.totalScore != null ? s.totalScore.toFixed(1) : '-'} | ${s.finalLevel || '-'} | ${s.scoreDate} | ${s.scorerName} | ${tags} |`)
  }
  for (const id of unscoredIds) {
    const supplier = suppliers.find((sup) => sup.id === id)
    if (!supplier) continue
    const tags = supplier.riskTags?.join('；') || '-'
    lines.push(`| ${supplier.name} | - | - | - | - | ${tags} |`)
  }
  if (includeNotes) {
    for (const s of suppliers) {
      if (s.riskSummary) {
        lines.push(`- **${s.name}** 风险摘要：${s.riskSummary}`)
      }
    }
  }
  lines.push('')

  // 五、销售/商务资料
  lines.push('## 五、销售/商务资料')
  lines.push('')
  if (materials.length === 0) {
    lines.push('暂无销售/商务资料。')
  } else {
    for (const m of materials) {
      lines.push(`### ${m.title}`)
      lines.push('')
      lines.push(`- 目标对象：${m.targetAudience || '-'}`)
      if (includeNotes && m.coreSellingPoints) lines.push(`- 核心卖点：${m.coreSellingPoints}`)
      if (includeNotes && m.priceAdvantage) lines.push(`- 价格优势：${m.priceAdvantage}`)
      if (includeNotes && m.supplierAdvantage) lines.push(`- 供应商优势：${m.supplierAdvantage}`)
      if (includeNotes && m.qualificationSupport) lines.push(`- 资质背书：${m.qualificationSupport}`)
      if (includeNotes && m.deliveryAdvantage) lines.push(`- 交付优势：${m.deliveryAdvantage}`)
      if (includeNotes && m.afterSalesAdvantage) lines.push(`- 售后优势：${m.afterSalesAdvantage}`)
      if (includeNotes && m.riskNotice) lines.push(`- 风险提示：${m.riskNotice}`)
      if (includeNotes && m.formalText) lines.push(`- 正式正文：${m.formalText}`)
      lines.push('')
    }
  }

  // 六、老板决策与下一步建议
  lines.push('## 六、老板决策与下一步建议')
  lines.push('')
  if (decisions.length === 0) {
    lines.push('暂无需要老板决策的事项。')
  } else {
    lines.push('| 类型 | 事项 | 供应商 | 负责人 | 优先级 | 状态 | 截止日期 | 下一步 |')
    lines.push('|------|------|--------|--------|--------|------|----------|--------|')
    for (const d of decisions) {
      const next = includeNotes ? (d.nextAction || '-') : '-'
      lines.push(`| ${d.sourceLabel} | ${d.title} | ${d.supplierName} | ${d.ownerName} | ${d.priority || '-'} | ${d.status} | ${d.dueDate || '-'} | ${next} |`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

export function buildCategoryPackageCSV(data: CategoryPackageData): string {
  const { suppliers, category } = data
  // 一行一个供应商，合并最新报价和评分
  const scoresBySupplier = new Map<string, typeof data.scores[0]>()
  for (const s of data.scores) {
    if (!scoresBySupplier.has(s.supplierId)) scoresBySupplier.set(s.supplierId, s)
  }

  // 每个供应商的唯一最新报价
  const quoteBySupplier = new Map<string, typeof data.quotes[0]>()
  for (const q of data.quotes) {
    if (!quoteBySupplier.has(q.supplierId)) quoteBySupplier.set(q.supplierId, q)
  }

  const headers = [
    '品类名称',
    '供应商名称',
    '推荐等级',
    '地区',
    '公司性质',
    '合作意愿',
    '价格水平',
    '已报价',
    '已考察',
    '风险标签',
    '最近报价日期',
    '报价阶段',
    '报价最低价',
    '报价附件数',
    '评分总分',
    '评分等级',
    '评分日期',
    '评分人',
  ]

  const rows: CSVValue[][] = [headers]

  for (const s of suppliers) {
    const q = quoteBySupplier.get(s.id)
    const sc = scoresBySupplier.get(s.id)
    rows.push([
      category.name,
      s.name,
      s.recommendedLevel || '未评级',
      s.region || '',
      s.companyType || '',
      s.cooperationWillingness || '',
      s.priceLevel || '',
      s.hasQuoted ? '是' : '否',
      s.hasVisited ? '是' : '否',
      s.riskTags.join('；'),
      q?.quoteDate || '',
      q?.quoteStage || '',
      q?.minPrice != null ? q.minPrice : '',
      q?.attachmentCount ?? '',
      sc?.totalScore != null ? sc.totalScore : '',
      sc?.finalLevel || '',
      sc?.scoreDate || '',
      sc?.scorerName || '',
    ])
  }

  return buildCSVContent(rows)
}
