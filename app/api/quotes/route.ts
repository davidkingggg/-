import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

const VALID_SOURCE_TYPES = ['微信', '图片', 'PDF', 'Excel', '口头', '其他']
const VALID_QUOTE_STAGES = ['初次报价', '二次议价', '最终确认价', '量大优惠价']

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const supplierId = searchParams.get('supplierId')
    const categoryId = searchParams.get('categoryId')
    const quoteStage = searchParams.get('quoteStage')

    const where: Prisma.QuoteSheetWhereInput = { isArchived: false }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { quoteNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
      ]
    }
    if (supplierId) where.supplierId = supplierId
    if (categoryId) where.categoryId = categoryId
    if (quoteStage) where.quoteStage = quoteStage

    const quotes = await prisma.quoteSheet.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(quotes)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取报价单列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireUser()
    const body = await request.json()

    if (!body.supplierId) {
      return NextResponse.json({ error: '供应商不能为空' }, { status: 400 })
    }
    if (!body.categoryId) {
      return NextResponse.json({ error: '品类不能为空' }, { status: 400 })
    }
    if (!body.quoteDate) {
      return NextResponse.json({ error: '报价日期不能为空' }, { status: 400 })
    }

    // 校验供应商是否存在
    const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId } })
    if (!supplier) {
      return NextResponse.json({ error: '所选供应商不存在' }, { status: 400 })
    }

    // 校验品类是否存在
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
    if (!category) {
      return NextResponse.json({ error: '所选品类不存在' }, { status: 400 })
    }

    // 校验枚举值
    if (body.sourceType && !VALID_SOURCE_TYPES.includes(body.sourceType)) {
      return NextResponse.json({ error: `报价来源类型必须为以下之一：${VALID_SOURCE_TYPES.join('、')}` }, { status: 400 })
    }
    if (body.quoteStage && !VALID_QUOTE_STAGES.includes(body.quoteStage)) {
      return NextResponse.json({ error: `报价阶段必须为以下之一：${VALID_QUOTE_STAGES.join('、')}` }, { status: 400 })
    }

    // 校验 quoteNumber 唯一性
    if (body.quoteNumber) {
      const existing = await prisma.quoteSheet.findUnique({ where: { quoteNumber: body.quoteNumber } })
      if (existing) {
        return NextResponse.json({ error: `报价单编号「${body.quoteNumber}」已存在` }, { status: 400 })
      }
    }

    const quote = await prisma.$transaction(async (tx) => {
      const createdQuote = await tx.quoteSheet.create({
        data: {
          quoteNumber: body.quoteNumber || null,
          title: body.title || null,
          supplierId: body.supplierId,
          categoryId: body.categoryId,
          quoteDate: new Date(body.quoteDate),
          sourceType: body.sourceType || null,
          quoteStage: body.quoteStage || null,
          rawText: body.rawText || null,
          notes: body.notes || null,
        },
        include: {
          supplier: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      })

      // 创建报价明细（如果有）
      if (body.items && Array.isArray(body.items)) {
        for (const item of body.items) {
          if (!item.productName || !item.productName.trim()) continue
          await tx.quoteItem.create({
            data: {
              quoteSheetId: createdQuote.id,
              supplierId: body.supplierId,
              categoryId: body.categoryId,
              compareKey: item.compareKey || item.productName,
              productName: item.productName.trim(),
              model: item.model || null,
              unit: item.unit || null,
              price: item.price !== undefined && item.price !== null && item.price !== '' ? item.price : null,
              includesTax: item.includesTax ?? false,
              taxRate: item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== '' ? item.taxRate : null,
              includesFreight: item.includesFreight ?? false,
              minOrderQty: item.minOrderQty || null,
              deliveryTime: item.deliveryTime || null,
              paymentTerms: item.paymentTerms || null,
              warranty: item.warranty || null,
              priceNotes: item.priceNotes || null,
            },
          })
        }
      }

      // 创建附件记录（如果有 filePath）
      if (body.filePath && body.filePath.trim()) {
        const fp = body.filePath.trim()
        const parts = fp.replace(/\\/g, '/').split('/')
        const fileName = parts[parts.length - 1] || fp
        const dotIdx = fileName.lastIndexOf('.')
        const fileType = dotIdx !== -1 ? fileName.slice(dotIdx + 1).toLowerCase() : ''
        await tx.attachment.create({
          data: {
            relatedType: 'QuoteSheet',
            relatedId: createdQuote.id,
            filePath: fp,
            fileName,
            fileType,
            notes: body.fileNotes || null,
          },
        })
      }

      await tx.supplier.update({
        where: { id: body.supplierId },
        data: { hasQuoted: true },
      })

      return createdQuote
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '新增报价单失败' }, { status: 500 })
  }
}
