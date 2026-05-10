import { NextRequest, NextResponse } from 'next/server'
import { getQuoteCompareData } from '@/lib/quote-compare'
import { formatPrice } from '@/lib/price-utils'
import { createCSVResponse, formatCSVBoolean, formatCSVDate, formatCSVPercent, type CSVValue } from '@/lib/csv-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = {
      categoryId: searchParams.get('categoryId'),
      compareKey: searchParams.get('compareKey'),
      keyword: searchParams.get('keyword'),
      supplierId: searchParams.get('supplierId'),
      quoteStage: searchParams.get('quoteStage'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }

    const data = await getQuoteCompareData(filter)

    const headers = [
      '对比键(产品+型号)',
      '产品名称',
      '型号',
      '品类',
      '最低价',
      '最高价',
      '平均价',
      '供应商',
      '单价',
      '含税',
      '税率',
      '含运费',
      '交期',
      '付款条件',
      '质保期',
      '报价日期'
    ]

    const rows: CSVValue[][] = [headers]

    for (const group of data) {
      if (group.items.length === 0) continue

      group.items.forEach((item, index) => {
        rows.push([
          index === 0 ? group.compareKey : '',
          index === 0 ? group.productName : '',
          index === 0 ? group.model || '' : '',
          index === 0 ? group.categoryName || '' : '',
          index === 0 ? formatPrice(group.minPrice) : '',
          index === 0 ? formatPrice(group.maxPrice) : '',
          index === 0 ? formatPrice(group.avgPrice) : '',
          item.supplier.name,
          formatPrice(item.price),
          formatCSVBoolean(item.includesTax),
          formatCSVPercent(item.taxRate),
          formatCSVBoolean(item.includesFreight),
          item.deliveryTime || '',
          item.paymentTerms || '',
          item.warranty || '',
          formatCSVDate(item.quoteSheet.quoteDate),
        ])
      })
    }

    return createCSVResponse(rows, `quote_compare_${new Date().toISOString().split('T')[0]}.csv`)
  } catch (error) {
    console.error('Failed to export quote compare data:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
