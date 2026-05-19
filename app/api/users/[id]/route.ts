import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, requireAdmin } from '@/lib/auth-utils'

const ADMIN_ERROR = '需要管理员权限'

function normalizeOptionalText(value: unknown): string | undefined {
  return value === undefined ? undefined : typeof value === 'string' ? value.trim() : ''
}

function isAdminError(error: unknown): boolean {
  return error instanceof Error && error.message === ADMIN_ERROR
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const data: { name?: string; isAdmin?: boolean; passwordHash?: string } = {}
    const name = normalizeOptionalText(body.name)
    const password = normalizeOptionalText(body.password)

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
      }
      data.name = name
    }

    if (body.isAdmin !== undefined) {
      if (typeof body.isAdmin !== 'boolean') {
        return NextResponse.json({ error: '管理员状态必须是布尔值' }, { status: 400 })
      }
      data.isAdmin = body.isAdmin
    }

    if (password !== undefined && password) {
      if (password.length < 6) {
        return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })
      }
      data.passwordHash = await hashPassword(password)
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, isAdmin: true, isActive: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const { isActive } = await request.json()

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: '启用状态必须是布尔值' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, username: true, name: true, isAdmin: true, isActive: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '更新用户状态失败' }, { status: 500 })
  }
}
