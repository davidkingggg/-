'use client'

import React, { useState, useEffect } from 'react'
import QuoteCompareTable from '@/components/quote-compare/QuoteCompareTable'

export default function QuoteComparePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])

  const [filter, setFilter] = useState({
    categoryId: '', keyword: '', supplierId: '', quoteStage: '', startDate: '', endDate: ''
  })

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setCategories(data.filter(c => !c.isArchived))
    })
    fetch('/api/suppliers').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setSuppliers(data.filter(s => !s.isArchived))
    })
  }, [])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filter.categoryId) query.append('categoryId', filter.categoryId)
      if (filter.keyword) query.append('keyword', filter.keyword)
      if (filter.supplierId) query.append('supplierId', filter.supplierId)
      if (filter.quoteStage) query.append('quoteStage', filter.quoteStage)
      if (filter.startDate) query.append('startDate', filter.startDate)
      if (filter.endDate) query.append('endDate', filter.endDate)
      const res = await fetch(`/api/quote-compare?${query.toString()}`)
      if (!res.ok) throw new Error('加载失败')
      setData(await res.json())
    } catch {
      // handled silently
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExport = () => {
    const query = new URLSearchParams()
    if (filter.categoryId) query.append('categoryId', filter.categoryId)
    if (filter.keyword) query.append('keyword', filter.keyword)
    if (filter.supplierId) query.append('supplierId', filter.supplierId)
    if (filter.quoteStage) query.append('quoteStage', filter.quoteStage)
    if (filter.startDate) query.append('startDate', filter.startDate)
    if (filter.endDate) query.append('endDate', filter.endDate)
    window.open(`/api/quote-compare/export?${query.toString()}`, '_blank')
  }

  const hasFilters = filter.categoryId || filter.keyword || filter.supplierId || filter.quoteStage || filter.startDate || filter.endDate

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">报价对比</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">跨供应商对比同类产品报价，辅助采购决策</p>
        </div>
        <button onClick={handleExport} className="h-9 px-5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-[13px] font-semibold shadow-sm">导出对比结果 (CSV)</button>
      </div>

      {/* Notice */}
      <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
        <span className="text-amber-500 mt-0.5">&#9888;</span>
        <div>
          <p><strong>注意：</strong>当前对比为原始报价对比。若含税、税率、运费口径不同，请结合字段说明判断，不建议仅按价格排序决策。</p>
          {!filter.categoryId && <p className="mt-1 text-amber-600 text-[12px]">建议选择特定品类进行对比，以便获得更有针对性的结果。</p>}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl bg-white border border-[#e5eaf3] p-5 mb-4" style={{ boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)' }}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[12px] text-slate-400 font-medium mb-1.5">品类</label>
            <select value={filter.categoryId} onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })} className="w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">全部品类</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-slate-400 font-medium mb-1.5">产品/型号关键词</label>
            <input type="text" value={filter.keyword} onChange={(e) => setFilter({ ...filter, keyword: e.target.value })} placeholder="如：水泵" className="w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] text-[#0f172a] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-[12px] text-slate-400 font-medium mb-1.5">供应商</label>
            <select value={filter.supplierId} onChange={(e) => setFilter({ ...filter, supplierId: e.target.value })} className="w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">全部供应商</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-slate-400 font-medium mb-1.5">报价阶段</label>
            <select value={filter.quoteStage} onChange={(e) => setFilter({ ...filter, quoteStage: e.target.value })} className="w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">全部阶段</option>
              <option value="初次报价">初次报价</option>
              <option value="二次议价">二次议价</option>
              <option value="最终确认价">最终确认价</option>
              <option value="量大优惠价">量大优惠价</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-slate-400 font-medium mb-1.5">开始日期</label>
            <input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} className="w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-[12px] text-slate-400 font-medium mb-1.5">结束日期</label>
            <input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} className="w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-[#eef2f7]">
          {hasFilters && (
            <button onClick={() => setFilter({ categoryId: '', keyword: '', supplierId: '', quoteStage: '', startDate: '', endDate: '' })} className="h-9 px-3 rounded-xl text-[12px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">重置</button>
          )}
          <button onClick={loadData} disabled={loading} className="h-9 px-6 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-[13px] font-semibold">
            {loading ? '查询中...' : '查询'}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center text-slate-400 py-20 text-[14px]">加载中...</div>
      ) : (
        <QuoteCompareTable data={data} />
      )}
    </div>
  )
}
