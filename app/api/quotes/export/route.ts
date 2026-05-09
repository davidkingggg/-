import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { toCSVRow } from '@/lib/csv-utils'

const HEADERS = [
  '报价单编号', '报价单名称', '报价文件路径',
  '供应商名称', '品类', '报价日期', '报价阶段', '报价来源类型',
  '对比规格标识 (compareKey)', '产品名称', '型号规格', '单位',
  '报价', '是否含税', '税率', '是否含运费', '最小起订量',
  '交期', '付款条件', '质保期', '价格备注',
]

export async function GET() {
  try {
    const items = await prisma.quoteItem.findMany({
      where: {
        isArchived: false,
        quoteSheet: { isArchived: false }
      },
      include: {
        quoteSheet: {
          select: {
            quoteNumber: true,
            title: true,
            quoteDate: true,
            quoteStage: true,
            sourceType: true,
            supplier: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
        supplier: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [
        { quoteSheet: { quoteDate: 'desc' } },
        { createdAt: 'asc' },
      ],
    })

    // 批量获取相关附件
    const sheetIds = [...new Set(items.map(i => i.quoteSheetId))]
    const attachments = await prisma.attachment.findMany({
      where: { relatedType: 'QuoteSheet', relatedId: { in: sheetIds }, isArchived: false },
      select: { relatedId: true, filePath: true },
    })
    const attachmentMap = new Map<string, string>()
    for (const att of attachments) {
      if (!attachmentMap.has(att.relatedId)) {
        attachmentMap.set(att.relatedId, att.filePath)
      }
    }

    const csvLines = [toCSVRow(HEADERS)]

    for (const item of items) {
      const sheet = item.quoteSheet
      const filePath = attachmentMap.get(item.quoteSheetId) || ''

      // 税率导出：以百分数显示
      let taxRateStr = ''
      if (item.taxRate !== null) {
        const rate = Number(item.taxRate)
        taxRateStr = rate <= 1 ? `${(rate * 100).toFixed(0)}%` : `${rate}%`
      }

      csvLines.push(toCSVRow([
        sheet.quoteNumber,
        sheet.title,
        filePath,
        sheet.supplier.name,
        sheet.category.name,
        sheet.quoteDate.toISOString().slice(0, 10),
        sheet.quoteStage,
        sheet.sourceType,
        item.compareKey,
        item.productName,
        item.model,
        item.unit,
        item.price !== null ? Number(item.price) : null,
        item.includesTax ? '是' : '否',
        taxRateStr || null,
        item.includesFreight ? '是' : '否',
        item.minOrderQty,
        item.deliveryTime,
        item.paymentTerms,
        item.warranty,
        item.priceNotes,
      ]))
    }

    const csvContent = '\uFEFF' + csvLines.join('\n') // BOM for Excel

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="quotes_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
