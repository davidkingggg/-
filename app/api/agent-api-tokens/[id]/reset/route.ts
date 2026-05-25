import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ADMIN_ERROR, AUTH_ERROR } from '@/lib/auth-utils'
import { createAgentApiTokenSecret } from '@/lib/agent-api-tokens'
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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSessionAdmin()
    const { id } = await params
    const existing = await prisma.agentApiToken.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Agent Token 不存在' }, { status: 404 })
    }

    const secret = createAgentApiTokenSecret()
    const token = await prisma.agentApiToken.update({
      where: { id },
      data: {
        tokenPrefix: secret.prefix,
        tokenHash: secret.hash,
        isActive: true,
        revokedAt: null,
        lastUsedAt: null,
      },
      select: tokenSelect,
    })

    return NextResponse.json({ token, plainToken: secret.raw })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '重置 Agent Token 失败' }, { status: 500 })
  }
}
