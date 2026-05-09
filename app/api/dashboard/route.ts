import { NextResponse } from 'next/server'
import { buildDashboardData } from '@/lib/dashboard-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await buildDashboardData()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '获取仪表盘数据失败' }, { status: 500 })
  }
}
