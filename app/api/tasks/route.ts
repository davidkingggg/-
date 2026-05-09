import { NextResponse } from 'next/server'
import { buildTaskAggregation, parseTaskFilters } from '@/lib/task-aggregation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const filters = parseTaskFilters(request)
    const data = await buildTaskAggregation(filters)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取待办数据失败'
    const status = message.includes('无效') || message.includes('必须') || message.includes('只能') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
