import { NextResponse } from 'next/server'
import { buildDashboardData } from '@/lib/dashboard-utils'
import { getCurrentUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const data = await buildDashboardData(user.personId)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '获取仪表盘数据失败' }, { status: 500 })
  }
}
