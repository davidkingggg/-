import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  AUTH_ERROR,
  PERSON_BINDING_ERROR,
  isAuthError,
  isPersonBindingError,
} from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId, findOwnedAdminTask } from '@/lib/admin-task-auth'
import {
  normalizeRecurrence,
  parseDateOnly,
  parseTime,
  validateTimeRange,
} from '@/lib/admin-task-calendar'

const VALID_PRIORITIES = ['高', '中', '低']
const VALID_STATUSES = ['未开始', '进行中', '已完成', '暂停']

function validateTaskBody(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const type = typeof body.type === 'string' ? body.type.trim() : ''
  const priority = typeof body.priority === 'string' ? body.priority : ''
  const status = typeof body.status === 'string' ? body.status : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  const taskDate = parseDateOnly(body.taskDate ?? body.dueDate)
  const dueDate = parseDateOnly(body.dueDate ?? body.taskDate)
  const startTime = parseTime(body.startTime)
  const endTime = parseTime(body.endTime)
  const recurrenceType = normalizeRecurrence(body.recurrenceType)
  const recurrenceEndDate = parseDateOnly(body.recurrenceEndDate)

  if (!title) return { error: '事项名称不能为空' }
  if (!type) return { error: '类型不能为空' }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return { error: `优先级必须为以下之一：${VALID_PRIORITIES.join('、')}` }
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return { error: `状态必须为以下之一：${VALID_STATUSES.join('、')}` }
  }
  if (taskDate === null) return { error: '事项日期不能为空' }
  if (taskDate === undefined) return { error: '事项日期格式不正确' }
  if (dueDate === undefined) return { error: '截止日期格式不正确' }
  if (startTime === undefined) return { error: '开始时间格式不正确' }
  if (endTime === undefined) return { error: '结束时间格式不正确' }
  if (recurrenceType === undefined) return { error: '重复规则无效' }
  if (recurrenceEndDate === undefined) return { error: '重复结束日期格式不正确' }

  const timeRangeError = validateTimeRange(startTime, endTime)
  if (timeRangeError) return { error: timeRangeError }

  return {
    data: {
      title,
      type,
      priority: priority || null,
      dueDate,
      taskDate,
      startTime,
      endTime,
      recurrenceType,
      recurrenceEndDate,
      isRecurring: recurrenceType !== 'none',
      status,
      notes: notes || null,
    },
  }
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const { id } = await params
    const body = await request.json()

    const existing = await findOwnedAdminTask(id, ownerPersonId)
    if (!existing) {
      return NextResponse.json({ error: '行政事项不存在' }, { status: 404 })
    }

    const result = validateTaskBody(body)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const task = await prisma.adminTask.update({
      where: { id },
      data: {
        ...result.data,
        completedAt: completedAtForStatus(result.data.status, existing.status, existing.completedAt),
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

    const existing = await findOwnedAdminTask(id, ownerPersonId)
    if (!existing) {
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

    const existing = await findOwnedAdminTask(id, ownerPersonId)
    if (!existing) {
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
