import { NextRequest, NextResponse } from 'next/server'
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

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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

export async function GET() {
  try {
    await requireSessionAdmin()
    const tokens = await prisma.agentApiToken.findMany({
      select: tokenSelect,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(tokens)
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '获取 Agent Token 列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSessionAdmin()
    const body = await request.json()
    const name = normalizeText(body.name)
    const userId = normalizeText(body.userId)

    if (!name) {
      return NextResponse.json({ error: 'Token 名称不能为空' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: '绑定用户不能为空' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: '绑定用户不存在或已停用' }, { status: 400 })
    }

    const secret = createAgentApiTokenSecret()
    const token = await prisma.agentApiToken.create({
      data: {
        name,
        userId,
        tokenPrefix: secret.prefix,
        tokenHash: secret.hash,
      },
      select: tokenSelect,
    })

    return NextResponse.json({ token, plainToken: secret.raw }, { status: 201 })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '创建 Agent Token 失败' }, { status: 500 })
  }
}
