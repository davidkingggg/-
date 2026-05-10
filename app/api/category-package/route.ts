import { NextRequest, NextResponse } from 'next/server'
import { buildCategoryPackage } from '@/lib/category-package-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const categoryId = searchParams.get('categoryId')

    if (!categoryId) {
      return NextResponse.json({ error: '请选择品类' }, { status: 400 })
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

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成资料包失败'
    const status = message === '品类不存在或已归档' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
