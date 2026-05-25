import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

const VALID_COOPERATION = ['强', '一般', '弱', '未确认']
const VALID_PRICE_LEVELS = ['高', '中', '低', '未知']
const VALID_RECOMMENDED = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const region = searchParams.get('region')
    const recommendedLevel = searchParams.get('recommendedLevel')
    const hasQuoted = searchParams.get('hasQuoted')
    const hasVisited = searchParams.get('hasVisited')
    const riskTagId = searchParams.get('riskTagId')

    const where: Prisma.SupplierWhereInput = { isArchived: false }

    if (search) {
      where.name = { contains: search }
    }
    if (categoryId) where.categoryId = categoryId
    if (region) where.region = { contains: region }
    if (recommendedLevel) where.recommendedLevel = recommendedLevel
    if (hasQuoted === 'true') where.hasQuoted = true
    if (hasQuoted === 'false') where.hasQuoted = false
    if (hasVisited === 'true') where.hasVisited = true
    if (hasVisited === 'false') where.hasVisited = false
    if (riskTagId) {
      where.riskTags = { some: { riskTagId } }
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        riskTags: { include: { riskTag: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(suppliers)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取供应商列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireUser()
    const body = await request.json()

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '供应商名称不能为空' }, { status: 400 })
    }
    if (!body.categoryId) {
      return NextResponse.json({ error: '主品类不能为空' }, { status: 400 })
    }

    // 校验品类是否存在
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
    if (!category) {
      return NextResponse.json({ error: '所选品类不存在' }, { status: 400 })
    }

    // 校验文本字段长度
    if (body.companyType && body.companyType.length > 100) {
      return NextResponse.json({ error: '公司性质不能超过 100 个字符' }, { status: 400 })
    }
    if (body.source && body.source.length > 100) {
      return NextResponse.json({ error: '来源不能超过 100 个字符' }, { status: 400 })
    }

    // 校验枚举值
    if (body.cooperationWillingness && !VALID_COOPERATION.includes(body.cooperationWillingness)) {
      return NextResponse.json({ error: `合作意愿必须为以下之一：${VALID_COOPERATION.join('、')}` }, { status: 400 })
    }
    if (body.priceLevel && !VALID_PRICE_LEVELS.includes(body.priceLevel)) {
      return NextResponse.json({ error: `价格水平必须为以下之一：${VALID_PRICE_LEVELS.join('、')}` }, { status: 400 })
    }
    if (body.recommendedLevel && !VALID_RECOMMENDED.includes(body.recommendedLevel)) {
      return NextResponse.json({ error: `推荐等级必须为以下之一：${VALID_RECOMMENDED.join('、')}` }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name.trim(),
        categoryId: body.categoryId,
        region: body.region || null,
        companyType: body.companyType || null,
        source: body.source || null,
        hasQuoted: body.hasQuoted ?? false,
        hasVisited: body.hasVisited ?? false,
        willingToJoin: body.willingToJoin ?? false,
        cooperationWillingness: body.cooperationWillingness || null,
        qualification: body.qualification || null,
        deliveryAbility: body.deliveryAbility || null,
        afterSalesAbility: body.afterSalesAbility || null,
        paymentTerms: body.paymentTerms || null,
        priceLevel: body.priceLevel || null,
        recommendedLevel: body.recommendedLevel || null,
        riskSummary: body.riskSummary || null,
        notes: body.notes || null,
        nextFollowUpDate: body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    })

    // 创建联系人（如果有）
    if (body.contacts && Array.isArray(body.contacts)) {
      for (const contact of body.contacts) {
        if (contact.name && contact.name.trim()) {
          await prisma.supplierContact.create({
            data: {
              supplierId: supplier.id,
              name: contact.name.trim(),
              position: contact.position || null,
              phone: contact.phone || null,
              wechat: contact.wechat || null,
              email: contact.email || null,
              isPrimary: contact.isPrimary ?? false,
              notes: contact.notes || null,
            },
          })
        }
      }
    }

    // 绑定风险标签（如果有）
    if (body.riskTagIds && Array.isArray(body.riskTagIds)) {
      for (const tagId of body.riskTagIds) {
        await prisma.supplierRiskTag.create({
          data: { supplierId: supplier.id, riskTagId: tagId },
        })
      }
    }

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '新增供应商失败' }, { status: 500 })
  }
}
