import { NextResponse } from 'next/server'
import { buildTaskAggregation, parseTaskFilters } from '@/lib/task-aggregation'
import { getCurrentUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const filters = parseTaskFilters(request)
    const data = await buildTaskAggregation(filters, user.personId)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取待办数据失败'
    const status = message.includes('无效') || message.includes('必须') || message.includes('只能') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
