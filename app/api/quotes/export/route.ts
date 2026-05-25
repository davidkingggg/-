import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'
import {
  createCSVResponse,
  formatCSVBoolean,
  formatCSVDate,
  formatCSVNumber,
  formatCSVPercent,
} from '@/lib/csv-utils'

const HEADERS = [
  '报价单编号', '报价单名称', '报价文件路径',
  '供应商名称', '品类', '报价日期', '报价阶段', '报价来源类型',
  '对比规格标识 (compareKey)', '产品名称', '型号规格', '单位',
  '报价', '是否含税', '税率', '是否含运费', '最小起订量',
  '交期', '付款条件', '质保期', '价格备注',
]

export async function GET() {
  try {
    await requireUser()
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

    const rows: (string | number | null)[][] = [HEADERS]

    for (const item of items) {
      const sheet = item.quoteSheet
      const filePath = attachmentMap.get(item.quoteSheetId) || ''

      rows.push([
        sheet.quoteNumber,
        sheet.title,
        filePath,
        sheet.supplier.name,
        sheet.category.name,
        formatCSVDate(sheet.quoteDate),
        sheet.quoteStage,
        sheet.sourceType,
        item.compareKey,
        item.productName,
        item.model,
        item.unit,
        formatCSVNumber(item.price),
        formatCSVBoolean(item.includesTax),
        formatCSVPercent(item.taxRate) || null,
        formatCSVBoolean(item.includesFreight),
        item.minOrderQty,
        item.deliveryTime,
        item.paymentTerms,
        item.warranty,
        item.priceNotes,
      ])
    }

    return createCSVResponse(rows, `quotes_export_${new Date().toISOString().slice(0, 10)}.csv`)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
