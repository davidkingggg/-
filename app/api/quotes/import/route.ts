import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'
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
  '备注': 'priceNotes',
}

const AUTO_CREATED_SUPPLIER_SOURCE = '报价CSV导入'
const AUTO_CREATED_CATEGORY_NOTE = '报价CSV导入自动创建'
const VALID_SOURCE_TYPES = new Set(['微信', '图片', 'PDF', 'Excel', '口头', '其他'])
const VALID_QUOTE_STAGES = new Set(['初次报价', '二次议价', '最终确认价', '量大优惠价'])

interface ParsedRow {
  rowNumber: number
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

const REQUIRED_FIELDS = [
  { field: 'supplierName', label: '供应商名称', suggestion: '请填写供应商名称；系统中不存在时会自动新建。' },
  { field: 'categoryName', label: '品类', suggestion: '请填写品类名称；系统中不存在时会自动新建。' },
  { field: 'quoteDate', label: '报价日期', suggestion: '请使用 YYYY-MM-DD 格式，例如 2026-05-01。' },
  { field: 'productName', label: '产品名称', suggestion: '请填写产品名称。' },
  { field: 'price', label: '报价', suggestion: '请填写数字格式的报价金额。' },
]

function rowError(row: number, field: string, value: string | undefined, reason: string, suggestion: string): RowError {
  return {
    row,
    field,
    value: value ?? '',
    reason,
    suggestion,
    message: reason,
  }
}

function validationFailure(message: string, errors: RowError[], totalRows: number, status = 400) {
  return NextResponse.json({
    success: false,
    message,
    error: message,
    errors,
    totalRows,
    errorCount: errors.length,
  }, { status })
}

function formatQuoteDateKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

function checkQuoteNumberConsistency(rows: ParsedRow[]) {
  const errors: RowError[] = []
  const groupedRows = new Map<string, ParsedRow[]>()

  for (const row of rows) {
    if (!row.quoteNumber) continue
    if (!groupedRows.has(row.quoteNumber)) groupedRows.set(row.quoteNumber, [])
    groupedRows.get(row.quoteNumber)!.push(row)
  }

  for (const [quoteNumber, groupRows] of groupedRows) {
    const first = groupRows[0]
    const baseline = {
      supplierName: first.supplierName,
      categoryName: first.categoryName,
      quoteDate: formatQuoteDateKey(first.quoteDate),
      quoteStage: first.quoteStage || '',
      sourceType: first.sourceType || '',
    }

    for (const row of groupRows.slice(1)) {
      const comparisons: Array<{
        field: string
        label: string
        value: string
        baselineValue: string
        suggestion: string
      }> = [
        {
          field: '供应商名称',
          label: '供应商名称',
          value: row.supplierName,
          baselineValue: baseline.supplierName,
          suggestion: '请把同一报价单编号下的供应商名称统一；如果确实属于不同供应商，请拆分为不同报价单编号。',
        },
        {
          field: '品类',
          label: '品类',
          value: row.categoryName,
          baselineValue: baseline.categoryName,
          suggestion: '请把同一报价单编号下的品类统一；如果确实属于不同品类，请拆分为不同报价单编号。',
        },
        {
          field: '报价日期',
          label: '报价日期',
          value: formatQuoteDateKey(row.quoteDate),
          baselineValue: baseline.quoteDate,
          suggestion: '请把同一报价单编号下的报价日期统一；如果确实是不同日期，请拆分为不同报价单编号。',
        },
        {
          field: '报价阶段',
          label: '报价阶段',
          value: row.quoteStage || '',
          baselineValue: baseline.quoteStage,
          suggestion: '请把同一报价单编号下的报价阶段统一；如果确实是不同阶段，请拆分为不同报价单编号。',
        },
        {
          field: '报价来源类型',
          label: '报价来源类型',
          value: row.sourceType || '',
          baselineValue: baseline.sourceType,
          suggestion: '请把同一报价单编号下的报价来源类型统一；如果确实是不同来源，请拆分为不同报价单编号。',
        },
      ]

      for (const comparison of comparisons) {
        if (comparison.value !== comparison.baselineValue) {
          errors.push(rowError(
            row.rowNumber,
            comparison.field,
            comparison.value,
            `报价单编号「${quoteNumber}」下的${comparison.label}不一致`,
            comparison.suggestion,
          ))
        }
      }
    }
  }

  return errors
}

export async function POST(request: Request) {
  try {
    await requireUser()
    const body = await request.json()
    const csvText = body.csvText as string

    if (!csvText || !csvText.trim()) {
      return validationFailure('CSV 内容不能为空', [
        rowError(1, '文件', '', 'CSV 内容不能为空', '请先下载报价明细模板，并填写至少一行报价数据。'),
      ], 0)
    }

    const { headers, rows } = parseCSV(csvText)

    if (headers.length === 0) {
      return validationFailure('CSV 不包含表头', [
        rowError(1, '表头', '', 'CSV 不包含表头', '请使用系统提供的报价明细导入模板。'),
      ], 0)
    }

    if (rows.length === 0) {
      return validationFailure('CSV 不包含数据行', [
        rowError(2, '数据行', '', 'CSV 不包含数据行', '请在表头下方填写至少一行报价数据。'),
      ], 0)
    }

    // 映射表头
    const fieldMap: Record<number, string> = {}
    for (let i = 0; i < headers.length; i++) {
      const mapped = HEADER_MAP[headers[i].trim()]
      if (mapped) fieldMap[i] = mapped
    }

    const mappedFields = new Set(Object.values(fieldMap))
    const missingHeaders = REQUIRED_FIELDS.filter((item) => !mappedFields.has(item.field))
    if (missingHeaders.length > 0) {
      const errors = missingHeaders.map((item) =>
        rowError(1, item.label, '', `缺少必需表头「${item.label}」`, `请在 CSV 表头中增加「${item.label}」列。`),
      )
      return validationFailure('CSV 表头缺少必需字段，请使用最新模板。', errors, rows.length)
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
        errors.push(rowError(rowNum, '供应商名称', data.supplierName, '供应商名称不能为空', '请填写供应商名称；系统中不存在时会自动新建。'))
      }
      if (!data.categoryName?.trim()) {
        errors.push(rowError(rowNum, '品类', data.categoryName, '品类不能为空', '请填写品类名称；系统中不存在时会自动新建。'))
      }
      // compareKey 可选，如未提供则使用品类+产品名称作为默认值
      if (!data.compareKey?.trim()) {
        data.compareKey = `${data.categoryName} ${data.productName}`
      }
      if (!data.productName?.trim()) {
        errors.push(rowError(rowNum, '产品名称', data.productName, '产品名称不能为空', '请填写产品名称。'))
      }
      if (!data.price?.trim()) {
        errors.push(rowError(rowNum, '报价', data.price, '报价不能为空', '请填写数字格式的报价金额。'))
      }

      // 日期
      const dateResult = parseDateRequired(data.quoteDate)
      if (!dateResult.ok) {
        errors.push(rowError(rowNum, '报价日期', data.quoteDate, dateResult.error, '请使用 YYYY-MM-DD 格式，例如 2026-05-01。'))
      }

      // 布尔值
      const includesTaxResult = data.includesTax?.trim()
        ? parseBoolean(data.includesTax)
        : { ok: true as const, value: false }
      if (!includesTaxResult.ok) {
        errors.push(rowError(rowNum, '是否含税', data.includesTax, includesTaxResult.error, '请填写 是/否/true/false/yes/no/1/0。'))
      }

      const includesFreightResult = data.includesFreight?.trim()
        ? parseBoolean(data.includesFreight)
        : { ok: true as const, value: false }
      if (!includesFreightResult.ok) {
        errors.push(rowError(rowNum, '是否含运费', data.includesFreight, includesFreightResult.error, '请填写 是/否/true/false/yes/no/1/0。'))
      }

      // 税率
      const taxRateResult = parseTaxRate(data.taxRate)
      if (!taxRateResult.ok) {
        errors.push(rowError(rowNum, '税率', data.taxRate, taxRateResult.error, '请填写 13%、13、0.13，或留空。'))
      }

      // 报价金额
      const priceResult = parseDecimal(data.price)
      if (!priceResult.ok) {
        errors.push(rowError(rowNum, '报价', data.price, priceResult.error, '请填写数字格式的报价金额，例如 1280 或 1280.50。'))
      }

      // 最小起订量
      const moqResult = parseInt(data.minOrderQty)
      if (!moqResult.ok) {
        errors.push(rowError(rowNum, '最小起订量', data.minOrderQty, moqResult.error, '请填写整数，或留空。'))
      }

      // 枚举校验
      if (data.sourceType?.trim() && !VALID_SOURCE_TYPES.has(data.sourceType.trim())) {
        errors.push(rowError(rowNum, '报价来源类型', data.sourceType, `无效值「${data.sourceType}」`, `可选值：${[...VALID_SOURCE_TYPES].join('、')}。`))
      }
      if (data.quoteStage?.trim() && !VALID_QUOTE_STAGES.has(data.quoteStage.trim())) {
        errors.push(rowError(rowNum, '报价阶段', data.quoteStage, `无效值「${data.quoteStage}」`, `可选值：${[...VALID_QUOTE_STAGES].join('、')}。`))
      }

      // 如果该行没有错误，暂存已解析的行
      if (errors.filter(e => e.row === rowNum).length === 0) {
        parsedRows.push({
          rowNumber: rowNum,
          quoteNumber: data.quoteNumber?.trim() || null,
          title: data.title?.trim() || null,
          filePath: data.filePath?.trim() || null,
          supplierName: data.supplierName.trim(),
          categoryName: data.categoryName.trim(),
          quoteDate: (dateResult as { ok: true; value: Date }).value,
          quoteStage: data.quoteStage?.trim() || null,
          sourceType: data.sourceType?.trim() || null,
          compareKey: data.compareKey.trim(),
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

    const quoteNumberConsistencyErrors = checkQuoteNumberConsistency(parsedRows)
    if (quoteNumberConsistencyErrors.length > 0) {
      errors.push(...quoteNumberConsistencyErrors)
    }

    // 如果有任何错误，全部失败
    if (errors.length > 0) {
      return validationFailure('导入校验失败，请修正后重试。本次导入未写入任何数据。', errors, rows.length)
    }

    // ─── 阶段 2：数据库校验（供应商和品类不存在则稍后在事务内自动创建） ──────────
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

    const quoteNumbers = [...new Set(parsedRows.map((row) => row.quoteNumber).filter((value): value is string => Boolean(value)))]
    const existingQuoteSheets = quoteNumbers.length > 0
      ? await prisma.quoteSheet.findMany({
        where: { quoteNumber: { in: quoteNumbers } },
        include: {
          supplier: { select: { name: true } },
          category: { select: { name: true } },
        },
      })
      : []
    const quoteSheetMap = new Map(existingQuoteSheets.map((sheet) => [sheet.quoteNumber || '', sheet]))

    for (const [quoteNumber, groupRows] of (() => {
      const map = new Map<string, ParsedRow[]>()
      for (const row of parsedRows) {
        if (!row.quoteNumber) continue
        if (!map.has(row.quoteNumber)) map.set(row.quoteNumber, [])
        map.get(row.quoteNumber)!.push(row)
      }
      return map
    })()) {
      const sheet = quoteSheetMap.get(quoteNumber)
      if (!sheet) continue
      const first = groupRows[0]
      const mismatches: Array<{ field: string; value: string; reason: string; suggestion: string }> = []
      if (sheet.supplier.name !== first.supplierName) {
        mismatches.push({
          field: '供应商名称',
          value: first.supplierName,
          reason: `报价单编号「${quoteNumber}」已存在于系统中，但对应的供应商名称不一致`,
          suggestion: `请将 CSV 中报价单编号「${quoteNumber}」对应的供应商名称修改为「${sheet.supplier.name}」，或更换一个新的报价单编号。`,
        })
      }
      if (sheet.category.name !== first.categoryName) {
        mismatches.push({
          field: '品类',
          value: first.categoryName,
          reason: `报价单编号「${quoteNumber}」已存在于系统中，但对应的品类不一致`,
          suggestion: `请将 CSV 中报价单编号「${quoteNumber}」对应的品类修改为「${sheet.category.name}」，或更换一个新的报价单编号。`,
        })
      }
      if (formatQuoteDateKey(sheet.quoteDate) !== formatQuoteDateKey(first.quoteDate)) {
        mismatches.push({
          field: '报价日期',
          value: formatQuoteDateKey(first.quoteDate),
          reason: `报价单编号「${quoteNumber}」已存在于系统中，但对应的报价日期不一致`,
          suggestion: `请将 CSV 中报价单编号「${quoteNumber}」对应的报价日期修改为「${formatQuoteDateKey(sheet.quoteDate)}」，或更换一个新的报价单编号。`,
        })
      }
      if ((sheet.quoteStage || '') !== (first.quoteStage || '')) {
        mismatches.push({
          field: '报价阶段',
          value: first.quoteStage || '',
          reason: `报价单编号「${quoteNumber}」已存在于系统中，但对应的报价阶段不一致`,
          suggestion: `请将 CSV 中报价单编号「${quoteNumber}」对应的报价阶段修改为「${sheet.quoteStage || '空'}」，或更换一个新的报价单编号。`,
        })
      }
      if ((sheet.sourceType || '') !== (first.sourceType || '')) {
        mismatches.push({
          field: '报价来源类型',
          value: first.sourceType || '',
          reason: `报价单编号「${quoteNumber}」已存在于系统中，但对应的报价来源类型不一致`,
          suggestion: `请将 CSV 中报价单编号「${quoteNumber}」对应的报价来源类型修改为「${sheet.sourceType || '空'}」，或更换一个新的报价单编号。`,
        })
      }
      if (mismatches.length > 0) {
        errors.push(...mismatches.map((item) => rowError(groupRows[0].rowNumber, item.field, item.value, item.reason, item.suggestion)))
      }
    }

    if (errors.length > 0) {
      return validationFailure('导入校验失败，请修正后重试。本次导入未写入任何数据。', errors, rows.length)
    }

    // ─── 阶段 3：在事务中写入数据 ──────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const autoCreatedSupplierNames = new Set<string>()
      const autoCreatedCategoryNames = new Set<string>()

      for (const categoryName of categoryNames) {
        if (categoryMap.has(categoryName)) continue

        const category = await tx.category.create({
          data: {
            name: categoryName,
            notes: AUTO_CREATED_CATEGORY_NOTE,
          },
          select: { id: true, name: true },
        })
        categoryMap.set(category.name, category.id)
        autoCreatedCategoryNames.add(category.name)
      }

      for (const row of parsedRows) {
        if (supplierMap.has(row.supplierName)) continue

        const categoryId = categoryMap.get(row.categoryName)!
        const supplier = await tx.supplier.create({
          data: {
            name: row.supplierName,
            categoryId,
            hasQuoted: true,
            source: AUTO_CREATED_SUPPLIER_SOURCE,
          },
          select: { id: true, name: true },
        })
        supplierMap.set(supplier.name, supplier.id)
        autoCreatedSupplierNames.add(supplier.name)
      }

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

      return {
        sheetsCreated,
        itemsCreated,
        attachmentsCreated,
        suppliersCreated: autoCreatedSupplierNames.size,
        categoriesCreated: autoCreatedCategoryNames.size,
      }
    })

    return NextResponse.json({
      success: true,
      message: `导入成功：${result.sheetsCreated} 张报价单，${result.itemsCreated} 条明细，${result.attachmentsCreated} 条附件，自动新增 ${result.suppliersCreated} 家供应商、${result.categoriesCreated} 个品类`,
      ...result,
      totalRows: rows.length,
    })
  } catch (e) {
    if (isAuthError(e)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('CSV import error:', e)
    const message = '导入失败：' + (e instanceof Error ? e.message : '未知错误')
    return validationFailure(message, [
      rowError(1, '文件', '', message, '请稍后重试，或检查 CSV 文件内容是否符合模板。'),
    ], 0, 500)
  }
}
