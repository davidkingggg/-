import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const session = await getSession()
    if (!user) {
      if (session.userId) {
        session.destroy()
      }
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const nextPersonId = user.personId || null
    const nextPersonName = user.person?.name || null
    const currentPersonId = session.personId || null
    const currentPersonName = session.personName || null

    if (
      session.name !== user.name ||
      session.isAdmin !== user.isAdmin ||
      session.sessionVersion !== user.sessionVersion ||
      currentPersonId !== nextPersonId ||
      currentPersonName !== nextPersonName
    ) {
      session.name = user.name
      session.isAdmin = user.isAdmin
      session.sessionVersion = user.sessionVersion
      session.personId = nextPersonId || undefined
      session.personName = nextPersonName || undefined
      await session.save()
    }

    return NextResponse.json({
      ...user,
      session: {
        userId: session.userId || null,
        username: session.username || null,
        name: session.name || null,
        isAdmin: session.isAdmin ?? false,
        sessionVersion: session.sessionVersion ?? null,
        personId: session.personId || null,
        personName: session.personName || null,
      },
    })
  } catch {
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 })
  }
}
