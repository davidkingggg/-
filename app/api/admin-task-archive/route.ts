import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  AUTH_ERROR,
  PERSON_BINDING_ERROR,
  isAuthError,
  isPersonBindingError,
} from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId } from '@/lib/admin-task-auth'
import {
  dateRangeForPeriod,
  isCompletedStatus,
  startOfTodayUtcDateOnly,
} from '@/lib/admin-task-calendar'

function authErrorResponse(error: unknown) {
  if (isAuthError(error)) {
    return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
  }
  if (isPersonBindingError(error)) {
    return NextResponse.json({ error: PERSON_BINDING_ERROR }, { status: 400 })
  }
  return null
}

function todayAnchor() {
  return startOfTodayUtcDateOnly().toISOString().slice(0, 10)
}

function dateRangeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return null
  return (
    error.message === '统计日期格式不正确' ||
    error.message === '统计周期无效'
  ) ? error.message : null
}

export async function GET(request: NextRequest) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const period = request.nextUrl.searchParams.get('period') ?? 'month'
    const anchor = request.nextUrl.searchParams.get('anchor') ?? todayAnchor()
    const range = dateRangeForPeriod(period, anchor)

    const tasks = await prisma.adminTask.findMany({
      where: {
        ownerPersonId,
        isArchived: true,
        taskDate: {
          gte: range.start,
          lt: range.end,
        },
      },
      orderBy: [
        { taskDate: 'desc' },
        { startTime: 'asc' },
        { archivedAt: 'desc' },
      ],
    })

    const today = startOfTodayUtcDateOnly()
    const summary = tasks.reduce(
      (acc, task) => {
        const completed = isCompletedStatus(task.status)
        const dueDate = task.taskDate ?? task.dueDate

        acc.totalCount += 1
        if (completed) acc.completedCount += 1
        if (!completed && dueDate && dueDate.getTime() < today.getTime()) {
          acc.overdueCount += 1
        }
        acc.typeCounts[task.type] = (acc.typeCounts[task.type] ?? 0) + 1

        return acc
      },
      {
        totalCount: 0,
        completedCount: 0,
        overdueCount: 0,
        typeCounts: {} as Record<string, number>,
      }
    )

    return NextResponse.json({ tasks, summary })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    const dateRangeMessage = dateRangeErrorMessage(error)
    if (dateRangeMessage) {
      return NextResponse.json({ error: dateRangeMessage }, { status: 400 })
    }
    return NextResponse.json({ error: '获取行政事项归档失败' }, { status: 500 })
  }
}
