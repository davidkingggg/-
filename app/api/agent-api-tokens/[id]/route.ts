import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ADMIN_ERROR, AUTH_ERROR } from '@/lib/auth-utils'
import { requireSessionAdmin } from '@/lib/session-admin-auth'

function authErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === AUTH_ERROR) {
    return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
  }
  if (error instanceof Error && error.message === ADMIN_ERROR) {
    return NextResponse.json({ error: ADMIN_ERROR }, { status: 403 })
  }
  return null
}

const tokenSelect = {
  id: true,
  name: true,
  tokenPrefix: true,
  userId: true,
  isActive: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, username: true, name: true, isActive: true, isAdmin: true } },
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSessionAdmin()
    const { id } = await params
    const body = await request.json()

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: '请提供有效的启用状态' }, { status: 400 })
    }

    const existing = await prisma.agentApiToken.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Agent Token 不存在' }, { status: 404 })
    }

    const token = await prisma.agentApiToken.update({
      where: { id },
      data: {
        isActive: body.isActive,
        revokedAt: body.isActive ? null : new Date(),
      },
      select: tokenSelect,
    })

    return NextResponse.json(token)
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '更新 Agent Token 失败' }, { status: 500 })
  }
}
