import { NextRequest, NextResponse } from 'next/server'
import { buildCategoryPackage, buildCategoryPackageMarkdown, buildCategoryPackageCSV } from '@/lib/category-package-utils'
import { createCSVHeaders } from '@/lib/csv-utils'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = request.nextUrl
    const categoryId = searchParams.get('categoryId')
    const format = searchParams.get('format') || 'markdown'

    if (!categoryId) {
      return NextResponse.json({ error: '请选择品类' }, { status: 400 })
    }

    if (!['markdown', 'csv'].includes(format)) {
      return NextResponse.json({ error: '导出格式必须为 markdown 或 csv' }, { status: 400 })
    }

    const quoteStartDate = searchParams.get('quoteStartDate') || null
    const quoteEndDate = searchParams.get('quoteEndDate') || null
    const includeNotes = searchParams.get('includeNotes') === 'true'

    const data = await buildCategoryPackage({
      categoryId,
      quoteStartDate,
      quoteEndDate,
      includeNotes,
    })

    const dateStr = new Date().toISOString().slice(0, 10)
    const categoryName = data.category.name

    if (format === 'markdown') {
      const md = buildCategoryPackageMarkdown(data)
      return new NextResponse(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(categoryName)}_package_${dateStr}.md"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    // CSV
    const csv = buildCategoryPackageCSV(data)
    return new NextResponse(csv, {
      headers: {
        ...createCSVHeaders(`${categoryName}_package_${dateStr}.csv`),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : '导出资料包失败'
    const status = message === '品类不存在或已归档' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
