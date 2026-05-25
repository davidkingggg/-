import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireUser()
    const tags = await prisma.riskTag.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(tags)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '获取风险标签失败' }, { status: 500 })
  }
}
