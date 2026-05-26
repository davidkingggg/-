import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  AUTH_ERROR,
  PERSON_BINDING_ERROR,
  isAuthError,
  isPersonBindingError,
} from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId } from '@/lib/admin-task-auth'

function authErrorResponse(error: unknown) {
  if (isAuthError(error)) {
    return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
  }
  if (isPersonBindingError(error)) {
    return NextResponse.json({ error: PERSON_BINDING_ERROR }, { status: 400 })
  }
  return null
}

async function readBody(request: Request) {
  return request.json().catch(() => ({}))
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const { id } = await params
    const body = await readBody(request)

    if (body.confirmation !== '确认彻底删除') {
      return NextResponse.json({ error: '请输入“确认彻底删除”以继续' }, { status: 400 })
    }

    const result = await prisma.adminTask.deleteMany({
      where: {
        id,
        ownerPersonId,
        isArchived: true,
      },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: '行政事项归档不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '彻底删除行政事项归档失败' }, { status: 500 })
  }
}
