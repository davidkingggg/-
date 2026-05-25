import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    await requireUser()
    const { id, contactId } = await params
    const body = await request.json()

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    const existing = await prisma.supplierContact.findUnique({ where: { id: contactId } })
    if (!existing || existing.supplierId !== id) {
      return NextResponse.json({ error: '联系人不存在' }, { status: 404 })
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: '联系人姓名不能为空' }, { status: 400 })
    }

    const contact = await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        name: body.name.trim(),
        position: body.position ?? existing.position,
        phone: body.phone ?? existing.phone,
        wechat: body.wechat ?? existing.wechat,
        email: body.email ?? existing.email,
        isPrimary: body.isPrimary ?? existing.isPrimary,
        notes: body.notes ?? existing.notes,
      },
    })
    return NextResponse.json(contact)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '编辑联系人失败' }, { status: 500 })
  }
}

// PATCH: 逻辑归档联系人（不做物理删除）
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    await requireUser()
    const { id, contactId } = await params

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return NextResponse.json({ error: '供应商不存在' }, { status: 404 })
    }

    const existing = await prisma.supplierContact.findUnique({ where: { id: contactId } })
    if (!existing || existing.supplierId !== id) {
      return NextResponse.json({ error: '联系人不存在' }, { status: 404 })
    }

    const contact = await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })
    return NextResponse.json(contact)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '归档联系人失败' }, { status: 500 })
  }
}
