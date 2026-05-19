export const DEVELOPMENT_STAGES = [
  '线索收集',
  '初步沟通',
  '资料收集',
  '报价获取',
  '评分评估',
  '线上/实地考察',
  '内部评审',
  '推荐入库',
  '销售/商务推广',
  '持续观察',
  '暂停/淘汰',
] as const;

export const PURCHASE_STAGES = [
  '需求确认',
  '参数确认',
  '报价确认',
  '合同签订',
  '付款申请',
  '供应商备货/发货',
  '到货验收',
  '安装/使用反馈',
  '发票开具',
  '预付款抵充',
  '完成归档',
  '暂停/异常',
] as const;

export const PRIORITIES = ['高', '中', '低'] as const;

export const DEVELOPMENT_STATUSES = ['进行中', '已完成', '暂停', '淘汰'] as const;

export const PURCHASE_STATUSES = ['进行中', '已完成', '暂停', '异常'] as const;

// 供应商常用标签（可选点选，也可自定义输入）
export const COMMON_COMPANY_TYPES = ['厂家', '代理商', '经销商', '服务商', '安装公司', '其他'] as const;
export const COMMON_SOURCES = ['展会', '网络', '老板推荐', '销售推荐', '供应商转介绍', '其他'] as const;

// Types
export type DevelopmentStage = typeof DEVELOPMENT_STAGES[number];
export type PurchaseStage = typeof PURCHASE_STAGES[number];
export type Priority = typeof PRIORITIES[number];
export type DevelopmentStatus = typeof DEVELOPMENT_STATUSES[number];
export type PurchaseStatus = typeof PURCHASE_STATUSES[number];
