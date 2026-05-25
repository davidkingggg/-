import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

const VALID_ROLES = ['总经理助理', '老板', '销售', '商务', '工程师', '采购需求提交人', '行政', '其他']

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.person.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '人员不存在' }, { status: 404 })
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
    }

    if (body.role && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `角色必须为以下之一：${VALID_ROLES.join('、')}` },
        { status: 400 }
      )
    }

    const person = await prisma.person.update({
      where: { id },
      data: {
        name: body.name.trim(),
        department: body.department ?? existing.department,
        role: body.role ?? existing.role,
        phone: body.phone ?? existing.phone,
        email: body.email ?? existing.email,
        notes: body.notes ?? existing.notes,
      },
    })
    return NextResponse.json(person)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '编辑人员失败' }, { status: 500 })
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params

    const existing = await prisma.person.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '人员不存在' }, { status: 404 })
    }

    const person = await prisma.person.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json(person)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '停用人员失败' }, { status: 500 })
  }
}
