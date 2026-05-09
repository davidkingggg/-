import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_LEVELS = ['高', '中', '低']

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        type: body.type ?? existing.type,
        isPriority: body.isPriority ?? existing.isPriority,
        standardLevel: body.standardLevel ?? existing.standardLevel,
        afterSalesRisk: body.afterSalesRisk ?? existing.afterSalesRisk,
        purchaseFrequency: body.purchaseFrequency ?? existing.purchaseFrequency,
        notes: body.notes ?? existing.notes,
      },
    })
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: '编辑品类失败' }, { status: 500 })
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '品类不存在' }, { status: 404 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: '归档品类失败' }, { status: 500 })
  }
}
