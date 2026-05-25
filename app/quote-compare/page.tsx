'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import QuoteCompareTable from '@/components/quote-compare/QuoteCompareTable'

type CategoryOption = { id: string; name: string; isArchived?: boolean }
type SupplierOption = { id: string; name: string }
type CompareKeyOption = { value: string; label: string }

type FilterState = {
  categoryId: string
  productName: string
  model: string
  compareKey: string
  supplierId: string
  quoteStage: string
  startDate: string
  endDate: string
  sortMode: string
}

type FilterOptions = {
  suppliers: SupplierOption[]
  productNames: string[]
  models: string[]
  compareKeys: CompareKeyOption[]
  quoteStages: string[]
}

const emptyFilter: FilterState = {
  categoryId: '',
  productName: '',
  model: '',
  compareKey: '',
  supplierId: '',
  quoteStage: '',
  startDate: '',
  endDate: '',
  sortMode: '',
}

const emptyOptions: FilterOptions = {
  suppliers: [],
  productNames: [],
  models: [],
  compareKeys: [],
  quoteStages: [],
}

function appendFilterParams(query: URLSearchParams, filter: FilterState) {
  if (filter.categoryId) query.append('categoryId', filter.categoryId)
  if (filter.productName) query.append('productName', filter.productName)
  if (filter.model) query.append('model', filter.model)
  if (filter.compareKey) query.append('compareKey', filter.compareKey)
  if (filter.supplierId) query.append('supplierId', filter.supplierId)
  if (filter.quoteStage) query.append('quoteStage', filter.quoteStage)
  if (filter.startDate) query.append('startDate', filter.startDate)
  if (filter.endDate) query.append('endDate', filter.endDate)
  if (filter.sortMode) query.append('sortMode', filter.sortMode)
}

function normalizeOptions(options: Partial<FilterOptions> & { products?: CompareKeyOption[] }): FilterOptions {
  return {
    suppliers: Array.isArray(options.suppliers) ? options.suppliers : [],
    productNames: Array.isArray(options.productNames) ? options.productNames : [],
    models: Array.isArray(options.models) ? options.models : [],
    compareKeys: Array.isArray(options.compareKeys) ? options.compareKeys : Array.isArray(options.products) ? options.products : [],
    quoteStages: Array.isArray(options.quoteStages) ? options.quoteStages : [],
  }
}

