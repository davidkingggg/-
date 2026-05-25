import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  buildSalesMaterialCsv,
  buildSalesMaterialMarkdown,
  buildSalesMaterialWhere,
} from '@/lib/sales-material-utils'
import { createCSVHeaders } from '@/lib/csv-utils'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    if (!['csv', 'markdown'].includes(format)) {
      return NextResponse.json({ error: '导出格式必须为 csv 或 markdown' }, { status: 400 })
    }

    const materials = await prisma.salesMaterial.findMany({
      where: buildSalesMaterialWhere(searchParams),
      include: { category: { select: { id: true, name: true } } },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    const date = new Date().toISOString().slice(0, 10)
    if (format === 'markdown') {
      return new NextResponse(buildSalesMaterialMarkdown(materials), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="sales_materials_${date}.md"`,
        },
      })
    }

    return new NextResponse(buildSalesMaterialCsv(materials), {
      headers: createCSVHeaders(`sales_materials_${date}.csv`),
    })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    return NextResponse.json({ error: '导出销售/商务资料失败' }, { status: 500 })
  }
}
