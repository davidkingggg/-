import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, requireAdmin } from '@/lib/auth-utils'

const ADMIN_ERROR = '需要管理员权限'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isAdminError(error: unknown): boolean {
  return error instanceof Error && error.message === ADMIN_ERROR
}

export async function GET() {
  try {
    await requireAdmin()
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, isAdmin: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const username = normalizeText(body.username)
    const password = normalizeText(body.password)
    const name = normalizeText(body.name)
    const isAdmin = body.isAdmin === true

    if (!username || !password || !name) {
      return NextResponse.json({ error: '请填写用户名、密码和姓名' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: { username, passwordHash, name, isAdmin },
      select: { id: true, username: true, name: true, isAdmin: true, isActive: true, createdAt: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (isAdminError(error)) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
    }
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
  }
}
