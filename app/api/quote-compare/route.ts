import { NextRequest, NextResponse } from 'next/server'
import { getQuoteCompareData } from '@/lib/quote-compare'
import { AUTH_ERROR, isAuthError, requireUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const filter = {
      categoryId: searchParams.get('categoryId'),
      productName: searchParams.get('productName'),
      model: searchParams.get('model'),
      compareKey: searchParams.get('compareKey'),
      keyword: searchParams.get('keyword'),
      supplierId: searchParams.get('supplierId'),
      quoteStage: searchParams.get('quoteStage'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }

    const data = await getQuoteCompareData(filter)
    return NextResponse.json(data)
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }
    console.error('Failed to get quote compare data:', error)
    return NextResponse.json({ error: '获取报价对比数据失败' }, { status: 500 })
  }
}
