'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface RiskTagRelation {
  riskTag: { id: string; name: string; color: string | null }
}

interface Supplier {
  id: string
  name: string
  categoryId: string
  category: { id: string; name: string }
  region: string | null
  companyType: string | null
  hasQuoted: boolean
  hasVisited: boolean
  recommendedLevel: string | null
  riskTags: RiskTagRelation[]
}

interface CategoryOption {
  id: string
  name: string
}

interface RiskTag {
  id: string
  name: string
}

const RECOMMENDED_LEVELS = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [riskTags, setRiskTags] = useState<RiskTag[]>([])
  const [loading, setLoading] = useState(true)
  const [archiveTarget, setArchiveTarget] = useState<Supplier | null>(null)

  // 筛选
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterRecommended, setFilterRecommended] = useState('')
  const [filterQuoted, setFilterQuoted] = useState('')
  const [filterVisited, setFilterVisited] = useState('')
  const [filterRiskTag, setFilterRiskTag] = useState('')

  const { showToast } = useToast()

  // 获取品类和标签用于筛选
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/risk-tags').then(r => r.json()).then(setRiskTags).catch(() => {})
  }, [])

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (filterCategory) params.set('categoryId', filterCategory)
        if (filterRegion) params.set('region', filterRegion)
        if (filterRecommended) params.set('recommendedLevel', filterRecommended)
        if (filterQuoted) params.set('hasQuoted', filterQuoted)
        if (filterVisited) params.set('hasVisited', filterVisited)
        if (filterRiskTag) params.set('riskTagId', filterRiskTag)
        const res = await fetch(`/api/suppliers?${params.toString()}`)
        if (!res.ok) throw new Error()
        setSuppliers(await res.json())
      } catch {
        showToast('获取供应商列表失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(() => { load() }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search, filterCategory, filterRegion, filterRecommended, filterQuoted, filterVisited, filterRiskTag, reloadKey, showToast])

  function reload() { setReloadKey(k => k + 1) }

  async function handleArchive() {
    if (!archiveTarget) return
    try {
      const res = await fetch(`/api/suppliers/${archiveTarget.id}`, { method: 'PATCH' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast('供应商已归档', 'success')
      reload()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '归档失败', 'error')
    }
  }

  const recColors: Record<string, string> = {
    'A优先推荐': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'B备选': 'bg-blue-50 text-blue-700 border border-blue-200',
    'C暂不推荐': 'bg-orange-50 text-orange-700 border border-orange-200',
    '未评级': 'bg-gray-50 text-gray-500 border border-gray-200',
  }

  // 收集地区选项
  const regionOptions = [...new Set(suppliers.map(s => s.region).filter(Boolean))] as string[]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">供应商库</h1>
          <p className="text-sm text-gray-500 mt-1">以供应商和主品类为核心的维护库</p>
        </div>
        <Link
          href="/suppliers/new"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm inline-block"
        >
          + 新增供应商
        </Link>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索供应商名称..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部品类</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部地区</option>
          {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterRecommended}
          onChange={(e) => setFilterRecommended(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部推荐等级</option>
          {RECOMMENDED_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          value={filterQuoted}
          onChange={(e) => setFilterQuoted(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">是否报价</option>
          <option value="true">已报价</option>
          <option value="false">未报价</option>
        </select>
        <select
          value={filterVisited}
          onChange={(e) => setFilterVisited(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">是否考察</option>
          <option value="true">已考察</option>
          <option value="false">未考察</option>
        </select>
        <select
          value={filterRiskTag}
          onChange={(e) => setFilterRiskTag(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部风险标签</option>
          {riskTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无供应商数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">供应商名称</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">主品类</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">地区</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600">推荐等级</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600">报价</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600">考察</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">风险标签</th>
                  <th className="text-right px-6 py-3.5 font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <Link href={`/suppliers/${s.id}`} className="hover:text-blue-600 transition-colors">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{s.category.name}</td>
                    <td className="px-4 py-4 text-gray-600">{s.region || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      {s.recommendedLevel ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${recColors[s.recommendedLevel] || ''}`}>
                          {s.recommendedLevel}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {s.hasQuoted ? (
                        <span className="text-emerald-600 font-medium">✓</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {s.hasVisited ? (
                        <span className="text-emerald-600 font-medium">✓</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {s.riskTags.length > 0 ? s.riskTags.map((rt) => (
                          <span key={rt.riskTag.id} className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600 border border-red-200">
                            {rt.riskTag.name}
                          </span>
                        )) : <span className="text-gray-300">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-medium"
                      >
                        详情
                      </Link>
                      <button
                        onClick={() => setArchiveTarget(s)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        归档
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="确认归档供应商"
        message={`确定要归档供应商「${archiveTarget?.name}」吗？归档后将不在列表中显示。`}
        confirmText="确认归档"
      />
    </div>
  )
}
