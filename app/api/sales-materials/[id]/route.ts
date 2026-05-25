import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'
import {
  isValidTargetAudience,
  normalizeOptionalText,
} from '@/lib/sales-material-utils'

function readSalesMaterialBody(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : ''
  const targetAudience = normalizeOptionalText(body.targetAudience)

  if (!title) return { error: '资料名称不能为空' }
  if (!categoryId) return { error: '适用品类不能为空' }
  if (!isValidTargetAudience(targetAudience)) {
    return { error: '目标对象必须为：销售部门、商务总助、安装公司、老板、客户、其他' }
  }

  return {
    data: {
      title,
      categoryId,
      targetAudience,
      coreSellingPoints: normalizeOptionalText(body.coreSellingPoints),
      priceAdvantage: normalizeOptionalText(body.priceAdvantage),
      supplierAdvantage: normalizeOptionalText(body.supplierAdvantage),
      qualificationSupport: normalizeOptionalText(body.qualificationSupport),
      deliveryAdvantage: normalizeOptionalText(body.deliveryAdvantage),
      afterSalesAdvantage: normalizeOptionalText(body.afterSalesAdvantage),
      riskNotice: normalizeOptionalText(body.riskNotice),
      formalText: normalizeOptionalText(body.formalText),
    },
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const existing = await prisma.salesMaterial.findUnique({ where: { id } })

    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: '销售/商务资料不存在或已归档' }, { status: 404 })
    }

    const body = await request.json()
    const result = readSalesMaterialBody(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const category = await prisma.category.findUnique({ where: { id: result.data.categoryId } })
    if (!category || category.isArchived) {
      return NextResponse.json({ error: '请选择有效的品类' }, { status: 400 })
    }

    const material = await prisma.salesMaterial.update({
      where: { id },
      data: result.data,
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json(material)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '编辑销售/商务资料失败' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const existing = await prisma.salesMaterial.findUnique({ where: { id } })

    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: '销售/商务资料不存在或已归档' }, { status: 404 })
    }

    const material = await prisma.salesMaterial.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json(material)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '归档销售/商务资料失败' }, { status: 500 })
  }
}
