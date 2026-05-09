import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

const VALID_PRIORITIES = ['高', '中', '低']
const VALID_STATUSES = ['未开始', '进行中', '已完成', '暂停']

function startOfTodayUtcDateOnly() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function parseDueDate(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
  if (!dateOnlyPattern.test(value)) return undefined

  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function validateTaskBody(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const type = typeof body.type === 'string' ? body.type.trim() : ''
  const priority = typeof body.priority === 'string' ? body.priority : ''
  const status = typeof body.status === 'string' ? body.status : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  const dueDate = parseDueDate(body.dueDate)

  if (!title) return { error: '事项名称不能为空' }
  if (!type) return { error: '类型不能为空' }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return { error: `优先级必须为以下之一：${VALID_PRIORITIES.join('、')}` }
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return { error: `状态必须为以下之一：${VALID_STATUSES.join('、')}` }
  }
  if (dueDate === undefined) return { error: '截止日期格式不正确' }

  return {
    data: {
      title,
      type,
      priority: priority || null,
      status,
      dueDate,
      notes: notes || null,
      isRecurring: Boolean(body.isRecurring),
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const overdue = searchParams.get('overdue')

    const where: Prisma.AdminTaskWhereInput = { isArchived: false }
    if (type) where.type = type
    if (status) where.status = status
    if (priority) where.priority = priority
    if (overdue === 'true') {
      where.dueDate = { lt: startOfTodayUtcDateOnly() }
      where.status = { not: '已完成' }
    } else if (overdue === 'false') {
      where.OR = [
        { dueDate: null },
        { dueDate: { gte: startOfTodayUtcDateOnly() } },
        { status: '已完成' },
      ]
    }

    const tasks = await prisma.adminTask.findMany({
      where,
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json({ error: '获取行政事项列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = validateTaskBody(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const task = await prisma.adminTask.create({
      data: {
        ...result.data,
        completedAt: result.data.status === '已完成' ? new Date() : null,
        isArchived: false,
        archivedAt: null,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: '新增行政事项失败' }, { status: 500 })
  }
}
