import type { CSVValue } from '@/lib/csv-utils'

export type CSVTemplateType = 'quote-items' | 'suppliers'

export interface CSVTemplate {
  type: CSVTemplateType
  title: string
  fileName: string
  description: string
  headers: string[]
  sampleRows: CSVValue[][]
  requiredFields: string[]
  notes: string[]
  supportedImport: boolean
}

const quoteItemsTemplate: CSVTemplate = {
  type: 'quote-items',
  title: '报价明细导入模板',
  fileName: 'quote_items_template.csv',
  description: '用于批量导入供应商报价单和报价明细。',
  headers: [
    '报价单编号',
    '报价单名称',
    '报价文件路径',
    '供应商名称',
    '品类',
    '报价日期',
    '报价阶段',
    '报价来源类型',
    '对比规格标识 (compareKey)',
    '产品名称',
    '型号规格',
    '单位',
    '报价',
    '是否含税',
    '税率',
    '是否含运费',
    '最小起订量',
    '交期',
    '付款条件',
    '质保期',
    '价格备注',
  ],
  sampleRows: [
    [
      'Q-2026-001',
      '杭州某阀门厂阀门报价',
      'files/quotes/hangzhou-valve-quote.pdf',
      '杭州某阀门厂',
      '阀门',
      '2026-05-01',
      '初次报价',
      'PDF',
      'DN50 截止阀',
      '截止阀',
      'DN50',
      '台',
      1280,
      '是',
      '13%',
      '否',
      1,
      '7天',
      '月结30天',
      '12个月',
      '示例行，导入前请替换为真实报价',
    ],
  ],
  requiredFields: ['供应商名称', '品类', '报价日期', '对比规格标识 (compareKey)', '产品名称', '报价'],
  notes: [
    '供应商名称和品类必须已在系统中存在。',
    '税率支持 13%、13、0.13 三种写法。',
    '是否含税、是否含运费只接受 是/否/true/false/yes/no/1/0。',
    '相同报价单编号会合并为同一张报价单；未填写编号时按供应商、品类、报价日期、报价阶段合并。',
  ],
  supportedImport: true,
}

const suppliersTemplate: CSVTemplate = {
  type: 'suppliers',
  title: '供应商导入模板',
  fileName: 'suppliers_template.csv',
  description: '用于批量导入供应商及其联系人。',
  headers: [
    '供应商名称',
    '主品类',
    '所在地区',
    '公司性质',
    '来源',
    '联系人姓名',
    '电话',
    '微信',
    '邮箱',
    '是否已报价',
    '是否已考察',
    '是否愿意入驻平台',
    '合作意愿',
    '资质情况',
    '交期能力',
    '售后能力',
    '账期条件',
    '价格水平',
    '推荐等级',
    '风险点',
    '备注',
    '下次跟进时间',
  ],
  sampleRows: [
    [
      '示例供应商',
      '阀门',
      '浙江杭州',
      '厂家',
      '展会',
      '张三',
      '13800000000',
      'wechat-id',
      'supplier@example.com',
      '是',
      '否',
      '未确认',
      '强',
      '资质齐全',
      '常规 7-10 天',
      '本地服务',
      '月结30天',
      '中',
      'B备选',
      '交期需复核',
      '示例行，仅供字段理解',
      '2026-05-20',
    ],
  ],
  requiredFields: ['供应商名称', '主品类'],
  notes: [
    '主品类必须是系统中已有且未归档的品类。',
    '供应商名称不能与已有未归档供应商重复，CSV 内部也不能重复。',
    '每行最多创建 1 个供应商和 0/1 个联系人。',
    '联系人姓名非空时才创建联系人记录。',
  ],
  supportedImport: true,
}

const templates: Record<CSVTemplateType, CSVTemplate> = {
  'quote-items': quoteItemsTemplate,
  suppliers: suppliersTemplate,
}

export function listCSVTemplates() {
  return Object.values(templates).map((template) => ({
    type: template.type,
    title: template.title,
    fileName: template.fileName,
    description: template.description,
    requiredFields: template.requiredFields,
    notes: template.notes,
    supportedImport: template.supportedImport,
  }))
}

export function getCSVTemplate(type: string | null) {
  if (!type || !(type in templates)) return null
  return templates[type as CSVTemplateType]
}

export function buildCSVTemplateRows(template: CSVTemplate): CSVValue[][] {
  return [template.headers, ...template.sampleRows]
}
