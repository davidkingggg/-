import { NextRequest, NextResponse } from 'next/server'
import { getQuoteCompareData } from '@/lib/quote-compare'
import { formatPrice } from '@/lib/price-utils'

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

    // Build CSV
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

    let csvContent = '\uFEFF' // BOM
    csvContent += headers.join(',') + '\n'

    for (const group of data) {
      if (group.items.length === 0) continue

      // For the first row of each group, we show the group metrics
      // If multiple suppliers, we output multiple rows.
      group.items.forEach((item, index) => {
        const row = [
          index === 0 ? `"${group.compareKey.replace(/"/g, '""')}"` : '',
          index === 0 ? `"${group.productName.replace(/"/g, '""')}"` : '',
          index === 0 ? `"${(group.model || '').replace(/"/g, '""')}"` : '',
          index === 0 ? `"${(group.categoryName || '').replace(/"/g, '""')}"` : '',
          index === 0 ? formatPrice(group.minPrice) : '',
          index === 0 ? formatPrice(group.maxPrice) : '',
          index === 0 ? formatPrice(group.avgPrice) : '',
          `"${item.supplier.name.replace(/"/g, '""')}"`,
          formatPrice(item.price),
          item.includesTax ? '是' : '否',
          item.taxRate ? `"${item.taxRate}%"` : '',
          item.includesFreight ? '是' : '否',
          `"${(item.deliveryTime || '').replace(/"/g, '""')}"`,
          `"${(item.paymentTerms || '').replace(/"/g, '""')}"`,
          `"${(item.warranty || '').replace(/"/g, '""')}"`,
          `"${new Date(item.quoteSheet.quoteDate).toLocaleDateString('zh-CN')}"`
        ]
        csvContent += row.join(',') + '\n'
      })
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="quote_compare_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to export quote compare data:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
