import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  parseCSV,
  parseBoolean,
  parseTaxRate,
  parseDateRequired,
  parseDecimal,
  parseInt,
  parseFileName,
  parseFileType,
  type RowError,
} from '@/lib/csv-utils'

// CSV 表头映射
const HEADER_MAP: Record<string, string> = {
  '报价单编号': 'quoteNumber',
  '报价单名称': 'title',
  '报价文件路径': 'filePath',
  '供应商名称': 'supplierName',
  '品类': 'categoryName',
  '报价日期': 'quoteDate',
  '报价阶段': 'quoteStage',
  '报价来源类型': 'sourceType',
  '对比规格标识 (compareKey)': 'compareKey',
  '对比规格标识': 'compareKey',
  'compareKey': 'compareKey',
  '产品名称': 'productName',
  '型号规格': 'model',
  '单位': 'unit',
  '报价': 'price',
  '是否含税': 'includesTax',
  '税率': 'taxRate',
  '是否含运费': 'includesFreight',
  '最小起订量': 'minOrderQty',
  '交期': 'deliveryTime',
  '付款条件': 'paymentTerms',
  '质保期': 'warranty',
  '价格备注': 'priceNotes',
}

const VALID_SOURCE_TYPES = new Set(['微信', '图片', 'PDF', 'Excel', '口头', '其他'])
const VALID_QUOTE_STAGES = new Set(['初次报价', '二次议价', '最终确认价', '量大优惠价'])

