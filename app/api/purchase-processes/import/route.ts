import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCSV, parseDate, parseDecimal, type RowError } from '@/lib/csv-utils'
import { isValidEnum } from '@/lib/workflow-validation'
import { PURCHASE_STAGES, PRIORITIES, PURCHASE_STATUSES } from '@/lib/workflow-constants'

const SOURCE_TAG = '审批CSV导入'

const REQUIRED_HEADERS = ['所属项目', '支付对象']
const OPTIONAL_HEADERS = ['所属公司', '实际金额', '详细说明', '最后审批时间']

interface ImportBody {
  csvText: string
  defaultCategoryId?: string
  defaultOwnerId: string
  defaultRequesterId?: string
  defaultSalesPersonId?: string
  defaultPriority?: string
  defaultCurrentStage?: string
  defaultStatus?: string
}

interface ParsedRow {
  rowNumber: number
  companyName: string
  purchaseAmount: number | null
  title: string
  remark: string | null
  supplierName: string
  paymentRequestDate: Date | null
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

function simpleFailure(message: string, suggestion: string, status = 400) {
  return NextResponse.json({
    success: false,
    message,
    errorCount: 1,
    errors: [
      {
        row: 1,
        field: '文件',
        value: '',
        reason: message,
        suggestion,
      },
    ],
  }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportBody = await request.json()
    const {
      csvText,
      defaultCategoryId,
      defaultOwnerId,
      defaultRequesterId,
      defaultSalesPersonId,
      defaultPriority = '中',
      defaultCurrentStage = '付款申请',
      defaultStatus = '进行中',
    } = body

    // 校验必填参数
    if (!csvText || typeof csvText !== 'string') {
      return validationFailure('请提供 CSV 文本内容', [
        rowError(1, '文件', '', '请提供 CSV 文本内容', '请选择采购审批 CSV 文件后重试'),
      ])
    }
    // 品类可选（用于新建供应商时的默认品类）
    if (defaultCategoryId && typeof defaultCategoryId !== 'string') {
      return validationFailure('默认品类格式无效', [
        rowError(1, '默认品类', String(defaultCategoryId), '默认品类格式无效', '请重新选择默认品类'),
      ])
    }
    if (!defaultOwnerId || typeof defaultOwnerId !== 'string') {
      return validationFailure('请选择默认负责人', [
        rowError(1, '默认负责人', '', '请选择默认负责人', '请在导入弹窗中选择默认负责人'),
      ])
    }

    // 解析 CSV
    const { headers, rows } = parseCSV(csvText)
    if (headers.length === 0 || rows.length === 0) {
      return validationFailure('CSV 内容为空或缺少表头', [
        rowError(1, '表头', '', 'CSV 内容为空或缺少表头', '请使用最新采购审批导入模板'),
      ])
    }

    // 构建表头映射
    const headerIndex: Record<string, number> = {}
    headers.forEach((h, i) => { headerIndex[h] = i })

    // 校验必填表头。其余模板字段可缺列或留空。
    for (const h of REQUIRED_HEADERS) {
      if (!(h in headerIndex)) {
        return validationFailure(`CSV 缺少必填表头「${h}」`, [
          rowError(1, h, '', `CSV 缺少必填表头「${h}」`, `请在 CSV 表头中增加「${h}」列`),
        ])
      }
    }

    for (const h of OPTIONAL_HEADERS) {
      if (!(h in headerIndex)) headerIndex[h] = -1
    }

    // 校验默认值有效性（品类可选，不提供则在最终事务内使用/创建"未分类"）
    let validCategoryId = defaultCategoryId || ''
    if (defaultCategoryId) {
      const category = await prisma.category.findUnique({
        where: { id: defaultCategoryId },
        select: { isArchived: true },
      })
      if (!category) {
        return simpleFailure('默认品类不存在', '请重新选择默认品类')
      }
      if (category.isArchived) {
        return simpleFailure('默认品类已归档，请选择其他品类', '请重新选择未归档的品类')
      }
    }

    const owner = await prisma.person.findUnique({
      where: { id: defaultOwnerId },
      select: { isActive: true },
    })
    if (!owner || !owner.isActive) {
      return simpleFailure('默认负责人不存在或已停用', '请在导入弹窗中选择有效的默认负责人')
    }

    // 需求提交人可选，不提供则自动使用"默认提交人"
    let validRequesterId = defaultRequesterId || ''
    if (defaultRequesterId) {
      const requester = await prisma.person.findUnique({
        where: { id: defaultRequesterId },
        select: { isActive: true },
      })
      if (!requester || !requester.isActive) {
        return simpleFailure('默认需求提交人不存在或已停用', '请重新选择有效的默认需求提交人')
      }
    }

    let salesPerson = null
    if (defaultSalesPersonId) {
      salesPerson = await prisma.person.findUnique({
        where: { id: defaultSalesPersonId },
        select: { isActive: true },
      })
      if (!salesPerson || !salesPerson.isActive) {
        return simpleFailure('默认销售配合人不存在或已停用', '请重新选择有效的默认销售配合人')
      }
    }

    // 校验枚举值
    if (!isValidEnum(defaultPriority, PRIORITIES)) {
      return simpleFailure(`默认优先级无效，可选值：${PRIORITIES.join('、')}`, '请重新选择默认优先级')
    }
    if (!isValidEnum(defaultCurrentStage, PURCHASE_STAGES)) {
      return simpleFailure(`默认阶段无效，可选值：${PURCHASE_STAGES.join('、')}`, '请重新选择默认阶段')
    }
    if (!isValidEnum(defaultStatus, PURCHASE_STATUSES)) {
      return simpleFailure(`默认状态无效，可选值：${PURCHASE_STATUSES.join('、')}`, '请重新选择默认状态')
    }

    // 预加载所有活跃供应商名称
    const existingSuppliers = await prisma.supplier.findMany({
      where: { isArchived: false },
      select: { id: true, name: true },
    })
    const supplierNameToId = new Map<string, string>()
    for (const s of existingSuppliers) {
      supplierNameToId.set(s.name, s.id)
    }

    // 解析每行
    const errors: RowError[] = []
    const parsed: ParsedRow[] = []
    const csvSupplierNames = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2 // 从 2 开始（1 是表头）
      const raw: Record<string, string> = {}
      for (const [header, idx] of Object.entries(headerIndex)) {
        raw[header] = idx >= 0 ? rows[i][idx] ?? '' : ''
      }

      const companyName = (raw['所属公司'] ?? '').trim()
      const amountStr = (raw['实际金额'] ?? '').trim()
      const projectName = (raw['所属项目'] ?? '').trim()
      const remark = (raw['详细说明'] ?? '').trim() || null
      const supplierName = (raw['支付对象'] ?? '').trim()
      const paymentDateStr = (raw['最后审批时间'] ?? '').trim()

      let hasError = false

      // 校验：支付对象
      if (!supplierName) {
        errors.push({ row: rowNum, field: '支付对象', value: '', reason: '支付对象不能为空', suggestion: '请填写支付对象名称' })
        hasError = true
      }

      // 校验：所属项目
      if (!projectName) {
        errors.push({ row: rowNum, field: '所属项目', value: '', reason: '所属项目不能为空', suggestion: '请填写所属项目名称' })
        hasError = true
      }

      // 校验：实际金额
      if (amountStr) {
        const amountResult = parseDecimal(amountStr)
        if (!amountResult.ok) {
          errors.push({ row: rowNum, field: '实际金额', value: amountStr, reason: '实际金额必须为非负数字', suggestion: '请填写有效的金额数值' })
          hasError = true
        } else if (amountResult.value != null && amountResult.value < 0) {
          errors.push({ row: rowNum, field: '实际金额', value: amountStr, reason: '实际金额必须为非负数字', suggestion: '请填写有效的金额数值' })
          hasError = true
        }
      }

      // 校验：最后审批时间
      if (paymentDateStr) {
        const dateResult = parseDate(paymentDateStr)
        if (!dateResult.ok) {
          errors.push({ row: rowNum, field: '最后审批时间', value: paymentDateStr, reason: dateResult.error, suggestion: '请使用 YYYY-MM-DD 格式' })
          hasError = true
        }
      }

      if (hasError) continue

      // CSV 内去重（同一文件内同名供应商只创建一次）
      if (csvSupplierNames.has(supplierName)) {
        // 重复但不报错，只是后面复用
      } else {
        csvSupplierNames.add(supplierName)
      }

      const amountResult = amountStr ? parseDecimal(amountStr) : { ok: true as const, value: null }
      const amountNum = amountResult.ok ? amountResult.value : null
      const dateResult = paymentDateStr ? parseDate(paymentDateStr) : { ok: true as const, value: null }
      const paymentDate = dateResult.ok ? dateResult.value : null

      parsed.push({
        rowNumber: rowNum,
        companyName,
        purchaseAmount: amountNum,
        title: `${projectName} - ${supplierName}`,
        remark,
        supplierName,
        paymentRequestDate: paymentDate,
      })
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `导入失败，共 ${errors.length} 条错误`,
        errorCount: errors.length,
        errors: errors.map((e) => ({
          row: e.row,
          field: e.field,
          value: e.value ?? '',
          reason: e.reason ?? '',
          suggestion: e.suggestion ?? '',
        })),
      }, { status: 422 })
    }

    // 事务写入
    const createdItems: Array<{ id: string; title: string }> = []
    const createdSuppliers: Array<{ id: string; name: string }> = []

    await prisma.$transaction(async (tx) => {
      if (!validCategoryId) {
        let fallback = await tx.category.findFirst({
          where: { name: '未分类', isArchived: false },
          select: { id: true },
        })
        if (!fallback) {
          fallback = await tx.category.create({
            data: { name: '未分类' },
            select: { id: true },
          })
        }
        validCategoryId = fallback.id
      }

      if (!validRequesterId) {
        let fallback = await tx.person.findFirst({
          where: { name: '默认提交人', isActive: true },
          select: { id: true },
        })
        if (!fallback) {
          fallback = await tx.person.create({
            data: { name: '默认提交人', isActive: true },
            select: { id: true },
          })
        }
        validRequesterId = fallback.id
      }

      // 先行创建需要新建的供应商（在 CSV 内去重后）
      const suppliersToCreate: string[] = []
      for (const supplierName of csvSupplierNames) {
        const existingId = supplierNameToId.get(supplierName)
        if (!existingId) {
          suppliersToCreate.push(supplierName)
        }
      }

      // 创建不存在的供应商
      for (const supplierName of suppliersToCreate) {
        const newSupplier = await tx.supplier.create({
          data: {
            name: supplierName,
            categoryId: validCategoryId,
            source: SOURCE_TAG,
          },
        })
        supplierNameToId.set(supplierName, newSupplier.id)
        createdSuppliers.push({ id: newSupplier.id, name: newSupplier.name })
      }

      // 创建采购事项
      for (const p of parsed) {
        const supplierId = supplierNameToId.get(p.supplierName)!
        const item = await tx.purchaseExecutionProcess.create({
          data: {
            title: p.title,
            supplierId,
            categoryId: validCategoryId,
            requesterId: validRequesterId,
            ownerId: defaultOwnerId,
            salesPersonId: defaultSalesPersonId || null,
            currentStage: defaultCurrentStage,
            priority: defaultPriority,
            needPaymentRequest: true,
            purchaseAmount: p.purchaseAmount != null ? p.purchaseAmount : undefined,
            paymentRequestDate: p.paymentRequestDate,
            status: defaultStatus,
            remark: p.remark || undefined,
            companyName: p.companyName,
          },
        })
        createdItems.push({ id: item.id, title: item.title })
      }
    })

    return NextResponse.json({
      success: true,
      message: `成功导入 ${createdItems.length} 条采购事项`,
      count: createdItems.length,
      createdItems,
      createdSuppliers,
    })
  } catch (error) {
    console.error('Purchase import error:', error)
    return NextResponse.json({
      success: false,
      message: '采购导入失败',
      errorCount: 1,
      errors: [
        {
          row: 1,
          field: '文件',
          value: '',
          reason: '采购导入失败',
          suggestion: '请稍后重试，或检查导入配置是否正确',
        },
      ],
    }, { status: 500 })
  }
}
