import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ADMIN_ERROR, AUTH_ERROR, isAdminError, isAuthError, requireAdmin } from '@/lib/auth-utils'

const VALID_LEVELS = ['高', '中', '低']

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '品类不存在' }, { status: 404 })
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '品类名称不能为空' }, { status: 400 })
    }

    if (body.standardLevel && !VALID_LEVELS.includes(body.standardLevel)) {
      return NextResponse.json({ error: '标准化程度必须为：高、中、低' }, { status: 400 })
    }
    if (body.afterSalesRisk && !VALID_LEVELS.includes(body.afterSalesRisk)) {
      return NextResponse.json({ error: '售后风险必须为：高、中、低' }, { status: 400 })
    }
    if (body.purchaseFrequency && !VALID_LEVELS.includes(body.purchaseFrequency)) {
      return NextResponse.json({ error: '采购频率必须为：高、中、低' }, { status: 400 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name.trim(),
        type: body.type !== undefined ? body.type : existing.type,
        isPriority: body.isPriority ?? existing.isPriority,
        standardLevel: body.standardLevel !== undefined ? body.standardLevel : existing.standardLevel,
        afterSalesRisk: body.afterSalesRisk !== undefined ? body.afterSalesRisk : existing.afterSalesRisk,
        purchaseFrequency: body.purchaseFrequency !== undefined ? body.purchaseFrequency : existing.purchaseFrequency,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '编辑品类失败' }, { status: 500 })
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '品类不存在' }, { status: 404 })
    }

    if (existing.isArchived) {
      return NextResponse.json({ error: '该品类已归档' }, { status: 400 })
    }

    // 归档前检查是否有活跃的子项
    const [activeSuppliers, activeQuoteItems] = await Promise.all([
      prisma.supplier.count({ where: { categoryId: id, isArchived: false } }),
      prisma.quoteItem.count({ where: { categoryId: id, isArchived: false } }),
    ])
    if (activeSuppliers > 0 || activeQuoteItems > 0) {
      return NextResponse.json({
        error: `该品类下仍有 ${activeSuppliers} 个供应商和 ${activeQuoteItems} 个报价明细，无法归档。请先归档相关供应商和报价。`
      }, { status: 409 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '归档品类失败' }, { status: 500 })
  }
}
