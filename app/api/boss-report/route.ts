import { NextResponse } from 'next/server'
import { buildBossReportData } from '@/lib/boss-report-utils'
import { getCurrentUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const data = await buildBossReportData({
      startDate: searchParams.get('startDate') || searchParams.get('from'),
      endDate: searchParams.get('endDate') || searchParams.get('to'),
      currentPersonId: user.personId,
    })

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取老板汇报失败'
    const status = message.includes('日期') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
