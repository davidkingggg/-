import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ADMIN_ERROR, hashPassword, isAdminError, requireAdmin, validatePasswordPolicy } from '@/lib/auth-utils'
import { ensureLegacyAdminTasksAssigned } from '@/lib/admin-task-auth'
import { normalizePersonIdInput, validatePersonBinding } from '@/lib/user-person-binding'

function normalizeOptionalText(value: unknown): string | undefined {
  return value === undefined ? undefined : typeof value === 'string' ? value.trim() : ''
}

async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const enabledAdminCount = await prisma.user.count({
    where: { isAdmin: true, isActive: true },
  })
  if (enabledAdminCount !== 1) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, isActive: true },
  })

  return user?.isAdmin === true && user.isActive === true
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

    const data: { name?: string; isAdmin?: boolean; passwordHash?: string; personId?: string | null } = {}
    const name = normalizeOptionalText(body.name)
    const password = normalizeOptionalText(body.password)
    const personIdInput = normalizePersonIdInput(body.personId)

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
      }
      data.name = name
    }
    if (personIdInput === '') {
      return NextResponse.json({ error: '绑定人员格式不正确' }, { status: 400 })
    }

    if (body.isAdmin !== undefined) {
      if (typeof body.isAdmin !== 'boolean') {
        return NextResponse.json({ error: '管理员状态必须是布尔值' }, { status: 400 })
      }
      if (body.isAdmin === false && (await isLastActiveAdmin(id))) {
        return NextResponse.json({ error: '不能降级最后一个启用管理员' }, { status: 400 })
      }
      data.isAdmin = body.isAdmin
    }

    if (password !== undefined && password) {
      const passwordError = validatePasswordPolicy(password)
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 })
      }
      data.passwordHash = await hashPassword(password)
    }

    if (personIdInput !== undefined) {
      const binding = await validatePersonBinding(personIdInput, id)
      data.personId = binding.personId
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        isAdmin: true,
        isActive: true,
        personId: true,
        person: { select: { id: true, name: true } },
      },
    })

    await ensureLegacyAdminTasksAssigned()

    return NextResponse.json(updated)
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    if (error instanceof Error && (error.message.includes('绑定人员') || error.message.includes('已绑定到用户'))) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentAdmin = await requireAdmin()
    const { id } = await params
    const { isActive } = await request.json()

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: '启用状态必须是布尔值' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (isActive === false && currentAdmin.id === id) {
      return NextResponse.json({ error: '不能停用自己' }, { status: 400 })
    }

    if (isActive === false && (await isLastActiveAdmin(id))) {
      return NextResponse.json({ error: '不能停用最后一个启用管理员' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        name: true,
        isAdmin: true,
        isActive: true,
        personId: true,
        person: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '更新用户状态失败' }, { status: 500 })
  }
}
