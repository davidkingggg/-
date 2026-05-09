import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_ROLES = ['总经理助理', '老板', '销售', '商务', '工程师', '采购需求提交人', '行政', '其他']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const department = searchParams.get('department')

    const where: Record<string, unknown> = { isActive: true }
    if (role) where.role = role
    if (department) where.department = department

    const people = await prisma.person.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(people)
  } catch {
    return NextResponse.json({ error: '获取人员列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
    }

    if (body.role && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `角色必须为以下之一：${VALID_ROLES.join('、')}` },
        { status: 400 }
      )
    }

    const person = await prisma.person.create({
      data: {
        name: body.name.trim(),
        department: body.department || null,
        role: body.role || null,
        phone: body.phone || null,
        email: body.email || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(person, { status: 201 })
  } catch {
    return NextResponse.json({ error: '新增人员失败' }, { status: 500 })
  }
}
