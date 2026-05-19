import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  parseCSV,
  parseBooleanOptional,
  parseDate,
  type RowError,
} from '@/lib/csv-utils'

const MAX_TEXT_LENGTH = 100
const VALID_COOPERATION = new Set(['强', '一般', '弱', '未确认'])
const VALID_PRICE_LEVELS = new Set(['高', '中', '低', '未知'])
const VALID_RECOMMENDED = new Set(['A优先推荐', 'B备选', 'C暂不推荐', '未评级'])
const CATEGORY_HEADERS = ['品类', '主品类']
const AUTO_CREATED_CATEGORY_NOTE = '供应商CSV导入自动创建'

interface ParsedSupplierRow {
  rowNumber: number
  name: string
  categoryName: string
  region: string | null
  companyType: string | null
  source: string | null
  hasQuoted: boolean | null
  hasVisited: boolean | null
  willingToJoin: boolean | null
  cooperationWillingness: string | null
  qualification: string | null
  deliveryAbility: string | null
  afterSalesAbility: string | null
  paymentTerms: string | null
  priceLevel: string | null
  recommendedLevel: string | null
  riskSummary: string | null
  notes: string | null
  nextFollowUpDate: Date | null
  // contact fields
  contactName: string | null
  phone: string | null
  wechat: string | null
  email: string | null
}

function rowError(row: number, field: string, value: string | undefined, reason: string, suggestion: string): RowError {
  return { row, field, value: value ?? '', reason, suggestion, message: reason }
}

function validationFailure(message: string, errors: RowError[], status = 400) {
  return NextResponse.json({
    success: false,
    message,
    error: message,
    errorCount: errors.length,
    errors,
  }, { status })
}

