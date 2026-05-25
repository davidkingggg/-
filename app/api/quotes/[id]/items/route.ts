import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

// GET - 获取某报价单的所有明细
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const items = await prisma.quoteItem.findMany({
      where: { quoteSheetId: id, isArchived: false },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(items)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取报价明细失败' }, { status: 500 })
  }
}

// POST - 新增明细
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const body = await request.json()

    const quoteSheet = await prisma.quoteSheet.findUnique({ where: { id } })
    if (!quoteSheet) {
      return NextResponse.json({ error: '报价单不存在' }, { status: 404 })
    }

    if (!body.productName || !body.productName.trim()) {
      return NextResponse.json({ error: '产品名称不能为空' }, { status: 400 })
    }

    const item = await prisma.quoteItem.create({
      data: {
        quoteSheetId: id,
        supplierId: quoteSheet.supplierId,
        categoryId: quoteSheet.categoryId,
        compareKey: body.compareKey || body.productName.trim(),
        productName: body.productName.trim(),
        model: body.model || null,
        unit: body.unit || null,
        price: body.price !== undefined && body.price !== null && body.price !== '' ? body.price : null,
        includesTax: body.includesTax ?? false,
        taxRate: body.taxRate !== undefined && body.taxRate !== null && body.taxRate !== '' ? body.taxRate : null,
        includesFreight: body.includesFreight ?? false,
        minOrderQty: body.minOrderQty || null,
        deliveryTime: body.deliveryTime || null,
        paymentTerms: body.paymentTerms || null,
        warranty: body.warranty || null,
        priceNotes: body.priceNotes || null,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '新增报价明细失败' }, { status: 500 })
  }
}

// PUT - 更新明细
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id: quoteSheetId } = await params
    const body = await request.json()

    if (!body.itemId) {
      return NextResponse.json({ error: '缺少明细 ID' }, { status: 400 })
    }

    const existing = await prisma.quoteItem.findFirst({
      where: { id: body.itemId, quoteSheetId },
    })
    if (!existing) {
      return NextResponse.json({ error: '报价明细不存在' }, { status: 404 })
    }

    const item = await prisma.quoteItem.update({
      where: { id: body.itemId },
      data: {
        compareKey: body.compareKey !== undefined ? body.compareKey : undefined,
        productName: body.productName !== undefined ? body.productName.trim() : undefined,
        model: body.model !== undefined ? (body.model || null) : undefined,
        unit: body.unit !== undefined ? (body.unit || null) : undefined,
        price: body.price !== undefined ? (body.price !== null && body.price !== '' ? body.price : null) : undefined,
        includesTax: body.includesTax !== undefined ? body.includesTax : undefined,
        taxRate: body.taxRate !== undefined ? (body.taxRate !== null && body.taxRate !== '' ? body.taxRate : null) : undefined,
        includesFreight: body.includesFreight !== undefined ? body.includesFreight : undefined,
        minOrderQty: body.minOrderQty !== undefined ? (body.minOrderQty || null) : undefined,
        deliveryTime: body.deliveryTime !== undefined ? (body.deliveryTime || null) : undefined,
        paymentTerms: body.paymentTerms !== undefined ? (body.paymentTerms || null) : undefined,
        warranty: body.warranty !== undefined ? (body.warranty || null) : undefined,
        priceNotes: body.priceNotes !== undefined ? (body.priceNotes || null) : undefined,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '更新报价明细失败' }, { status: 500 })
  }
}

// PATCH - 归档明细
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id: quoteSheetId } = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: '缺少明细 ID' }, { status: 400 })
    }

    const existing = await prisma.quoteItem.findFirst({
      where: { id: itemId, quoteSheetId },
    })
    if (!existing) {
      return NextResponse.json({ error: '报价明细不存在' }, { status: 404 })
    }

    await prisma.quoteItem.update({
      where: { id: itemId },
      data: { isArchived: true, archivedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '归档报价明细失败' }, { status: 500 })
  }
}
