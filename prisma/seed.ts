import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // 1. SystemSetting (upsert by key — 幂等)
  const settings = [
    { key: 'company_name', value: '演示环境企业', notes: '公司名称' },
    { key: 'default_currency', value: 'CNY', notes: '默认货币' },
    { key: 'backup_path', value: './backups', notes: '数据备份路径' },
    { key: 'csv_template_version', value: '1.0', notes: 'CSV导入模板版本' },
    { key: 'default_owner', value: '李总助', notes: '默认负责人' },
  ]
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }

  // 2. RiskTag (upsert by name — 幂等)
  const tagData = [
    { name: '价格偏高', color: '#ef4444' },
    { name: '交期不稳定', color: '#f97316' },
    { name: '资质不完整', color: '#eab308' },
    { name: '售后能力弱', color: '#f43f5e' },
    { name: '账期严苛', color: '#a855f7' },
    { name: '配合度低', color: '#6b7280' },
  ]
  const riskTags: Record<string, string> = {}
  for (const t of tagData) {
    const tag = await prisma.riskTag.upsert({ where: { name: t.name }, update: {}, create: t })
    riskTags[t.name] = tag.id
  }

  // 3. Person (upsert by name+role 用 findFirst 保证幂等)
  const personsData = [
    { name: '张老板', role: '老板', department: '管理层', phone: '13800000001' },
    { name: '李总助', role: '总经理助理', department: '综合管理部', phone: '13800000002' },
    { name: '王销售', role: '销售', department: '销售部', phone: '13800000003' },
    { name: '赵工程师', role: '工程师', department: '技术部', phone: '13800000004' },
    { name: '陈采购', role: '采购需求提交人', department: '工程部', phone: '13800000005' },
    { name: '刘商务', role: '商务', department: '商务部', phone: '13800000006' },
    { name: '周行政', role: '行政', department: '综合管理部', phone: '13800000007' },
    { name: '吴销售', role: '销售', department: '销售部', phone: '13800000008' },
  ]
  for (const p of personsData) {
    const existing = await prisma.person.findFirst({ where: { name: p.name, role: p.role } })
    if (!existing) await prisma.person.create({ data: { ...p, isActive: true } })
  }

  // 4. Category (upsert by name 用 findFirst 保证幂等)
  const categoriesData = [
    { name: '阀门', type: '管道部件', isPriority: true, standardLevel: '高', afterSalesRisk: '低', purchaseFrequency: '高' },
    { name: '水泵', type: '动力设备', isPriority: true, standardLevel: '中', afterSalesRisk: '中', purchaseFrequency: '高' },
    { name: '仪表', type: '控制设备', isPriority: false, standardLevel: '中', afterSalesRisk: '中', purchaseFrequency: '中' },
    { name: '管件', type: '管道部件', isPriority: false, standardLevel: '高', afterSalesRisk: '低', purchaseFrequency: '高' },
    { name: '电控柜', type: '电气设备', isPriority: true, standardLevel: '低', afterSalesRisk: '高', purchaseFrequency: '中' },
    { name: '保温材料', type: '辅材', isPriority: false, standardLevel: '高', afterSalesRisk: '低', purchaseFrequency: '中' },
    { name: '锅炉辅机', type: '设备', isPriority: true, standardLevel: '低', afterSalesRisk: '高', purchaseFrequency: '低' },
    { name: '燃烧器', type: '核心部件', isPriority: true, standardLevel: '低', afterSalesRisk: '高', purchaseFrequency: '低' },
    { name: '水处理设备', type: '辅机', isPriority: false, standardLevel: '中', afterSalesRisk: '中', purchaseFrequency: '低' },
    { name: '常用耗材备件', type: '耗材', isPriority: false, standardLevel: '高', afterSalesRisk: '低', purchaseFrequency: '高' },
  ]
  const categoryIds: Record<string, string> = {}
  for (const c of categoriesData) {
    let cat = await prisma.category.findFirst({ where: { name: c.name } })
    if (!cat) cat = await prisma.category.create({ data: c })
    categoryIds[c.name] = cat.id
  }

  // 5. Supplier (findFirst by name 保证幂等)
  const suppliersData = [
    { name: '杭州某阀门厂', categoryName: '阀门', region: '浙江杭州', companyType: '厂家', source: '展会', priceLevel: '中', recommendedLevel: 'A优先推荐', cooperationWillingness: '强', hasQuoted: true, hasVisited: true },
    { name: '上海某水泵公司', categoryName: '水泵', region: '上海', companyType: '代理商', source: '网络', priceLevel: '高', recommendedLevel: 'B备选', cooperationWillingness: '一般', hasQuoted: true, hasVisited: false },
    { name: '北京某仪表科技', categoryName: '仪表', region: '北京', companyType: '厂家', source: '老板推荐', priceLevel: '高', recommendedLevel: 'B备选', cooperationWillingness: '强', hasQuoted: false, hasVisited: false },
    { name: '无锡某管件厂', categoryName: '管件', region: '江苏无锡', companyType: '厂家', source: '展会', priceLevel: '低', recommendedLevel: 'A优先推荐', cooperationWillingness: '强', hasQuoted: true, hasVisited: true },
    { name: '苏州某电气设备', categoryName: '电控柜', region: '江苏苏州', companyType: '厂家', source: '销售推荐', priceLevel: '中', recommendedLevel: 'B备选', cooperationWillingness: '一般', hasQuoted: false, hasVisited: false },
    { name: '广州某保温材料', categoryName: '保温材料', region: '广东广州', companyType: '经销商', source: '网络', priceLevel: '低', recommendedLevel: 'C暂不推荐', cooperationWillingness: '弱', hasQuoted: false, hasVisited: false },
    { name: '常州某辅机制造', categoryName: '锅炉辅机', region: '江苏常州', companyType: '厂家', source: '展会', priceLevel: '中', recommendedLevel: 'A优先推荐', cooperationWillingness: '强', hasQuoted: true, hasVisited: true },
    { name: '南京某燃烧器代理', categoryName: '燃烧器', region: '江苏南京', companyType: '代理商', source: '供应商转介绍', priceLevel: '高', recommendedLevel: '未评级', cooperationWillingness: '未确认', hasQuoted: false, hasVisited: false },
  ]
  const supplierIds: Record<string, string> = {}
  for (const s of suppliersData) {
    let sup = await prisma.supplier.findFirst({ where: { name: s.name } })
    if (!sup) {
      const { categoryName, ...rest } = s
      sup = await prisma.supplier.create({ data: { ...rest, categoryId: categoryIds[categoryName] } })
    }
    supplierIds[s.name] = sup.id
  }

  // 6. SupplierContact (findFirst by supplierId+name 保证幂等)
  const contactsData = [
    { supplierName: '杭州某阀门厂', name: '李经理', position: '销售经理', phone: '13900001001', isPrimary: true },
    { supplierName: '杭州某阀门厂', name: '张工', position: '技术支持', phone: '13900001002', isPrimary: false },
    { supplierName: '上海某水泵公司', name: '王总', position: '总经理', phone: '13900002001', isPrimary: true },
    { supplierName: '无锡某管件厂', name: '陈经理', position: '销售', phone: '13900004001', isPrimary: true },
    { supplierName: '常州某辅机制造', name: '赵总', position: '副总经理', phone: '13900007001', isPrimary: true },
    { supplierName: '常州某辅机制造', name: '钱工', position: '技术部', phone: '13900007002', isPrimary: false },
  ]
  for (const c of contactsData) {
    const supplierId = supplierIds[c.supplierName]
    if (!supplierId) continue
    const existing = await prisma.supplierContact.findFirst({ where: { supplierId, name: c.name } })
    if (!existing) {
      const { supplierName, ...rest } = c
      void supplierName
      await prisma.supplierContact.create({ data: { ...rest, supplierId } })
    }
  }

  // 7. SupplierRiskTag (check before create 保证幂等)
  const riskBindings = [
    { supplierName: '上海某水泵公司', tagName: '价格偏高' },
    { supplierName: '广州某保温材料', tagName: '配合度低' },
    { supplierName: '广州某保温材料', tagName: '交期不稳定' },
    { supplierName: '南京某燃烧器代理', tagName: '价格偏高' },
    { supplierName: '南京某燃烧器代理', tagName: '资质不完整' },
  ]
  for (const b of riskBindings) {
    const supplierId = supplierIds[b.supplierName]
    const riskTagId = riskTags[b.tagName]
    if (!supplierId || !riskTagId) continue
    const existing = await prisma.supplierRiskTag.findUnique({
      where: { supplierId_riskTagId: { supplierId, riskTagId } },
    })
    if (!existing) {
      await prisma.supplierRiskTag.create({ data: { supplierId, riskTagId } })
    }
  }

  // 8. QuoteSheet (findFirst by quoteNumber 保证幂等)
  const quotesData = [
    { quoteNumber: 'QS-2026-001', title: '杭州某阀门厂 阀门初次报价', supplierName: '杭州某阀门厂', categoryName: '阀门', quoteDate: '2026-04-15', sourceType: 'PDF', quoteStage: '初次报价' },
    { quoteNumber: 'QS-2026-002', title: '无锡某管件厂 管件报价', supplierName: '无锡某管件厂', categoryName: '管件', quoteDate: '2026-04-20', sourceType: 'Excel', quoteStage: '初次报价' },
    { quoteNumber: 'QS-2026-003', title: '常州某辅机制造 锅炉辅机二次议价', supplierName: '常州某辅机制造', categoryName: '锅炉辅机', quoteDate: '2026-05-01', sourceType: '微信', quoteStage: '二次议价' },
  ]
  const quoteSheetIds: Record<string, string> = {}
  for (const q of quotesData) {
    let qs = await prisma.quoteSheet.findFirst({ where: { quoteNumber: q.quoteNumber } })
    if (!qs) {
      qs = await prisma.quoteSheet.create({
        data: {
          quoteNumber: q.quoteNumber,
          title: q.title,
          supplierId: supplierIds[q.supplierName],
          categoryId: categoryIds[q.categoryName],
          quoteDate: new Date(q.quoteDate + 'T00:00:00.000Z'),
          sourceType: q.sourceType,
          quoteStage: q.quoteStage,
        },
      })
    }
    quoteSheetIds[q.quoteNumber] = qs.id
  }

  // 9. QuoteItem
  const quoteItemsData = [
    { sheetNum: 'QS-2026-001', productName: 'DN50法兰球阀', compareKey: '阀门-DN50-法兰球阀', model: 'Q41F-16C DN50', unit: '个', price: 285, includesTax: true, taxRate: 0.13, deliveryTime: '7天', warranty: '1年' },
    { sheetNum: 'QS-2026-001', productName: 'DN80蝶阀', compareKey: '阀门-DN80-蝶阀', model: 'D71X-16 DN80', unit: '个', price: 180, includesTax: true, taxRate: 0.13, deliveryTime: '7天', warranty: '1年' },
    { sheetNum: 'QS-2026-001', productName: 'DN100截止阀', compareKey: '阀门-DN100-截止阀', model: 'J41H-16C DN100', unit: '个', price: 520, includesTax: true, taxRate: 0.13, deliveryTime: '10天', warranty: '1年' },
    { sheetNum: 'QS-2026-002', productName: 'DN50无缝弯头', compareKey: '管件-DN50-弯头', model: '90°弯头 DN50 SCH40', unit: '个', price: 28, includesTax: false, deliveryTime: '3天' },
    { sheetNum: 'QS-2026-002', productName: 'DN80法兰', compareKey: '管件-DN80-法兰', model: 'HG/T20592 DN80 PN16', unit: '片', price: 45, includesTax: false, deliveryTime: '3天' },
    { sheetNum: 'QS-2026-003', productName: '除氧器', compareKey: '辅机-除氧器', model: 'HCY-10', unit: '台', price: 32000, includesTax: true, taxRate: 0.13, deliveryTime: '30天', warranty: '2年', paymentTerms: '预付30%，到货验收付70%' },
    { sheetNum: 'QS-2026-003', productName: '连续排污扩容器', compareKey: '辅机-排污扩容器', model: 'LP-6', unit: '台', price: 18500, includesTax: true, taxRate: 0.13, deliveryTime: '25天', warranty: '2年' },
  ]
  for (const qi of quoteItemsData) {
    const sheetId = quoteSheetIds[qi.sheetNum]
    if (!sheetId) continue
    const sheet = await prisma.quoteSheet.findUnique({ where: { id: sheetId } })
    if (!sheet) continue
    const existing = await prisma.quoteItem.findFirst({ where: { quoteSheetId: sheetId, productName: qi.productName } })
    if (!existing) {
      await prisma.quoteItem.create({
        data: {
          quoteSheetId: sheetId,
          supplierId: sheet.supplierId,
          categoryId: sheet.categoryId,
          compareKey: qi.compareKey,
          productName: qi.productName,
          model: qi.model || null,
          unit: qi.unit || null,
          price: qi.price,
          includesTax: qi.includesTax ?? false,
          taxRate: qi.taxRate ?? null,
          includesFreight: false,
          deliveryTime: qi.deliveryTime || null,
          paymentTerms: qi.paymentTerms || null,
          warranty: qi.warranty || null,
        },
      })
    }
  }

  // 10. Attachment (报价单附件示例)
  const attachmentsData = [
    { sheetNum: 'QS-2026-001', filePath: 'D:/采购资料/报价/杭州某阀门厂_阀门报价_2026.pdf', notes: '初次报价PDF' },
    { sheetNum: 'QS-2026-002', filePath: 'D:/采购资料/报价/无锡某管件厂_管件报价单.xlsx', notes: 'Excel报价表' },
  ]
  for (const att of attachmentsData) {
    const sheetId = quoteSheetIds[att.sheetNum]
    if (!sheetId) continue
    const existing = await prisma.attachment.findFirst({ where: { relatedType: 'QuoteSheet', relatedId: sheetId, filePath: att.filePath } })
    if (!existing) {
      const parts = att.filePath.replace(/\\/g, '/').split('/')
      const fileName = parts[parts.length - 1]
      const dotIdx = fileName.lastIndexOf('.')
      const fileType = dotIdx !== -1 ? fileName.slice(dotIdx + 1).toLowerCase() : ''
      await prisma.attachment.create({
        data: { relatedType: 'QuoteSheet', relatedId: sheetId, filePath: att.filePath, fileName, fileType, notes: att.notes },
      })
    }
  }

  // 11. SupplierScore
  const scorer = await prisma.person.findFirst({ where: { name: '李总助' } })
  if (scorer) {
    const scoresData = [
      { supplierName: '杭州某阀门厂', qualityScore: 23, priceScore: 18, deliveryScore: 14, afterSalesScore: 13, cooperationScore: 9, paymentScore: 8, regionScore: 5 },
      { supplierName: '上海某水泵公司', qualityScore: 20, priceScore: 12, deliveryScore: 12, afterSalesScore: 10, cooperationScore: 6, paymentScore: 6, regionScore: 4 },
      { supplierName: '常州某辅机制造', qualityScore: 24, priceScore: 16, deliveryScore: 13, afterSalesScore: 14, cooperationScore: 9, paymentScore: 8, regionScore: 4 },
    ]
    for (const sc of scoresData) {
      const supplierId = supplierIds[sc.supplierName]
      if (!supplierId) continue
      const sup = await prisma.supplier.findUnique({ where: { id: supplierId } })
      if (!sup) continue
      const existing = await prisma.supplierScore.findFirst({ where: { supplierId } })
      if (!existing) {
        const total = sc.qualityScore + sc.priceScore + sc.deliveryScore + sc.afterSalesScore + sc.cooperationScore + sc.paymentScore + sc.regionScore
        let sysLevel = 'C暂不推荐'
        if (total >= 85) sysLevel = 'A优先推荐'
        else if (total >= 70) sysLevel = 'B备选'
        
        await prisma.supplierScore.create({
          data: {
            supplierId,
            categoryId: sup.categoryId,
            scorerId: scorer.id,
            scoreDate: new Date('2026-05-08T00:00:00Z'),
            qualityScore: sc.qualityScore,
            priceScore: sc.priceScore,
            deliveryScore: sc.deliveryScore,
            afterSalesScore: sc.afterSalesScore,
            cooperationScore: sc.cooperationScore,
            paymentScore: sc.paymentScore,
            regionScore: sc.regionScore,
            totalScore: total,
            systemLevel: sysLevel,
            finalLevel: sysLevel,
            scoreReason: '初始化导入打分'
          }
        })
      }
    }
  }

  // 12. InvestigationRecord
  const investigationsData = [
    { supplierName: '杭州某阀门厂', type: '实地考察', date: '2026-04-10', keyPoints: '厂房面积大，自动化设备多，现货充足', recommendFollowUp: true },
    { supplierName: '上海某水泵公司', type: '线上沟通', date: '2026-04-12', keyPoints: '价格太硬，不肯让步，账期也有要求', recommendFollowUp: true },
  ]
  for (const inv of investigationsData) {
    const supplierId = supplierIds[inv.supplierName]
    if (!supplierId) continue
    const sup = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!sup) continue
    const existing = await prisma.investigationRecord.findFirst({ where: { supplierId, type: inv.type } })
    if (!existing) {
      await prisma.investigationRecord.create({
        data: {
          supplierId,
          categoryId: sup.categoryId,
          type: inv.type,
          date: new Date(inv.date + 'T00:00:00Z'),
          keyPoints: inv.keyPoints,
          recommendFollowUp: inv.recommendFollowUp
        }
      })
    }
  }

  console.log('Seed completed successfully.')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
