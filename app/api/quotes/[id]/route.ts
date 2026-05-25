import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

const VALID_SOURCE_TYPES = ['微信', '图片', 'PDF', 'Excel', '口头', '其他']
const VALID_QUOTE_STAGES = ['初次报价', '二次议价', '最终确认价', '量大优惠价']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const quote = await prisma.quoteSheet.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        items: {
          where: { isArchived: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!quote) {
      return NextResponse.json({ error: '报价单不存在' }, { status: 404 })
    }

    // 获取关联附件
    const attachments = await prisma.attachment.findMany({
      where: { relatedType: 'QuoteSheet', relatedId: id, isArchived: false },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ...quote, attachments })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取报价单详情失败' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.quoteSheet.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '报价单不存在' }, { status: 404 })
    }

    // 校验
    if (body.sourceType && !VALID_SOURCE_TYPES.includes(body.sourceType)) {
      return NextResponse.json({ error: `报价来源类型必须为以下之一：${VALID_SOURCE_TYPES.join('、')}` }, { status: 400 })
    }
    if (body.quoteStage && !VALID_QUOTE_STAGES.includes(body.quoteStage)) {
      return NextResponse.json({ error: `报价阶段必须为以下之一：${VALID_QUOTE_STAGES.join('、')}` }, { status: 400 })
    }

    // 校验 quoteNumber 唯一性（排除自身）
    if (body.quoteNumber) {
      const dup = await prisma.quoteSheet.findUnique({ where: { quoteNumber: body.quoteNumber } })
      if (dup && dup.id !== id) {
        return NextResponse.json({ error: `报价单编号「${body.quoteNumber}」已存在` }, { status: 400 })
      }
    }

    const quote = await prisma.quoteSheet.update({
      where: { id },
      data: {
        quoteNumber: body.quoteNumber !== undefined ? (body.quoteNumber || null) : undefined,
        title: body.title !== undefined ? (body.title || null) : undefined,
        supplierId: body.supplierId || undefined,
        categoryId: body.categoryId || undefined,
        quoteDate: body.quoteDate ? new Date(body.quoteDate) : undefined,
        sourceType: body.sourceType !== undefined ? (body.sourceType || null) : undefined,
        quoteStage: body.quoteStage !== undefined ? (body.quoteStage || null) : undefined,
        rawText: body.rawText !== undefined ? (body.rawText || null) : undefined,
        notes: body.notes !== undefined ? (body.notes || null) : undefined,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '更新报价单失败' }, { status: 500 })
  }
}

// PATCH = 归档
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const existing = await prisma.quoteSheet.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '报价单不存在' }, { status: 404 })
    }

    const quote = await prisma.quoteSheet.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    })

    return NextResponse.json(quote)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '归档报价单失败' }, { status: 500 })
  }
}
