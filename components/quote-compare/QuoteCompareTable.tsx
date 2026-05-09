'use client'

import React from 'react'
import { formatPrice } from '@/lib/price-utils'
import Link from 'next/link'

interface QuoteItem {
  id: string
  supplierId: string
  categoryId: string
  compareKey: string
  productName: string
  model: string | null
  price: number | string | null
  includesTax: boolean
  taxRate: number | string | null
  includesFreight: boolean
  deliveryTime: string | null
  paymentTerms: string | null
  warranty: string | null
  supplier: { id: string; name: string }
  quoteSheet: { id: string; quoteDate: string | Date }
}

interface CompareGroup {
  compareKey: string
  productName: string
  model: string | null
  categoryId: string
  categoryName: string
  minPrice: number | null
  maxPrice: number | null
  avgPrice: number | null
  items: QuoteItem[]
}

interface Props {
  data: CompareGroup[]
}

export default function QuoteCompareTable({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500">暂无对比数据，请调整筛选条件。</div>
  }

  return (
    <div className="space-y-8">
      {data.map((group) => (
        <div key={group.compareKey} className="bg-white border rounded-lg shadow-sm overflow-hidden">
          {/* Group Header */}
          <div className="bg-gray-50 px-4 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {group.productName}
                {group.model && <span className="ml-2 text-sm text-gray-500 font-normal">型号: {group.model}</span>}
              </h3>
              <div className="text-sm text-gray-500 mt-1">
                对比键: <span className="font-mono bg-gray-200 px-1 rounded">{group.compareKey}</span>
                <span className="mx-2">|</span>
                品类: {group.categoryName || '-'}
              </div>
            </div>
            
            {/* Price Metrics */}
            <div className="flex items-center gap-6 bg-white px-4 py-2 rounded-md border shadow-sm">
              <div className="text-center">
                <div className="text-xs text-gray-500">最低价</div>
                <div className="text-lg font-bold text-green-600">¥{formatPrice(group.minPrice)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">平均价</div>
                <div className="text-base font-semibold text-blue-600">¥{formatPrice(group.avgPrice)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">最高价</div>
                <div className="text-base text-gray-700">¥{formatPrice(group.maxPrice)}</div>
              </div>
            </div>
          </div>

          {/* Group Items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-3">供应商</th>
                  <th className="px-4 py-3">单价</th>
                  <th className="px-4 py-3">含税/税率</th>
                  <th className="px-4 py-3">含运费</th>
                  <th className="px-4 py-3">交期</th>
                  <th className="px-4 py-3">付款条件</th>
                  <th className="px-4 py-3">质保期</th>
                  <th className="px-4 py-3">报价日期</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const isMin = group.minPrice !== null && Number(item.price) === group.minPrice;
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.supplier.name}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${isMin ? 'text-green-600 px-2 py-1 bg-green-50 rounded-full' : ''}`}>
                          ¥{formatPrice(item.price)}
                          {isMin && <span className="ml-1 text-xs">⭐</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.includesTax ? (
                          <span className="text-green-600">是 {item.taxRate !== null ? `(${item.taxRate}%)` : ''}</span>
                        ) : (
                          <span className="text-red-500">否</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.includesFreight ? <span className="text-green-600">是</span> : <span className="text-red-500">否</span>}
                      </td>
                      <td className="px-4 py-3">{item.deliveryTime || '-'}</td>
                      <td className="px-4 py-3 truncate max-w-[150px]" title={item.paymentTerms || ''}>{item.paymentTerms || '-'}</td>
                      <td className="px-4 py-3">{item.warranty || '-'}</td>
                      <td className="px-4 py-3">{new Date(item.quoteSheet.quoteDate).toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/quotes/${item.quoteSheet.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          target="_blank"
                        >
                          查看/编辑报价单
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
