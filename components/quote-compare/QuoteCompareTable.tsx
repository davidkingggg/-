'use client'

import React from 'react'
import { formatPrice } from '@/lib/price-utils'
import Link from 'next/link'
import { DataSurface, StatusBadge } from '@/components/ui/WorkspaceShell'

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

function formatTaxRate(value: number | string | null) {
  if (value === null || value === '') return ''
  const raw = String(value).trim()
  if (raw.endsWith('%')) return raw
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) return raw
  const percent = Math.abs(numeric) <= 1 ? numeric * 100 : numeric
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(2)}%`
}

export default function QuoteCompareTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div data-workspace-motion="enter" className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-[14px] font-semibold text-slate-400">
        暂无对比数据，请调整筛选条件。
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {data.map((group) => (
        <DataSurface key={group.compareKey}>
          {/* Group Header */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-4 md:flex-row md:items-center">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone="primary">{group.categoryName || '未分类'}</StatusBadge>
                <span className="rounded-md bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                  {group.compareKey}
                </span>
              </div>
              <h3 className="truncate text-[18px] font-extrabold text-slate-950">
                {group.productName}
                {group.model && <span className="ml-2 text-[13px] font-semibold text-slate-500">型号: {group.model}</span>}
              </h3>
              <div className="mt-1 text-[12px] font-medium text-slate-500">共 {group.items.length} 条报价明细，价格仅作为初筛依据。</div>
            </div>
            
            {/* Price Metrics */}
            <div
              className="grid h-[72px] w-full min-w-0 grid-cols-3 items-center overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-3 shadow-sm md:ml-auto md:w-[420px] md:flex-none md:px-4"
            >
              <div className="min-w-0 px-2 text-center">
                <div className="text-[11px] font-bold text-slate-400">最低价</div>
                <div className="whitespace-nowrap text-lg font-extrabold tabular-nums text-emerald-600">¥{formatPrice(group.minPrice)}</div>
              </div>
              <div className="min-w-0 border-x border-slate-200 px-2 text-center">
                <div className="text-[11px] font-bold text-slate-400">平均价</div>
                <div className="whitespace-nowrap text-lg font-extrabold tabular-nums text-blue-600">¥{formatPrice(group.avgPrice)}</div>
              </div>
              <div className="min-w-0 px-2 text-center">
                <div className="text-[11px] font-bold text-slate-400">最高价</div>
                <div className="whitespace-nowrap text-lg font-extrabold tabular-nums text-slate-700">¥{formatPrice(group.maxPrice)}</div>
              </div>
            </div>

          </div>

          {/* Group Items */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] table-fixed text-[13px] text-slate-500">
              <colgroup>
                <col className="w-[150px]" />
                <col className="w-[130px]" />
                <col className="w-[140px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[170px]" />
                <col className="w-[120px]" />
                <col className="w-[140px]" />
                <col className="w-[180px]" />
              </colgroup>
              <thead className="bg-white text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">供应商</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">单价</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">含税/税率</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">含运费</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">交期</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">付款条件</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">质保期</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">报价日期</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const isMin = group.minPrice !== null && Number(item.price) === group.minPrice;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 transition hover:bg-blue-50/40">
                      <td className="truncate px-4 py-3 text-left font-bold text-slate-900" title={item.supplier.name}>{item.supplier.name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-extrabold tabular-nums ${isMin ? 'rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-200' : 'text-slate-700'}`}>
                          ¥{formatPrice(item.price)}
                          {isMin && <span className="ml-1 text-[10px]">最低</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.includesTax ? (
                          <span className="font-semibold text-emerald-600">是 {item.taxRate !== null ? `(${formatTaxRate(item.taxRate)})` : ''}</span>
                        ) : (
                          <span className="font-semibold text-rose-500">否</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.includesFreight ? <span className="font-semibold text-emerald-600">是</span> : <span className="font-semibold text-rose-500">否</span>}
                      </td>
                      <td className="px-4 py-3 text-center">{item.deliveryTime || '-'}</td>
                      <td className="px-4 py-3 text-left truncate" title={item.paymentTerms || ''}>{item.paymentTerms || '-'}</td>
                      <td className="px-4 py-3 text-center">{item.warranty || '-'}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{new Date(item.quoteSheet.quoteDate).toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/quotes/${item.quoteSheet.id}`}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
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
        </DataSurface>
      ))}
    </div>
  )
}
