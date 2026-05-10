import { NextResponse } from 'next/server'
import {
  buildDataQualityCsvRows,
  buildDataQualityReport,
  parseDataQualityFilters,
} from '@/lib/data-quality-utils'
import { buildCSVContent } from '@/lib/csv-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const filters = parseDataQualityFilters(request)
    const data = await buildDataQualityReport(filters)
    const csvContent = buildCSVContent(buildDataQualityCsvRows(data))

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="data-quality-export.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '导出数据质量检查结果失败'
    const status = message.includes('无效') || message.includes('必须') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
