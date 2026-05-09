'use client'

import React, { useState, useEffect } from 'react'
import QuoteCompareTable from '@/components/quote-compare/QuoteCompareTable'

export default function QuoteComparePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  
  const [filter, setFilter] = useState({
    categoryId: '',
    keyword: '',
    supplierId: '',
    quoteStage: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setCategories(data.filter(c => !c.isArchived))
    })
    fetch('/api/suppliers').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setSuppliers(data.filter(s => !s.isArchived))
    })
  }, [])

  const loadData = async () => {
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
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error(error)
      alert('加载对比数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">报价对比</h1>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
        >
          导出对比结果(CSV)
        </button>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-yellow-800 text-sm">
        <p>
          <strong>注意：</strong>
          当前对比为原始报价对比。若含税、税率、运费口径不同，请结合字段说明判断，不建议仅按价格排序决策。
        </p>
        {!filter.categoryId && (
          <p className="mt-1 text-yellow-700">建议选择特定品类进行对比，以便获得更有针对性的结果。</p>
        )}
      </div>

      {/* Filter Form */}
      <div className="bg-white p-4 rounded shadow-sm border grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">品类</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={filter.categoryId}
            onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}
          >
            <option value="">全部品类</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">产品/型号关键词</label>
          <input
            type="text"
            className="w-full border rounded p-2 text-sm"
            placeholder="如：水泵"
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">供应商</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={filter.supplierId}
            onChange={(e) => setFilter({ ...filter, supplierId: e.target.value })}
          >
            <option value="">全部供应商</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">报价阶段</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={filter.quoteStage}
            onChange={(e) => setFilter({ ...filter, quoteStage: e.target.value })}
          >
            <option value="">全部阶段</option>
            <option value="初次报价">初次报价</option>
            <option value="二次议价">二次议价</option>
            <option value="最终确认价">最终确认价</option>
            <option value="量大优惠价">量大优惠价</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">开始日期</label>
          <input
            type="date"
            className="w-full border rounded p-2 text-sm"
            value={filter.startDate}
            onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">结束日期</label>
          <input
            type="date"
            className="w-full border rounded p-2 text-sm"
            value={filter.endDate}
            onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
          />
        </div>

        <div className="lg:col-span-6 flex justify-end">
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? '查询中...' : '查询'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <QuoteCompareTable data={data} />
      )}
    </div>
  )
}
