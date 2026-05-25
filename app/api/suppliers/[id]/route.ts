import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

const VALID_COOPERATION = ['强', '一般', '弱', '未确认']
const VALID_PRICE_LEVELS = ['高', '中', '低', '未知']
const VALID_RECOMMENDED = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        contacts: {
          where: { isArchived: false },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        riskTags: {
          include: { riskTag: true },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取供应商详情失败' }, { status: 500 })
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

    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '供应商名称不能为空' }, { status: 400 })
    }
    if (!body.categoryId) {
      return NextResponse.json({ error: '主品类不能为空' }, { status: 400 })
    }

    const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
    if (!category) {
      return NextResponse.json({ error: '所选品类不存在' }, { status: 400 })
    }

    if (body.companyType && body.companyType.length > 100) {
      return NextResponse.json({ error: '公司性质不能超过 100 个字符' }, { status: 400 })
    }
    if (body.source && body.source.length > 100) {
      return NextResponse.json({ error: '来源不能超过 100 个字符' }, { status: 400 })
    }

    if (body.cooperationWillingness && !VALID_COOPERATION.includes(body.cooperationWillingness)) {
      return NextResponse.json({ error: `合作意愿必须为以下之一：${VALID_COOPERATION.join('、')}` }, { status: 400 })
    }
    if (body.priceLevel && !VALID_PRICE_LEVELS.includes(body.priceLevel)) {
      return NextResponse.json({ error: `价格水平必须为以下之一：${VALID_PRICE_LEVELS.join('、')}` }, { status: 400 })
    }
    if (body.recommendedLevel && !VALID_RECOMMENDED.includes(body.recommendedLevel)) {
      return NextResponse.json({ error: `推荐等级必须为以下之一：${VALID_RECOMMENDED.join('、')}` }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name.trim(),
        categoryId: body.categoryId,
        region: body.region ?? existing.region,
        companyType: body.companyType ?? existing.companyType,
        source: body.source ?? existing.source,
        hasQuoted: body.hasQuoted ?? existing.hasQuoted,
        hasVisited: body.hasVisited ?? existing.hasVisited,
        willingToJoin: body.willingToJoin ?? existing.willingToJoin,
        cooperationWillingness: body.cooperationWillingness ?? existing.cooperationWillingness,
        qualification: body.qualification ?? existing.qualification,
        deliveryAbility: body.deliveryAbility ?? existing.deliveryAbility,
        afterSalesAbility: body.afterSalesAbility ?? existing.afterSalesAbility,
        paymentTerms: body.paymentTerms ?? existing.paymentTerms,
        priceLevel: body.priceLevel ?? existing.priceLevel,
        recommendedLevel: body.recommendedLevel ?? existing.recommendedLevel,
        riskSummary: body.riskSummary ?? existing.riskSummary,
        notes: body.notes ?? existing.notes,
        nextFollowUpDate: body.nextFollowUpDate !== undefined
          ? (body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null)
          : existing.nextFollowUpDate,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(supplier)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '编辑供应商失败' }, { status: 500 })
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params

    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })
    return NextResponse.json(supplier)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '归档供应商失败' }, { status: 500 })
  }
}
