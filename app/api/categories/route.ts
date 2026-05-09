import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isPriority = searchParams.get('isPriority')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = { isArchived: false }
    if (isPriority === 'true') where.isPriority = true
    if (isPriority === 'false') where.isPriority = false
    if (type) where.type = type

    const categories = await prisma.category.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: '获取品类列表失败' }, { status: 500 })
  }
}

const VALID_LEVELS = ['高', '中', '低']

export async function POST(request: Request) {
  try {
    const body = await request.json()

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

    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        type: body.type || null,
        isPriority: body.isPriority ?? false,
        standardLevel: body.standardLevel || null,
        afterSalesRisk: body.afterSalesRisk || null,
        purchaseFrequency: body.purchaseFrequency || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: '新增品类失败' }, { status: 500 })
  }
}
