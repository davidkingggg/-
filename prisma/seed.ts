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

  // 5. SalesMaterial (findFirst by title+categoryId+targetAudience 保证幂等)
  const salesMaterialsData = [
    {
      title: '阀门客户沟通资料',
      categoryName: '阀门',
      targetAudience: '销售部门',
      coreSellingPoints: '常用品类标准化程度高，适合在客户询价早期快速说明配置口径。',
      priceAdvantage: '常规规格可按批量需求形成更稳定的商务报价空间。',
      supplierAdvantage: '可围绕交付、资质、售后响应形成清晰的商务支撑材料。',
      qualificationSupport: '可提供营业执照、产品合格证明和常规检测资料说明。',
      deliveryAdvantage: '常用规格供货节奏清晰，便于销售向客户说明预计交付周期。',
      afterSalesAdvantage: '标准件售后边界明确，便于客户理解更换和响应方式。',
      riskNotice: '特殊材质、特殊压力等级需单独确认技术参数后再对外承诺。',
      formalText: '针对阀门类客户沟通，可重点说明标准化程度、常用规格交付节奏和资质资料完整性。特殊材质、压力等级和连接方式需在正式报价前完成参数确认。',
    },
    {
      title: '水泵商务报价说明',
      categoryName: '水泵',
      targetAudience: '商务总助',
      coreSellingPoints: '适合在报价说明中突出性能参数、交付周期和售后响应。',
      priceAdvantage: '可按功率、流量、扬程等参数拆分报价依据，便于商务解释价格差异。',
      supplierAdvantage: '成熟型号资料较完整，便于形成规范的对外说明。',
      qualificationSupport: '可整理产品说明、合格证明和基础参数表作为报价附件说明。',
      deliveryAdvantage: '常规型号交付周期可预估，非标型号需单独确认。',
      afterSalesAdvantage: '可说明安装调试配合、易损件更换和售后响应口径。',
      riskNotice: '选型参数不完整时，不建议直接对客户确认最终价格和交期。',
      formalText: '',
    },
    {
      title: '电控柜安装公司支持话术',
      categoryName: '电控柜',
      targetAudience: '安装公司',
      coreSellingPoints: '重点说明柜体配置、现场接线配合和调试支持边界。',
      priceAdvantage: '标准配置与非标配置分开说明，减少现场沟通误差。',
      supplierAdvantage: '可围绕图纸确认、生产排期和调试配合形成对外支持口径。',
      qualificationSupport: '可提供基础电气资料和必要的产品证明说明。',
      deliveryAdvantage: '图纸确认越早，排产和现场衔接越稳定。',
      afterSalesAdvantage: '现场问题按接线、调试、元器件三类描述响应方式。',
      riskNotice: '图纸、点位和现场条件未确认前，不对安装时间作绝对承诺。',
      formalText: '',
    },
    {
      title: '锅炉辅机客户正式说明',
      categoryName: '锅炉辅机',
      targetAudience: '客户',
      coreSellingPoints: '围绕系统匹配、运行稳定性和后续维护便利性进行说明。',
      priceAdvantage: '可根据配置差异解释价格组成，避免客户只按单价比较。',
      supplierAdvantage: '成熟辅机方案便于和锅炉系统整体匹配。',
      qualificationSupport: '可根据客户需求整理产品资质和参数资料。',
      deliveryAdvantage: '常规辅机可结合项目节点安排交付说明。',
      afterSalesAdvantage: '后续维护和备件支持可形成明确沟通口径。',
      riskNotice: '系统匹配参数变化会影响配置、价格和交期。',
      formalText: '',
    },
  ]

  for (const material of salesMaterialsData) {
    const categoryId = categoryIds[material.categoryName]
    if (!categoryId) continue

    const existing = await prisma.salesMaterial.findFirst({
      where: {
        title: material.title,
        categoryId,
        targetAudience: material.targetAudience,
      },
    })
    const { categoryName, ...rest } = material
    void categoryName
    const data = {
      ...rest,
      categoryId,
      isArchived: false,
      archivedAt: null,
    }

    if (existing) {
      await prisma.salesMaterial.update({ where: { id: existing.id }, data })
    } else {
      await prisma.salesMaterial.create({ data })
    }
  }

  // 6. Supplier (findFirst by name 保证幂等)
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

  // 7. SupplierContact (findFirst by supplierId+name 保证幂等)
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

  // 8. SupplierRiskTag (check before create 保证幂等)
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

  // 9. QuoteSheet (findFirst by quoteNumber 保证幂等)
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

  // 10. QuoteItem
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

  // 11. Attachment (报价单附件示例)
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

  // 12. SupplierScore
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

  // 13. InvestigationRecord
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

  // 14. SupplierDevelopmentProcess
  const devProcessesData = [
    { supplierName: '北京某仪表科技', currentStage: '初步沟通', ownerName: '王销售', priority: '高', dueDate: '2026-05-20', currentProblem: '对方要求提供详细的参数表', status: '进行中' },
    { supplierName: '苏州某电气设备', currentStage: '内部评审', ownerName: '李总助', priority: '中', needBossDecision: true, status: '进行中' },
  ]
  for (const dp of devProcessesData) {
    const supplierId = supplierIds[dp.supplierName]
    if (!supplierId) continue
    const sup = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!sup) continue
    const owner = await prisma.person.findFirst({ where: { name: dp.ownerName } })

    const existing = await prisma.supplierDevelopmentProcess.findFirst({
      where: { supplierId, categoryId: sup.categoryId, currentStage: dp.currentStage }
    })

    if (!existing) {
      await prisma.supplierDevelopmentProcess.create({
        data: {
          supplierId,
          categoryId: sup.categoryId,
          currentStage: dp.currentStage,
          ownerId: owner?.id || '',
          priority: dp.priority,
          dueDate: dp.dueDate ? new Date(dp.dueDate + 'T00:00:00Z') : null,
          currentProblem: dp.currentProblem,
          needBossDecision: dp.needBossDecision || false,
          status: dp.status,
        }
      })
    }
  }

  // 15. PurchaseExecutionProcess
  const purProcessesData = [
    { title: '无锡管件批量采购', supplierName: '无锡某管件厂', currentStage: '合同签订', requesterName: '陈采购', ownerName: '刘商务', priority: '高', purchaseAmount: 45000, status: '进行中' },
    { title: '杭州阀门样品采购', supplierName: '杭州某阀门厂', currentStage: '供应商备货/发货', requesterName: '赵工程师', ownerName: '王销售', purchaseAmount: 2000, status: '进行中' },
  ]
  for (const pp of purProcessesData) {
    const supplierId = supplierIds[pp.supplierName]
    if (!supplierId) continue
    const sup = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!sup) continue
    const requester = await prisma.person.findFirst({ where: { name: pp.requesterName } })
    const owner = await prisma.person.findFirst({ where: { name: pp.ownerName } })

    const existing = await prisma.purchaseExecutionProcess.findFirst({
      where: { supplierId, categoryId: sup.categoryId, title: pp.title, currentStage: pp.currentStage }
    })

    if (!existing) {
      await prisma.purchaseExecutionProcess.create({
        data: {
          title: pp.title,
          supplierId,
          categoryId: sup.categoryId,
          currentStage: pp.currentStage,
          requesterId: requester?.id || '',
          ownerId: owner?.id || '',
          priority: pp.priority || '中',
          purchaseAmount: pp.purchaseAmount,
          status: pp.status,
        }
      })
    }
  }

  // 16. Phase 7A task center demo data (idempotent, dates move with the current week)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const dayOfWeek = startOfToday.getDay()
  const monday = new Date(startOfToday)
  monday.setDate(startOfToday.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))

  const dateFromMonday = (offset: number) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + offset)
    return date
  }

  const daysAgo = (offset: number) => {
    const date = new Date(startOfToday)
    date.setDate(startOfToday.getDate() - offset)
    return date
  }

  const firstCategory = await prisma.category.findFirst({ where: { isArchived: false } })
  const defaultOwner = await prisma.person.findFirst({ where: { name: '李总助' } }) || await prisma.person.findFirst()
  const defaultRequester = await prisma.person.findFirst({ where: { name: '陈采购' } }) || defaultOwner
  const defaultAdminPerson =
    (await prisma.person.findFirst({ where: { role: '行政', isActive: true } })) ||
    defaultOwner ||
    (await prisma.person.findFirst({ where: { isActive: true } })) ||
    (await prisma.person.findFirst())

  const ensureDevTask = async (data: {
    supplierName: string
    stage: string
    priority: string
    dueDate: Date
    currentProblem: string
    nextAction: string
    needBossDecision?: boolean
    needSalesSupport?: boolean
  }) => {
    const supplierId = supplierIds[data.supplierName]
    if (!supplierId || !defaultOwner) return

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) return

    const existing = await prisma.supplierDevelopmentProcess.findFirst({
      where: { supplierId, categoryId: supplier.categoryId, currentStage: data.stage },
    })

    const taskData = {
      ownerId: defaultOwner.id,
      priority: data.priority,
      dueDate: data.dueDate,
      currentProblem: data.currentProblem,
      nextAction: data.nextAction,
      needBossDecision: data.needBossDecision || false,
      needSalesSupport: data.needSalesSupport || false,
      status: '进行中',
      isArchived: false,
      archivedAt: null,
    }

    if (existing) {
      await prisma.supplierDevelopmentProcess.update({ where: { id: existing.id }, data: taskData })
    } else {
      await prisma.supplierDevelopmentProcess.create({
        data: {
          supplierId,
          categoryId: supplier.categoryId,
          currentStage: data.stage,
          ...taskData,
        },
      })
    }
  }

  const ensurePurchaseTask = async (data: {
    title: string
    supplierName: string
    stage: string
    priority: string
    dueDate: Date
    currentProblem: string
    nextAction: string
    needBossDecision?: boolean
  }) => {
    const supplierId = supplierIds[data.supplierName]
    if (!supplierId || !defaultOwner || !defaultRequester) return

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) return

    const existing = await prisma.purchaseExecutionProcess.findFirst({
      where: { title: data.title, supplierId, categoryId: supplier.categoryId, currentStage: data.stage },
    })

    const taskData = {
      requesterId: defaultRequester.id,
      ownerId: defaultOwner.id,
      priority: data.priority,
      dueDate: data.dueDate,
      currentProblem: data.currentProblem,
      nextAction: data.nextAction,
      needBossDecision: data.needBossDecision || false,
      status: '进行中',
      isArchived: false,
      archivedAt: null,
    }

    if (existing) {
      await prisma.purchaseExecutionProcess.update({ where: { id: existing.id }, data: taskData })
    } else {
      await prisma.purchaseExecutionProcess.create({
        data: {
          title: data.title,
          supplierId,
          categoryId: supplier.categoryId,
          currentStage: data.stage,
          ...taskData,
        },
      })
    }
  }

  const ensureAdminTask = async (data: {
    title: string
    type: string
    priority?: string
    dueDate: Date
    status: string
    notes: string
    taskDate?: Date
    startTime?: string | null
    endTime?: string | null
    recurrenceType?: string
    recurrenceEndDate?: Date | null
    isRecurring?: boolean
    isArchived?: boolean
    archivedAt?: Date | null
  }) => {
    if (!defaultAdminPerson) return

    const existing = await prisma.adminTask.findFirst({ where: { title: data.title, type: data.type } })
    const recurrenceType = data.recurrenceType ?? 'none'
    const isArchived = data.isArchived ?? false
    const taskData = {
      ownerPersonId: defaultAdminPerson.id,
      createdByPersonId: defaultAdminPerson.id,
      assigneePersonId: defaultAdminPerson.id,
      priority: data.priority,
      dueDate: data.dueDate,
      taskDate: data.taskDate ?? data.dueDate,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      recurrenceType,
      recurrenceEndDate: data.recurrenceEndDate ?? null,
      isRecurring: data.isRecurring ?? recurrenceType !== 'none',
      status: data.status,
      notes: data.notes,
      completedAt: data.status === '已完成' ? data.dueDate : null,
      isArchived,
      archivedAt: isArchived ? data.archivedAt ?? data.dueDate : null,
    }

    if (existing) {
      await prisma.adminTask.update({ where: { id: existing.id }, data: taskData })
    } else {
      await prisma.adminTask.create({ data: { title: data.title, type: data.type, ...taskData } })
    }
  }

  if (firstCategory) {
    await ensureDevTask({
      supplierName: '北京某仪表科技',
      stage: '资料收集',
      priority: '高',
      dueDate: dateFromMonday(2),
      currentProblem: '样本资料还缺少资质扫描件',
      nextAction: '联系供应商补齐资质材料',
    })
    await ensureDevTask({
      supplierName: '苏州某电气设备',
      stage: '报价获取',
      priority: '中',
      dueDate: daysAgo(2),
      currentProblem: '报价单迟迟未确认有效期',
      nextAction: '催促对方确认最终报价',
    })
    await ensureDevTask({
      supplierName: '南京某燃烧器代理',
      stage: '内部评审',
      priority: '高',
      dueDate: dateFromMonday(4),
      currentProblem: '是否进入备用池需要老板判断',
      nextAction: '整理对比材料给老板确认',
      needBossDecision: true,
    })
    await ensureDevTask({
      supplierName: '广州某保温材料',
      stage: '销售/商务推广',
      priority: '中',
      dueDate: dateFromMonday(5),
      currentProblem: '需要销售反馈客户常用规格',
      nextAction: '请销售补充客户侧需求',
      needSalesSupport: true,
    })

    await ensurePurchaseTask({
      title: '7A演示-本周采购到货跟进',
      supplierName: '无锡某管件厂',
      stage: '供应商备货/发货',
      priority: '高',
      dueDate: dateFromMonday(3),
      currentProblem: '物流单号未同步',
      nextAction: '确认发货时间和物流信息',
    })
    await ensurePurchaseTask({
      title: '7A演示-超期采购发票跟进',
      supplierName: '杭州某阀门厂',
      stage: '发票开具',
      priority: '中',
      dueDate: daysAgo(3),
      currentProblem: '发票开具超期',
      nextAction: '联系供应商财务补开',
    })
    await ensurePurchaseTask({
      title: '7A演示-老板决策采购付款',
      supplierName: '常州某辅机制造',
      stage: '付款申请',
      priority: '高',
      dueDate: dateFromMonday(1),
      currentProblem: '预付款比例高于常规口径',
      nextAction: '提交老板确认付款安排',
      needBossDecision: true,
    })

    await ensureAdminTask({
      title: '7A演示-本周整理会议纪要',
      type: '会议',
      priority: '中',
      dueDate: dateFromMonday(2),
      status: '进行中',
      notes: '整理本周供应商会议纪要',
    })
    await ensureAdminTask({
      title: '7A演示-超期办公室物料补采',
      type: '办公采购',
      priority: '高',
      dueDate: daysAgo(1),
      status: '未开始',
      notes: '补采打印纸和文件夹',
    })
    await ensureAdminTask({
      title: '7A演示-已完成行政事项',
      type: '周报',
      priority: '低',
      dueDate: dateFromMonday(0),
      status: '已完成',
      notes: '用于验证默认待办不展示已完成事项',
    })
    await ensureAdminTask({
      title: '日历演示-无时间待办',
      type: '会议',
      priority: '中',
      dueDate: new Date(Date.UTC(2026, 4, 26)),
      status: '未开始',
      notes: '用于验证日历中仅日期事项展示',
      recurrenceType: 'none',
      isRecurring: false,
      isArchived: false,
    })
    await ensureAdminTask({
      title: '日历演示-带时间接待',
      type: '接待',
      priority: '高',
      dueDate: new Date(Date.UTC(2026, 4, 26)),
      startTime: '09:30',
      endTime: '10:30',
      status: '进行中',
      notes: '用于验证日历按时间展示接待事项',
      recurrenceType: 'none',
      isRecurring: false,
      isArchived: false,
    })
    await ensureAdminTask({
      title: '归档演示-已完成周报',
      type: '周报',
      priority: '低',
      dueDate: new Date(Date.UTC(2026, 4, 20)),
      status: '已完成',
      notes: '用于验证行政事项归档列表展示已完成周报',
      recurrenceType: 'weekly',
      isRecurring: true,
      isArchived: true,
      archivedAt: new Date(Date.UTC(2026, 4, 20)),
    })
  }

  console.log('Seed completed successfully.')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