interface ParsedRow {
  quoteNumber: string | null
  title: string | null
  filePath: string | null
  supplierName: string
  categoryName: string
  quoteDate: Date
  quoteStage: string | null
  sourceType: string | null
  compareKey: string
  productName: string
  model: string | null
  unit: string | null
  price: number | null
  includesTax: boolean
  taxRate: number | null
  includesFreight: boolean
  minOrderQty: number | null
  deliveryTime: string | null
  paymentTerms: string | null
  warranty: string | null
  priceNotes: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const csvText = body.csvText as string

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'CSV 内容不能为空' }, { status: 400 })
    }

    const { headers, rows } = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV 不包含数据行' }, { status: 400 })
    }

    // 映射表头
    const fieldMap: Record<number, string> = {}
    for (let i = 0; i < headers.length; i++) {
      const mapped = HEADER_MAP[headers[i].trim()]
      if (mapped) fieldMap[i] = mapped
    }

    // ─── 阶段 1：完整校验所有行 ──────────────────────────
    const errors: RowError[] = []
    const parsedRows: ParsedRow[] = []

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri]
      const rowNum = ri + 2 // Excel 行号（1 是表头）
      const data: Record<string, string> = {}
      for (let ci = 0; ci < row.length; ci++) {
        if (fieldMap[ci]) data[fieldMap[ci]] = row[ci]
      }

      // 必填校验
      if (!data.supplierName?.trim()) {
        errors.push({ row: rowNum, field: '供应商名称', message: '供应商名称不能为空' })
      }
      if (!data.categoryName?.trim()) {
        errors.push({ row: rowNum, field: '品类', message: '品类不能为空' })
      }
      if (!data.productName?.trim()) {
        errors.push({ row: rowNum, field: '产品名称', message: '产品名称不能为空' })
      }

      // 日期
      const dateResult = parseDateRequired(data.quoteDate)
      if (!dateResult.ok) {
        errors.push({ row: rowNum, field: '报价日期', message: dateResult.error })
      }

      // 布尔值
      const includesTaxResult = data.includesTax?.trim()
        ? parseBoolean(data.includesTax)
        : { ok: true as const, value: false }
      if (!includesTaxResult.ok) {
        errors.push({ row: rowNum, field: '是否含税', message: includesTaxResult.error })
      }

      const includesFreightResult = data.includesFreight?.trim()
        ? parseBoolean(data.includesFreight)
        : { ok: true as const, value: false }
      if (!includesFreightResult.ok) {
        errors.push({ row: rowNum, field: '是否含运费', message: includesFreightResult.error })
      }

      // 税率
      const taxRateResult = parseTaxRate(data.taxRate)
      if (!taxRateResult.ok) {
        errors.push({ row: rowNum, field: '税率', message: taxRateResult.error })
      }

      // 报价金额
      const priceResult = parseDecimal(data.price)
      if (!priceResult.ok) {
        errors.push({ row: rowNum, field: '报价', message: priceResult.error })
      }

      // 最小起订量
      const moqResult = parseInt(data.minOrderQty)
      if (!moqResult.ok) {
        errors.push({ row: rowNum, field: '最小起订量', message: moqResult.error })
      }

      // 枚举校验
      if (data.sourceType?.trim() && !VALID_SOURCE_TYPES.has(data.sourceType.trim())) {
        errors.push({ row: rowNum, field: '报价来源类型', message: `无效值「${data.sourceType}」，可选：${[...VALID_SOURCE_TYPES].join('、')}` })
      }
      if (data.quoteStage?.trim() && !VALID_QUOTE_STAGES.has(data.quoteStage.trim())) {
        errors.push({ row: rowNum, field: '报价阶段', message: `无效值「${data.quoteStage}」，可选：${[...VALID_QUOTE_STAGES].join('、')}` })
      }

      // 如果该行没有错误，暂存已解析的行
      if (errors.filter(e => e.row === rowNum).length === 0) {
        parsedRows.push({
          quoteNumber: data.quoteNumber?.trim() || null,
          title: data.title?.trim() || null,
          filePath: data.filePath?.trim() || null,
          supplierName: data.supplierName.trim(),
          categoryName: data.categoryName.trim(),
          quoteDate: (dateResult as { ok: true; value: Date }).value,
          quoteStage: data.quoteStage?.trim() || null,
          sourceType: data.sourceType?.trim() || null,
          compareKey: data.compareKey?.trim() || data.productName.trim(),
          productName: data.productName.trim(),
          model: data.model?.trim() || null,
          unit: data.unit?.trim() || null,
          price: (priceResult as { ok: true; value: number | null }).value,
          includesTax: (includesTaxResult as { ok: true; value: boolean }).value,
          taxRate: (taxRateResult as { ok: true; value: number | null }).value,
          includesFreight: (includesFreightResult as { ok: true; value: boolean }).value,
          minOrderQty: (moqResult as { ok: true; value: number | null }).value,
          deliveryTime: data.deliveryTime?.trim() || null,
          paymentTerms: data.paymentTerms?.trim() || null,
          warranty: data.warranty?.trim() || null,
          priceNotes: data.priceNotes?.trim() || null,
        })
      }
    }

    // 如果有任何错误，全部失败
    if (errors.length > 0) {
      return NextResponse.json({
        error: '导入校验失败，请修正后重试',
        errors,
        totalRows: rows.length,
        errorCount: errors.length,
      }, { status: 400 })
    }

    // ─── 阶段 2：数据库校验（供应商、品类是否存在） ──────────
    const supplierNames = [...new Set(parsedRows.map(r => r.supplierName))]
    const categoryNames = [...new Set(parsedRows.map(r => r.categoryName))]

    const suppliers = await prisma.supplier.findMany({
      where: { name: { in: supplierNames }, isArchived: false },
      select: { id: true, name: true },
    })
    const supplierMap = new Map(suppliers.map(s => [s.name, s.id]))

    const categories = await prisma.category.findMany({
      where: { name: { in: categoryNames }, isArchived: false },
      select: { id: true, name: true },
    })
    const categoryMap = new Map(categories.map(c => [c.name, c.id]))

    // 检查不存在的供应商和品类
    for (let ri = 0; ri < parsedRows.length; ri++) {
      const row = parsedRows[ri]
      const rowNum = ri + 2
      if (!supplierMap.has(row.supplierName)) {
        errors.push({ row: rowNum, field: '供应商名称', message: `供应商「${row.supplierName}」不存在` })
      }
      if (!categoryMap.has(row.categoryName)) {
        errors.push({ row: rowNum, field: '品类', message: `品类「${row.categoryName}」不存在` })
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        error: '导入校验失败：存在不匹配的供应商或品类',
        errors,
        totalRows: rows.length,
        errorCount: errors.length,
      }, { status: 400 })
    }

    // ─── 阶段 3：在事务中写入数据 ──────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 按报价单分组
      const sheetGroups = new Map<string, ParsedRow[]>()
      for (const row of parsedRows) {
        let key: string
        if (row.quoteNumber) {
          key = `qn:${row.quoteNumber}`
        } else {
          const supplierId = supplierMap.get(row.supplierName)!
          const categoryId = categoryMap.get(row.categoryName)!
          const dateStr = row.quoteDate.toISOString().slice(0, 10)
          key = `auto:${supplierId}:${categoryId}:${dateStr}:${row.quoteStage || ''}`
        }
        if (!sheetGroups.has(key)) sheetGroups.set(key, [])
        sheetGroups.get(key)!.push(row)
      }

      let sheetsCreated = 0
      let itemsCreated = 0
      let attachmentsCreated = 0

      for (const [, groupRows] of sheetGroups) {
        const first = groupRows[0]
        const supplierId = supplierMap.get(first.supplierName)!
        const categoryId = categoryMap.get(first.categoryName)!

        // 查找或创建 QuoteSheet
        let quoteSheet = null
        if (first.quoteNumber) {
          quoteSheet = await tx.quoteSheet.findUnique({
            where: { quoteNumber: first.quoteNumber },
          })
        }

        if (!quoteSheet) {
          quoteSheet = await tx.quoteSheet.create({
            data: {
              quoteNumber: first.quoteNumber,
              title: first.title,
              supplierId,
              categoryId,
              quoteDate: first.quoteDate,
              sourceType: first.sourceType,
              quoteStage: first.quoteStage,
            },
          })
          sheetsCreated++
        }

        // 创建报价明细
        for (const row of groupRows) {
          await tx.quoteItem.create({
            data: {
              quoteSheetId: quoteSheet.id,
              supplierId,
              categoryId,
              compareKey: row.compareKey,
              productName: row.productName,
              model: row.model,
              unit: row.unit,
              price: row.price,
              includesTax: row.includesTax,
              taxRate: row.taxRate,
              includesFreight: row.includesFreight,
              minOrderQty: row.minOrderQty,
              deliveryTime: row.deliveryTime,
              paymentTerms: row.paymentTerms,
              warranty: row.warranty,
              priceNotes: row.priceNotes,
            },
          })
          itemsCreated++
        }

        // 处理附件：从分组中收集去重的 filePath
        const filePaths = new Set<string>()
        for (const row of groupRows) {
          if (row.filePath) filePaths.add(row.filePath)
        }
        for (const fp of filePaths) {
          // 检查是否已存在相同附件
          const existingAtt = await tx.attachment.findFirst({
            where: {
              relatedType: 'QuoteSheet',
              relatedId: quoteSheet.id,
              filePath: fp,
            },
          })
          if (!existingAtt) {
            await tx.attachment.create({
              data: {
                relatedType: 'QuoteSheet',
                relatedId: quoteSheet.id,
                filePath: fp,
                fileName: parseFileName(fp),
                fileType: parseFileType(fp),
                notes: 'CSV导入',
              },
            })
            attachmentsCreated++
          }
        }
      }

      return { sheetsCreated, itemsCreated, attachmentsCreated }
    })

    return NextResponse.json({
      success: true,
      message: `导入成功：${result.sheetsCreated} 张报价单，${result.itemsCreated} 条明细，${result.attachmentsCreated} 条附件`,
      ...result,
      totalRows: rows.length,
    })
  } catch (e) {
    console.error('CSV import error:', e)
    return NextResponse.json({ error: '导入失败：' + (e instanceof Error ? e.message : '未知错误') }, { status: 500 })
  }
}
