import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  AUTH_ERROR,
  PERSON_BINDING_ERROR,
  isAuthError,
  isPersonBindingError,
} from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId } from '@/lib/admin-task-auth'

const VALID_PRIORITIES = ['高', '中', '低']
const VALID_STATUSES = ['未开始', '进行中', '已完成', '暂停']

function parseDueDate(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
  if (!dateOnlyPattern.test(value)) return undefined

  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function completedAtForStatus(nextStatus: string, currentStatus: string, currentCompletedAt: Date | null) {
  if (nextStatus === '已完成') {
    return currentStatus === '已完成' && currentCompletedAt ? currentCompletedAt : new Date()
  }

  return currentStatus === '已完成' ? null : currentCompletedAt
}

function authErrorResponse(error: unknown) {
  if (isAuthError(error)) {
    return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
  }
  if (isPersonBindingError(error)) {
    return NextResponse.json({ error: PERSON_BINDING_ERROR }, { status: 400 })
  }
  return null
}

async function findOwnedTask(id: string, ownerPersonId: string) {
  return prisma.adminTask.findFirst({
    where: { id, ownerPersonId },
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const { id } = await params
    const body = await request.json()

    const existing = await findOwnedTask(id, ownerPersonId)
    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: '行政事项不存在' }, { status: 404 })
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    const priority = typeof body.priority === 'string' ? body.priority : ''
    const status = typeof body.status === 'string' ? body.status : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
    const dueDate = parseDueDate(body.dueDate)

    if (!title) return NextResponse.json({ error: '事项名称不能为空' }, { status: 400 })
    if (!type) return NextResponse.json({ error: '类型不能为空' }, { status: 400 })
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `优先级必须为以下之一：${VALID_PRIORITIES.join('、')}` }, { status: 400 })
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `状态必须为以下之一：${VALID_STATUSES.join('、')}` }, { status: 400 })
    }
    if (dueDate === undefined) return NextResponse.json({ error: '截止日期格式不正确' }, { status: 400 })

    const task = await prisma.adminTask.update({
      where: { id },
      data: {
        title,
        type,
        priority: priority || null,
        dueDate,
        isRecurring: Boolean(body.isRecurring),
        status,
        completedAt: completedAtForStatus(status, existing.status, existing.completedAt),
        notes: notes || null,
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '编辑行政事项失败' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const { id } = await params
    const body = await request.json()
    const status = typeof body.status === 'string' ? body.status : ''

    const existing = await findOwnedTask(id, ownerPersonId)
    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: '行政事项不存在' }, { status: 404 })
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `状态必须为以下之一：${VALID_STATUSES.join('、')}` }, { status: 400 })
    }

    const task = await prisma.adminTask.update({
      where: { id },
      data: {
        status,
        completedAt: completedAtForStatus(status, existing.status, existing.completedAt),
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '更新行政事项状态失败' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const { id } = await params

    const existing = await findOwnedTask(id, ownerPersonId)
    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: '行政事项不存在' }, { status: 404 })
    }

    const task = await prisma.adminTask.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '归档行政事项失败' }, { status: 500 })
  }
}
