import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, validatePasswordPolicy } from '@/lib/auth-utils'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      return NextResponse.json({ error: '管理员已存在，无法重复初始化' }, { status: 400 })
    }

    const body = await request.json()
    const username = normalizeText(body.username)
    const password = normalizeText(body.password)
    const name = normalizeText(body.name)

    if (!username || !password || !name) {
      return NextResponse.json({ error: '请填写完整的用户名、密码和姓名' }, { status: 400 })
    }

    const passwordError = validatePasswordPolicy(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        isAdmin: true,
      },
      select: { id: true, username: true, name: true, isAdmin: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: '初始化失败' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({ needsInit: userCount === 0 })
  } catch {
    return NextResponse.json({ error: '检查失败' }, { status: 500 })
  }
}
