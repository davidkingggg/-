'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  DataSurface,
  FilterPanel,
  KpiStrip,
  PageHeader,
  StatusBadge,
  workspaceControlClass,
  workspacePrimaryButtonClass,
} from '@/components/ui/WorkspaceShell'
import { Plus, Search } from 'lucide-react'
import { normalizeListResponse } from '@/lib/list-response'
import WorkspaceMotion from '@/components/ui/WorkspaceMotion'

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

function SuppliersContent({ initialSearch }: { initialSearch: string }) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [riskTags, setRiskTags] = useState<RiskTag[]>([])
  const [loading, setLoading] = useState(true)
  const [archiveTarget, setArchiveTarget] = useState<Supplier | null>(null)

  // 筛选
  const [search, setSearch] = useState(initialSearch)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterRecommended, setFilterRecommended] = useState('')
  const [filterQuoted, setFilterQuoted] = useState('')
  const [filterVisited, setFilterVisited] = useState('')
  const [filterRiskTag, setFilterRiskTag] = useState('')

  const { showToast } = useToast()

  // 获取品类和标签用于筛选
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then((data) => setCategories(normalizeListResponse<CategoryOption>(data))).catch(() => {})
    fetch('/api/risk-tags').then(r => r.json()).then((data) => setRiskTags(normalizeListResponse<RiskTag>(data))).catch(() => {})
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
        if (res.status === 401) {
          router.push('/login')
          return
        }
        if (!res.ok) throw new Error()
        setSuppliers(normalizeListResponse<Supplier>(await res.json()))
      } catch {
        showToast('获取供应商列表失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(() => { load() }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search, filterCategory, filterRegion, filterRecommended, filterQuoted, filterVisited, filterRiskTag, reloadKey, router, showToast])

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
      setArchiveTarget(null)
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
  const activeFilterCount = [search, filterCategory, filterRegion, filterRecommended, filterQuoted, filterVisited, filterRiskTag].filter(Boolean).length
  const recommendedCount = suppliers.filter(s => s.recommendedLevel === 'A优先推荐' || s.recommendedLevel === 'B备选').length
  const riskCount = suppliers.filter(s => s.riskTags.length > 0).length

  return (
    <WorkspaceMotion>
    <div className="space-y-5">
      <PageHeader
        eyebrow="公共数据"
        title="供应商库"
        description="以供应商、主品类、推荐等级和风险标签为核心维护采购资源池。"
        meta={
          <>
            <StatusBadge tone="primary">当前 {suppliers.length} 家</StatusBadge>
            <StatusBadge tone={riskCount > 0 ? 'warning' : 'success'}>风险标记 {riskCount}</StatusBadge>
          </>
        }
        actions={
        <Link
          href="/suppliers/new"
          className={workspacePrimaryButtonClass}
        >
          <Plus className="h-4 w-4" />
          新增供应商
        </Link>
        }
      />

      <KpiStrip
        columns={4}
        items={[
          { label: '供应商', value: suppliers.length, hint: '当前列表', tone: 'primary' },
          { label: '推荐/备选', value: recommendedCount, hint: 'A/B 等级', tone: 'success' },
          { label: '有报价', value: suppliers.filter(s => s.hasQuoted).length, hint: '已沉淀价格', tone: 'slate' },
          { label: '风险标签', value: riskCount, hint: '需复核供应商', tone: riskCount ? 'warning' : 'neutral' },
        ]}
      />

      {/* 筛选栏 */}
      <FilterPanel summary={`当前启用 ${activeFilterCount} 个筛选条件`} actions={<span className="text-[12px] font-semibold text-slate-400">搜索会自动防抖刷新</span>}>
      <div className="flex flex-wrap gap-3">
        <div className="relative w-64 max-w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索供应商名称..."
          className={`${workspaceControlClass} w-full pl-9`}
        />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={workspaceControlClass}
        >
          <option value="">全部品类</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className={workspaceControlClass}
        >
          <option value="">全部地区</option>
          {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterRecommended}
          onChange={(e) => setFilterRecommended(e.target.value)}
          className={workspaceControlClass}
        >
          <option value="">全部推荐等级</option>
          {RECOMMENDED_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          value={filterQuoted}
          onChange={(e) => setFilterQuoted(e.target.value)}
          className={workspaceControlClass}
        >
          <option value="">是否报价</option>
          <option value="true">已报价</option>
          <option value="false">未报价</option>
        </select>
        <select
          value={filterVisited}
          onChange={(e) => setFilterVisited(e.target.value)}
          className={workspaceControlClass}
        >
          <option value="">是否考察</option>
          <option value="true">已考察</option>
          <option value="false">未考察</option>
        </select>
        <select
          value={filterRiskTag}
          onChange={(e) => setFilterRiskTag(e.target.value)}
          className={workspaceControlClass}
        >
          <option value="">全部风险标签</option>
          {riskTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      </FilterPanel>

      {/* 表格 */}
      <DataSurface>
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无供应商数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 h-[48px] text-[12px] font-extrabold text-slate-500">供应商名称</th>
                  <th className="text-left px-4 h-[48px] text-[12px] font-extrabold text-slate-500">主品类</th>
                  <th className="text-left px-4 h-[48px] text-[12px] font-extrabold text-slate-500">地区</th>
                  <th className="text-center px-4 h-[48px] text-[12px] font-extrabold text-slate-500">推荐等级</th>
                  <th className="text-center px-4 h-[48px] text-[12px] font-extrabold text-slate-500">报价</th>
                  <th className="text-center px-4 h-[48px] text-[12px] font-extrabold text-slate-500">考察</th>
                  <th className="text-left px-4 h-[48px] text-[12px] font-extrabold text-slate-500">风险标签</th>
                  <th className="text-right px-6 h-[48px] text-[12px] font-extrabold text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-b-0 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 h-[58px] text-[14px] font-bold text-[#0f172a]">
                      <Link href={`/suppliers/${s.id}`} className="hover:text-blue-600 transition-colors">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 h-[58px] text-[14px] text-[#475569]">{s.category.name}</td>
                    <td className="px-4 h-[58px] text-[14px] text-[#475569]">{s.region || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      {s.recommendedLevel ? (
                        <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold ${recColors[s.recommendedLevel] || ''}`}>
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
                        className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-800 mr-4"
                      >
                        详情
                      </Link>
                      <button
                        onClick={() => setArchiveTarget(s)}
                        className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700"
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
      </DataSurface>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="确认归档供应商"
        message={`确定要归档供应商「${archiveTarget?.name}」吗？归档后将不在列表中显示。`}
        confirmText="确认归档"
      />
    </div>
    </WorkspaceMotion>
  )
}

function SuppliersRouteContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  return <SuppliersContent key={initialSearch} initialSearch={initialSearch} />
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[13px] font-semibold text-slate-400">加载供应商工作台...</div>}>
      <SuppliersRouteContent />
    </Suspense>
  )
}
