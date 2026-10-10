import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { verifyPassword } from '@/lib/auth-utils'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit'

const DUMMY_HASH = '$2a$12$00000000000000000000000000000000000000000000000000000000'

export async function POST(request: NextRequest) {
  try {
    // 优先使用 x-forwarded-for（Next.js 反向代理场景），否则回退到 'unknown'
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
    }

    // IP 级限流
    const ipKey = `login:ip:${ip}`
    const ipResult = checkRateLimit(ipKey)
    if (!ipResult.allowed) {
      const retryAfterSec = Math.ceil((ipResult.retryAfterMs ?? 0) / 1000)
      return NextResponse.json(
        { error: `登录尝试过多，请 ${retryAfterSec} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    // Username 级限流 — 防止单个账号被暴力破解（返回 401 而非 429，隐藏用户存在）
    const userKey = `login:user:${username}`
    const userResult = checkRateLimit(userKey)
    if (!userResult.allowed) {
      // 假 bcrypt 比较保持时序一致
      await verifyPassword(password, DUMMY_HASH)
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
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
      recordFailedAttempt(ipKey)
      recordFailedAttempt(userKey)
      // 假 bcrypt 比较，保持时序一致防止用户枚举
      await verifyPassword(password, DUMMY_HASH)
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      recordFailedAttempt(ipKey)
      recordFailedAttempt(userKey)
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    clearAttempts(ipKey)
    clearAttempts(userKey)

    const session = await getSession()
    session.userId = user.id
    session.username = user.username
    session.name = user.name
    session.isAdmin = user.isAdmin
    session.sessionVersion = user.sessionVersion
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