function parseRow(
  raw: Record<string, string>,
  rowNumber: number,
  csvInternalNames: Set<string>,
  errors: RowError[]
): ParsedSupplierRow | null {
  const name = (raw['供应商名称'] ?? '').trim()
  const categoryName = CATEGORY_HEADERS.map(header => raw[header]).find(value => value?.trim())?.trim() ?? ''
  const region = (raw['所在地区'] ?? '').trim() || null
  const companyType = (raw['公司性质'] ?? '').trim() || null
  const source = (raw['来源'] ?? '').trim() || null
  const contactName = (raw['联系人姓名'] ?? '').trim() || null
  const phone = (raw['电话'] ?? '').trim() || null
  const wechat = (raw['微信'] ?? '').trim() || null
  const email = (raw['邮箱'] ?? '').trim() || null
  const hasQuotedRaw = (raw['是否已报价'] ?? '').trim() || null
  const hasVisitedRaw = (raw['是否已考察'] ?? '').trim() || null
  const willingToJoinRaw = (raw['是否愿意入驻平台'] ?? '').trim() || null
  const cooperationWillingness = (raw['合作意愿'] ?? '').trim() || null
  const qualification = (raw['资质情况'] ?? '').trim() || null
  const deliveryAbility = (raw['交期能力'] ?? '').trim() || null
  const afterSalesAbility = (raw['售后能力'] ?? '').trim() || null
  const paymentTerms = (raw['账期条件'] ?? '').trim() || null
  const priceLevel = (raw['价格水平'] ?? '').trim() || null
  const recommendedLevel = (raw['推荐等级'] ?? '').trim() || null
  const riskSummary = (raw['风险点'] ?? '').trim() || null
  const notes = (raw['备注'] ?? '').trim() || null
  const nextFollowUpDateRaw = (raw['下次跟进时间'] ?? '').trim() || null

  let hasError = false

  // 供应商名称
  if (!name) {
    errors.push({ row: rowNumber, field: '供应商名称', value: raw['供应商名称'] ?? '', reason: '供应商名称不能为空', suggestion: '请填写供应商名称' })
    hasError = true
  } else if (csvInternalNames.has(name)) {
    errors.push({ row: rowNumber, field: '供应商名称', value: name, reason: 'CSV 中存在重复的供应商名称', suggestion: '请确保每个供应商名称在本次导入中唯一' })
    hasError = true
  }

  // 主品类
  if (!categoryName) {
    errors.push({ row: rowNumber, field: '品类', value: '', reason: '品类不能为空', suggestion: '请填写供应商所属品类' })
    hasError = true
  }

  // 公司性质
  if (companyType && companyType.length > MAX_TEXT_LENGTH) {
    errors.push({ row: rowNumber, field: '公司性质', value: companyType, reason: `公司性质不能超过 ${MAX_TEXT_LENGTH} 个字符`, suggestion: '请缩短内容或留空' })
    hasError = true
  }

  // 来源
  if (source && source.length > MAX_TEXT_LENGTH) {
    errors.push({ row: rowNumber, field: '来源', value: source, reason: `来源不能超过 ${MAX_TEXT_LENGTH} 个字符`, suggestion: '请缩短内容或留空' })
    hasError = true
  }

  // 布尔值
  const bHasQuoted = parseBooleanOptional(hasQuotedRaw)
  if (!bHasQuoted.ok) { errors.push({ row: rowNumber, field: '是否已报价', value: hasQuotedRaw ?? '', reason: bHasQuoted.error, suggestion: '请填写是/否/true/false 或留空' }); hasError = true }

  const bHasVisited = parseBooleanOptional(hasVisitedRaw)
  if (!bHasVisited.ok) { errors.push({ row: rowNumber, field: '是否已考察', value: hasVisitedRaw ?? '', reason: bHasVisited.error, suggestion: '请填写是/否/true/false 或留空' }); hasError = true }

  const bWillingToJoin = parseBooleanOptional(willingToJoinRaw)
  if (!bWillingToJoin.ok) { errors.push({ row: rowNumber, field: '是否愿意入驻平台', value: willingToJoinRaw ?? '', reason: bWillingToJoin.error, suggestion: '请填写是/否/true/false 或留空' }); hasError = true }

  // 合作意愿
  if (cooperationWillingness && !VALID_COOPERATION.has(cooperationWillingness)) {
    errors.push({ row: rowNumber, field: '合作意愿', value: cooperationWillingness, reason: `合作意愿必须为：${Array.from(VALID_COOPERATION).join('、')}`, suggestion: '请修改为有效值或留空' })
    hasError = true
  }

  // 价格水平
  if (priceLevel && !VALID_PRICE_LEVELS.has(priceLevel)) {
    errors.push({ row: rowNumber, field: '价格水平', value: priceLevel, reason: `价格水平必须为：${Array.from(VALID_PRICE_LEVELS).join('、')}`, suggestion: '请修改为有效值或留空' })
    hasError = true
  }

  // 推荐等级
  if (recommendedLevel && !VALID_RECOMMENDED.has(recommendedLevel)) {
    errors.push({ row: rowNumber, field: '推荐等级', value: recommendedLevel, reason: `推荐等级必须为：${Array.from(VALID_RECOMMENDED).join('、')}`, suggestion: '请修改为有效值或留空' })
    hasError = true
  }

  // 下次跟进时间
  const dateResult = parseDate(nextFollowUpDateRaw)
  if (!dateResult.ok) {
    errors.push({ row: rowNumber, field: '下次跟进时间', value: nextFollowUpDateRaw ?? '', reason: dateResult.error, suggestion: '请使用 YYYY-MM-DD 格式或留空' })
    hasError = true
  }

  // 联系人校验
  const hasContactName = !!contactName
  const hasContactInfo = !!(phone || wechat || email)
  if (!hasContactName && hasContactInfo) {
    errors.push({ row: rowNumber, field: '联系人姓名', value: contactName ?? '', reason: '联系人姓名为空，但电话/微信/邮箱已填写', suggestion: '请填写联系人姓名，或将电话/微信/邮箱留空' })
    hasError = true
  }

  if (hasError) return null

  if (name) csvInternalNames.add(name)

  return {
    rowNumber,
    name,
    categoryName,
    region,
    companyType,
    source,
    hasQuoted: bHasQuoted.ok ? bHasQuoted.value : null,
    hasVisited: bHasVisited.ok ? bHasVisited.value : null,
    willingToJoin: bWillingToJoin.ok ? bWillingToJoin.value : null,
    cooperationWillingness: cooperationWillingness || null,
    qualification,
    deliveryAbility,
    afterSalesAbility,
    paymentTerms,
    priceLevel: priceLevel || null,
    recommendedLevel: recommendedLevel || null,
    riskSummary,
    notes,
    nextFollowUpDate: dateResult.ok ? dateResult.value : null,
    contactName,
    phone,
    wechat,
    email,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const csvText = body.csvText

    if (!csvText || typeof csvText !== 'string') {
      return validationFailure('请提供 CSV 文本内容', [
        rowError(1, '文件', '', '请提供 CSV 文本内容', '请选择供应商 CSV 文件后重试'),
      ])
    }

    const { headers, rows } = parseCSV(csvText)
    if (headers.length === 0 || rows.length === 0) {
      return validationFailure('CSV 内容为空或缺少表头', [
        rowError(1, '表头', '', 'CSV 内容为空或缺少表头', '请使用最新供应商导入模板'),
      ])
    }

    // 构建表头映射
    const headerIndex: Record<string, number> = {}
    headers.forEach((h, i) => { headerIndex[h] = i })

    if (!('供应商名称' in headerIndex)) {
      return validationFailure('CSV 缺少必填表头「供应商名称」', [
        rowError(1, '供应商名称', '', 'CSV 缺少必填表头「供应商名称」', '请在 CSV 表头中增加「供应商名称」列'),
      ])
    }
    if (!CATEGORY_HEADERS.some(header => header in headerIndex)) {
      return validationFailure('CSV 缺少必填表头「品类」', [
        rowError(1, '品类', '', 'CSV 缺少必填表头「品类」', '请在 CSV 表头中增加「品类」列'),
      ])
    }

    // 预加载所有活跃品类
    const allCategories = await prisma.category.findMany({
      where: { isArchived: false },
      select: { id: true, name: true },
    })
    const categoryMap = new Map<string, string>()
    for (const c of allCategories) {
      categoryMap.set(c.name, c.id)
    }

    // 预加载所有活跃供应商名称
    const existingSuppliers = await prisma.supplier.findMany({
      where: { isArchived: false },
      select: { name: true },
    })
    const existingNames = new Set(existingSuppliers.map((s) => s.name))

    // 解析并校验每一行
    const errors: RowError[] = []
    const parsed: ParsedSupplierRow[] = []
    const csvInternalNames = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const raw: Record<string, string> = {}
      for (const [header, idx] of Object.entries(headerIndex)) {
        raw[header] = rows[i][idx] ?? ''
      }
      const result = parseRow(raw, i + 2, csvInternalNames, errors)
      if (result) {
        // 检查系统已有同名供应商
        if (existingNames.has(result.name)) {
          errors.push({
            row: i + 2,
            field: '供应商名称',
            value: result.name,
            reason: `供应商「${result.name}」已存在`,
            suggestion: '请修改供应商名称，或手动归档已有供应商后再导入',
          })
        } else {
          parsed.push(result)
        }
      }
    }

    if (errors.length > 0) {
      const errorJSON = {
        success: false,
        message: `供应商导入失败，共 ${errors.length} 条错误`,
        errorCount: errors.length,
        errors: errors.map((e) => ({
          row: e.row,
          field: e.field,
          value: e.value ?? '',
          reason: e.reason ?? '',
          suggestion: e.suggestion ?? '',
        })),
      }
      return NextResponse.json(errorJSON, { status: 422 })
    }

    // 事务写入
    const created: Array<{ supplierId: string; supplierName: string; contactId?: string }> = []

    await prisma.$transaction(async (tx) => {
      for (const p of parsed) {
        let categoryId = categoryMap.get(p.categoryName)
        if (!categoryId) {
          const category = await tx.category.create({
            data: {
              name: p.categoryName,
              notes: AUTO_CREATED_CATEGORY_NOTE,
            },
            select: { id: true, name: true },
          })
          categoryId = category.id
          categoryMap.set(category.name, category.id)
        }

        const supplier = await tx.supplier.create({
          data: {
            name: p.name,
            categoryId,
            region: p.region ?? undefined,
            companyType: p.companyType ?? undefined,
            source: p.source ?? undefined,
            hasQuoted: p.hasQuoted ?? false,
            hasVisited: p.hasVisited ?? false,
            willingToJoin: p.willingToJoin ?? false,
            cooperationWillingness: p.cooperationWillingness ?? undefined,
            qualification: p.qualification ?? undefined,
            deliveryAbility: p.deliveryAbility ?? undefined,
            afterSalesAbility: p.afterSalesAbility ?? undefined,
            paymentTerms: p.paymentTerms ?? undefined,
            priceLevel: p.priceLevel ?? undefined,
            recommendedLevel: p.recommendedLevel ?? undefined,
            riskSummary: p.riskSummary ?? undefined,
            notes: p.notes ?? undefined,
            nextFollowUpDate: p.nextFollowUpDate ?? undefined,
          },
        })

        let contactId: string | undefined

        if (p.contactName) {
          const contact = await tx.supplierContact.create({
            data: {
              supplierId: supplier.id,
              name: p.contactName,
              phone: p.phone ?? undefined,
              wechat: p.wechat ?? undefined,
              email: p.email ?? undefined,
            },
          })
          contactId = contact.id
        }

        created.push({ supplierId: supplier.id, supplierName: supplier.name, contactId })
      }
    })

    return NextResponse.json({
      success: true,
      message: `成功导入 ${created.length} 家供应商`,
      count: created.length,
      suppliers: created,
    })
  } catch {
    return validationFailure('供应商导入失败', [
      rowError(1, '文件', '', '供应商导入失败', '请稍后重试，或检查 CSV 文件内容是否符合模板'),
    ], 500)
  }
}
