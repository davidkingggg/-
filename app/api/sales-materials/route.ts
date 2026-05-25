import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'
import {
  buildSalesMaterialWhere,
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

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const materials = await prisma.salesMaterial.findMany({
      where: buildSalesMaterialWhere(new URL(request.url).searchParams),
      include: { category: { select: { id: true, name: true } } },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(materials)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取销售/商务资料列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireUser()
    const body = await request.json()
    const result = readSalesMaterialBody(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const category = await prisma.category.findUnique({ where: { id: result.data.categoryId } })
    if (!category || category.isArchived) {
      return NextResponse.json({ error: '请选择有效的品类' }, { status: 400 })
    }

    const material = await prisma.salesMaterial.create({
      data: {
        ...result.data,
        isArchived: false,
        archivedAt: null,
      },
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '新增销售/商务资料失败' }, { status: 500 })
  }
}
