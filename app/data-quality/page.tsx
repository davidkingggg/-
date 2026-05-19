'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type {
  DataQualityCheckKey,
  DataQualityIssue,
  DataQualityResponse,
  DataQualitySeverity,
} from '@/lib/data-quality-utils'

interface Category {
  id: string
  name: string
}

const CHECK_OPTIONS: Array<{ value: DataQualityCheckKey; label: string }> = [
  { value: 'duplicateSuppliers', label: '重复供应商' },
  { value: 'suppliersMissingContacts', label: '供应商缺少联系人' },
  { value: 'suppliersMissingValidScores', label: '供应商缺少有效评分' },
  { value: 'quoteItemsMissingCompareKey', label: '报价明细缺少 compareKey' },
  { value: 'developmentMissingFollowUp', label: '开发流程缺少跟进信息' },
  { value: 'purchaseMissingFollowUp', label: '采购流程缺少跟进信息' },
  { value: 'longPausedOrAbnormalOpenItems', label: '长期异常/暂停未关闭事项' },
  { value: 'overdueAdminTasks', label: '行政事项超期未完成' },
  { value: 'salesMaterialsMissingFormalText', label: '销售/商务资料缺少正式正文' },
]

const EMPTY_RESPONSE: DataQualityResponse = {
  summary: {
    totalIssues: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    generatedAt: '',
  },
  checks: [],
}

function severityLabel(severity: DataQualitySeverity) {
  if (severity === 'high') return '高风险'
  if (severity === 'medium') return '中风险'
  return '低风险'
}

function severityClass(severity: DataQualitySeverity) {
  if (severity === 'high') return 'bg-red-50 text-red-700 ring-red-100'
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 ring-amber-100'
  return 'bg-slate-50 text-slate-700 ring-slate-100'
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function metaValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

export default function DataQualityPage() {
  const [data, setData] = useState<DataQualityResponse>(EMPTY_RESPONSE)
  const [categories, setCategories] = useState<Category[]>([])
  const [check, setCheck] = useState('')
  const [severity, setSeverity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('50')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (check) params.set('check', check)
    if (severity) params.set('severity', severity)
    if (categoryId) params.set('categoryId', categoryId)
    if (limit) params.set('limit', limit)
    return params.toString()
  }, [check, severity, categoryId, limit])

  const hasMoreResults = useMemo(() => data.checks.some((checkResult) => checkResult.hasMore), [data.checks])

  useEffect(() => {
    let ignore = false

    async function loadCategories() {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) return
        const payload = await response.json()
        if (!ignore) setCategories(payload)
      } catch {
        if (!ignore) setCategories([])
      }
    }

    loadCategories()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadDataQuality() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/data-quality?${queryString}`)
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || '获取数据质量检查结果失败')
        }
        if (!ignore) setData(payload)
      } catch (err) {
        if (!ignore) {
          setData(EMPTY_RESPONSE)
          setError(err instanceof Error ? err.message : '获取数据质量检查结果失败')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadDataQuality()
    return () => {
      ignore = true
    }
  }, [queryString])

  function resetFilters() {
    setCheck('')
    setSeverity('')
    setCategoryId('')
    setLimit('50')
  }

  async function handleExportCurrentResults() {
    setExporting(true)
    setError('')

    try {
      const exportUrl = queryString ? `/api/data-quality/export?${queryString}` : '/api/data-quality/export'
      const response = await fetch(exportUrl, { cache: 'no-store' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '导出数据质量检查结果失败')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'data-quality-export.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出数据质量检查结果失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">数据质量检查</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">集中查看供应商、报价、流程和资料中的数据问题。本页只读展示，不会自动修改数据。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="text-sm text-gray-500">生成时间：{formatDateTime(data.summary.generatedAt)}</div>
          <button
            type="button"
            onClick={handleExportCurrentResults}
            disabled={loading || exporting}
            className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? '导出中...' : '导出当前显示结果'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="问题总数" value={data.summary.totalIssues} tone="slate" />
        <SummaryCard label="高风险" value={data.summary.highCount} tone="red" />
        <SummaryCard label="中风险" value={data.summary.mediumCount} tone="amber" />
        <SummaryCard label="低风险" value={data.summary.lowCount} tone="blue" />
      </div>

      <div className="grid gap-3 rounded-[20px] border border-[#e5eaf3] bg-white p-4 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <select
          value={check}
          onChange={(event) => setCheck(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部检查项</option>
          {CHECK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部风险</option>
          <option value="high">高风险</option>
          <option value="medium">中风险</option>
          <option value="low">低风险</option>
        </select>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部品类</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="20">每类 20 条</option>
          <option value="50">每类 50 条</option>
          <option value="100">每类 100 条</option>
          <option value="200">每类 200 条</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
        >
          重置筛选
        </button>
      </div>

      {hasMoreResults && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          当前仅导出已显示的问题，仍有更多问题未包含。可调高每类显示数量后重新导出。
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-[20px] border border-[#e5eaf3] bg-white p-10 text-center text-sm text-gray-500" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>数据质量检查加载中...</div>
      ) : data.checks.length === 0 ? (
        <div className="rounded-[20px] border border-[#e5eaf3] bg-white p-10 text-center text-sm text-gray-500" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>当前筛选条件下暂无检查项。</div>
      ) : (
        <div className="space-y-5">
          {data.checks.map((checkResult) => (
            <section key={checkResult.key} className="overflow-hidden rounded-[20px] border border-[#e5eaf3] bg-white" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
              <div className="border-b border-[#e5eaf3] bg-[#f8fafc] px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">{checkResult.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${severityClass(checkResult.severity)}`}>
                        {severityLabel(checkResult.severity)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{checkResult.description}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    共 {checkResult.count} 条，已显示 {checkResult.returnedCount} 条
                  </div>
                </div>
              </div>

              {checkResult.items.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">当前未发现该类数据质量问题。</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {checkResult.items.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </div>
              )}

              {checkResult.hasMore && (
                <div className="border-t border-[#e5eaf3] bg-amber-50 px-5 py-3 text-sm text-amber-700">
                  该检查项还有更多问题未显示，可调高每类显示数量继续查看。
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'red' | 'amber' | 'blue' }) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  }[tone]

  return (
    <div className="rounded-[20px] border border-[#e5eaf3] bg-white p-4" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-3 inline-flex min-w-16 justify-center rounded-lg px-3 py-1.5 text-2xl font-bold ${toneClass}`}>
        {value}
      </div>
    </div>
  )
}

function IssueRow({ issue }: { issue: DataQualityIssue }) {
  const metaEntries = Object.entries(issue.meta || {}).filter(([, value]) => value !== null && value !== undefined && value !== '')

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-gray-900">{issue.title}</h3>
            {issue.status && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{issue.status}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {issue.categoryName && <span>品类：{issue.categoryName}</span>}
            {issue.supplierName && <span>供应商：{issue.supplierName}</span>}
            {issue.subtitle && <span>说明：{issue.subtitle}</span>}
            {issue.updatedAt && <span>更新时间：{formatDateTime(issue.updatedAt)}</span>}
          </div>
          <p className="mt-2 text-sm text-gray-700">问题：{issue.reason}</p>
          <p className="mt-1 text-sm text-gray-600">建议：{issue.suggestion}</p>
          {metaEntries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              {metaEntries.map(([key, value]) => (
                <span key={key} className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-100">
                  {key}：{metaValue(value)}
                </span>
              ))}
            </div>
          )}
        </div>
        {issue.href && (
          <Link
            href={issue.href}
            className="shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            查看并处理
          </Link>
        )}
      </div>
    </div>
  )
}
