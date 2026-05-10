import { NextResponse } from 'next/server'
import { buildDataQualityReport, parseDataQualityFilters } from '@/lib/data-quality-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const filters = parseDataQualityFilters(request)
    const data = await buildDataQualityReport(filters)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取数据质量检查结果失败'
    const status = message.includes('无效') || message.includes('必须') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
