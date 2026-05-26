import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  AUTH_ERROR,
  PERSON_BINDING_ERROR,
  isAuthError,
  isPersonBindingError,
} from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId } from '@/lib/admin-task-auth'
import {
  normalizeRecurrence,
  parseDateOnly,
  parseTime,
  startOfTodayUtcDateOnly,
  validateTimeRange,
} from '@/lib/admin-task-calendar'

const VALID_PRIORITIES = ['高', '中', '低']
const VALID_STATUSES = ['未开始', '进行中', '已完成', '暂停']

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

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
      status,
      dueDate,
      taskDate,
      startTime,
      endTime,
      recurrenceType,
      recurrenceEndDate,
      notes: notes || null,
      isRecurring: recurrenceType !== 'none',
    },
  }
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

export async function GET(request: NextRequest) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const overdue = searchParams.get('overdue')
    const from = parseDateOnly(searchParams.get('from'))
    const to = parseDateOnly(searchParams.get('to'))

    if (from === undefined || to === undefined) {
      return NextResponse.json({ error: '日期筛选格式不正确' }, { status: 400 })
    }

    const where: Prisma.AdminTaskWhereInput = {
      isArchived: false,
      ownerPersonId,
    }
    if (type) where.type = type
    if (status) where.status = status
    if (priority) where.priority = priority
    if (from || to) {
      where.taskDate = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lt: addDays(to, 1) } : {}),
      }
    }
    if (overdue === 'true') {
      where.OR = [
        { taskDate: { lt: startOfTodayUtcDateOnly() } },
        { taskDate: null, dueDate: { lt: startOfTodayUtcDateOnly() } },
      ]
      where.AND = [{ status: { not: '已完成' } }]
    } else if (overdue === 'false') {
      where.OR = [
        { taskDate: null, dueDate: null },
        { taskDate: { gte: startOfTodayUtcDateOnly() } },
        { taskDate: null, dueDate: { gte: startOfTodayUtcDateOnly() } },
        { status: '已完成' },
      ]
    }

    const tasks = await prisma.adminTask.findMany({
      where,
      orderBy: [{ taskDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(tasks)
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '获取行政事项列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const body = await request.json()
    const result = validateTaskBody(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const task = await prisma.adminTask.create({
      data: {
        ...result.data,
        ownerPersonId,
        createdByPersonId: ownerPersonId,
        assigneePersonId: ownerPersonId,
        completedAt: result.data.status === '已完成' ? new Date() : null,
        isArchived: false,
        archivedAt: null,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '新增行政事项失败' }, { status: 500 })
  }
}
