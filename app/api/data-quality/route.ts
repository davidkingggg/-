import { NextResponse } from 'next/server'
import { buildDataQualityReport, parseDataQualityFilters } from '@/lib/data-quality-utils'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const filters = parseDataQualityFilters(request)
    const data = await buildDataQualityReport(filters, { currentPersonId: user.personId ?? null })
    return NextResponse.json(data)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : '获取数据质量检查结果失败'
    const status = message.includes('无效') || message.includes('必须') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
