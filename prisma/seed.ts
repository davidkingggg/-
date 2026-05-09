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

  console.log('Seed completed successfully.')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