export default function QuoteComparePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(emptyOptions)
  const [filter, setFilter] = useState<FilterState>(emptyFilter)
  const [optionsError, setOptionsError] = useState('')

  const hasFilters = useMemo(
    () => Boolean(
      filter.categoryId ||
      filter.productName ||
      filter.model ||
      filter.compareKey ||
      filter.supplierId ||
      filter.quoteStage ||
      filter.startDate ||
      filter.endDate ||
      filter.sortMode
    ),
    [filter]
  )

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data: CategoryOption[]) => {
        if (Array.isArray(data)) setCategories(data.filter((category) => !category.isArchived))
      })
      .catch(() => {
        // 列表加载失败时保持空选项，页面仍可通过已有筛选查询。
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams()
    appendFilterParams(query, filter)

    const loadOptions = async () => {
      setOptionsLoading(true)
      try {
        const res = await fetch(`/api/quote-compare/options?${query.toString()}`, { signal: controller.signal })
        if (!res.ok) throw new Error('获取报价对比筛选项失败')
        const nextOptions = normalizeOptions(await res.json())
        setOptionsError('')
        setFilterOptions(nextOptions)
        setFilter((current) => {
          const productValid = !current.productName || nextOptions.productNames.includes(current.productName)
          const modelValid = productValid && (!current.model || nextOptions.models.includes(current.model))
          const compareKeyValid = modelValid && (!current.compareKey || nextOptions.compareKeys.some((item) => item.value === current.compareKey))
          const supplierValid = !current.supplierId || nextOptions.suppliers.some((supplier) => supplier.id === current.supplierId)
          const stageValid = !current.quoteStage || nextOptions.quoteStages.includes(current.quoteStage)

          if (productValid && modelValid && compareKeyValid && supplierValid && stageValid) return current

          return {
            ...current,
            productName: productValid ? current.productName : '',
            model: modelValid ? current.model : '',
            compareKey: compareKeyValid ? current.compareKey : '',
            supplierId: supplierValid ? current.supplierId : '',
            quoteStage: stageValid ? current.quoteStage : '',
          }
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setOptionsError('筛选项加载失败，已保留当前可选项。请稍后重试或点击“查询”刷新结果。')
      } finally {
        setOptionsLoading(false)
      }
    }

    void loadOptions()

    return () => controller.abort()
  }, [filter])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      appendFilterParams(query, filter)
      const res = await fetch(`/api/quote-compare?${query.toString()}`)
      if (!res.ok) throw new Error('加载报价对比数据失败')
      setData(await res.json())
    } catch {
      // 页面保留当前结果，避免一次网络错误把对比表清空。
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [loadData])

  const handleExport = () => {
    const query = new URLSearchParams()
    appendFilterParams(query, filter)
    window.open(`/api/quote-compare/export?${query.toString()}`, '_blank')
  }

  const updateFilter = (patch: Partial<FilterState>) => {
    setFilter((current) => ({ ...current, ...patch }))
  }

  const selectClass = 'w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-300'
  const inputClass = 'w-full h-9 border border-[#e5eaf3] rounded-xl px-3 text-[13px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const labelClass = 'block text-[12px] text-slate-400 font-medium mb-1.5'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">报价对比</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">跨供应商对比同类产品报价，辅助采购决策</p>
        </div>
        <button onClick={handleExport} className="h-9 px-5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-[13px] font-semibold shadow-sm">导出对比结果 (CSV)</button>
      </div>

      <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
        <span className="text-amber-500 mt-0.5">&#9888;</span>
        <div>
          <p><strong>注意：</strong>当前对比为原始报价对比。若含税、税率、运费口径不同，请结合字段说明判断，不建议仅按价格排序决策。</p>
          {!filter.categoryId && <p className="mt-1 text-amber-600 text-[12px]">建议先选择品类，再按产品、型号、关键词逐级收窄对比范围。</p>}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#e5eaf3] p-5 mb-4" style={{ boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3">
          <div>
            <label className={labelClass}>品类</label>
            <select
              value={filter.categoryId}
              onChange={(event) => updateFilter({ categoryId: event.target.value, productName: '', model: '', compareKey: '', supplierId: '', quoteStage: '' })}
              className={selectClass}
            >
              <option value="">全部品类</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>产品</label>
            <select
              value={filter.productName}
              onChange={(event) => updateFilter({ productName: event.target.value, model: '', compareKey: '', supplierId: '', quoteStage: '' })}
              disabled={optionsLoading && filterOptions.productNames.length === 0}
              className={selectClass}
            >
              <option value="">全部产品</option>
              {filterOptions.productNames.map((productName) => <option key={productName} value={productName}>{productName}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>型号</label>
            <select
              value={filter.model}
              onChange={(event) => updateFilter({ model: event.target.value, compareKey: '', supplierId: '', quoteStage: '' })}
              disabled={optionsLoading && filterOptions.models.length === 0}
              className={selectClass}
            >
              <option value="">全部型号</option>
              {filterOptions.models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>关键词/规格</label>
            <select
              value={filter.compareKey}
              onChange={(event) => updateFilter({ compareKey: event.target.value, supplierId: '', quoteStage: '' })}
              disabled={optionsLoading && filterOptions.compareKeys.length === 0}
              className={selectClass}
            >
              <option value="">全部关键词</option>
              {filterOptions.compareKeys.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>供应商</label>
            <select
              value={filter.supplierId}
              onChange={(event) => updateFilter({ supplierId: event.target.value })}
              disabled={optionsLoading && filterOptions.suppliers.length === 0}
              className={selectClass}
            >
              <option value="">全部供应商</option>
              {filterOptions.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>报价阶段</label>
            <select
              value={filter.quoteStage}
              onChange={(event) => updateFilter({ quoteStage: event.target.value })}
              disabled={optionsLoading && filterOptions.quoteStages.length === 0}
              className={selectClass}
            >
              <option value="">全部阶段</option>
              {filterOptions.quoteStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>排序方式</label>
            <select
              value={filter.sortMode}
              onChange={(event) => updateFilter({ sortMode: event.target.value })}
              className={selectClass}
            >
              <option value="">默认排序</option>
              <option value="priceAsc">价格从低到高</option>
              <option value="priceDesc">价格从高到低</option>
              <option value="paramAsc">参数从小到大</option>
              <option value="paramDesc">参数从大到小</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>开始日期</label>
            <input type="date" value={filter.startDate} onChange={(event) => updateFilter({ startDate: event.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>结束日期</label>
            <input type="date" value={filter.endDate} onChange={(event) => updateFilter({ endDate: event.target.value })} className={inputClass} />
          </div>
        </div>
        <div className="flex flex-col gap-3 mt-4 pt-3 border-t border-[#eef2f7] sm:flex-row sm:justify-end">
          {optionsError && (
            <div className="self-start text-[12px] text-amber-600 sm:mr-auto sm:self-center">{optionsError}</div>
          )}
          {hasFilters && (
            <button onClick={() => setFilter(emptyFilter)} className="h-9 px-3 rounded-xl text-[12px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">重置</button>
          )}
          <button onClick={loadData} disabled={loading} className="h-9 px-6 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-[13px] font-semibold">
            {loading ? '查询中...' : '查询'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-20 text-[14px]">加载中...</div>
      ) : (
        <QuoteCompareTable data={data} />
      )}
    </div>
  )
}
