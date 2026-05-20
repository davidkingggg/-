import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { verifyPassword } from '@/lib/auth-utils'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateKey = `login:${ip}`

    const { allowed, retryAfterMs } = checkRateLimit(rateKey)
    if (!allowed) {
      const retryAfterSec = Math.ceil((retryAfterMs ?? 0) / 1000)
      return NextResponse.json(
        { error: `登录尝试过多，请 ${retryAfterSec} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
            isActive: true,
          },
        },
      },
    })
    if (!user || !user.isActive) {
      recordFailedAttempt(rateKey)
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      recordFailedAttempt(rateKey)
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    clearAttempts(rateKey)

    const session = await getSession()
    session.userId = user.id
    session.username = user.username
    session.name = user.name
    session.isAdmin = user.isAdmin
    session.personId = user.person?.isActive ? user.person.id : undefined
    session.personName = user.person?.isActive ? user.person.name : undefined
    await session.save()

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      personId: user.person?.isActive ? user.person.id : null,
      person: user.person?.isActive
        ? {
            id: user.person.id,
            name: user.person.name,
            role: user.person.role,
            department: user.person.department,
          }
        : null,
    })
  } catch {
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
