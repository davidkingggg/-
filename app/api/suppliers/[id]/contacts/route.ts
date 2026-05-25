import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    const contacts = await prisma.supplierContact.findMany({
      where: { supplierId: id, isArchived: false },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(contacts)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取联系人列表失败' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const body = await request.json()

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '联系人姓名不能为空' }, { status: 400 })
    }

    const contact = await prisma.supplierContact.create({
      data: {
        supplierId: id,
        name: body.name.trim(),
        position: body.position || null,
        phone: body.phone || null,
        wechat: body.wechat || null,
        email: body.email || null,
        isPrimary: body.isPrimary ?? false,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '新增联系人失败' }, { status: 500 })
  }
}
