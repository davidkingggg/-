import { NextResponse } from 'next/server'
import { buildBossReportData, buildBossReportCsvRows, buildCsvContent } from '@/lib/boss-report-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const data = await buildBossReportData({
      startDate: searchParams.get('startDate') || searchParams.get('from'),
      endDate: searchParams.get('endDate') || searchParams.get('to'),
    })
    const csvContent = buildCsvContent(buildBossReportCsvRows(data))

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="boss_report_${data.range.startDate}_${data.range.endDate}.csv"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '导出老板汇报失败'
    const status = message.includes('日期') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
