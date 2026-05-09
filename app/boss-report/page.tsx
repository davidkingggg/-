'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react'
import type { BossReportData, BossReportItem, BossReportRiskItem } from '@/lib/boss-report-utils'

type LoadState = 'idle' | 'loading' | 'error'

function todayInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekInputs() {
  const current = new Date()
  current.setHours(0, 0, 0, 0)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(current)
  start.setDate(current.getDate() + diffToMonday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { startDate: todayInput(start), endDate: todayInput(end) }
}

function formatDate(value?: string | null) {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未设置'
  return date.toLocaleDateString('zh-CN')
}

function joinText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' / ')
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${tone}`}>{value}</div>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <div className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded-lg">{text}</div>
}

function ItemRow({ item, extra }: { item: BossReportItem; extra?: string }) {
  return (
    <div className="border border-gray-100 rounded-lg bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{item.sourceLabel}</span>
            {item.needBossDecision && <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700">需决策</span>}
            {item.priority && <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">{item.priority}</span>}
          </div>
          <h3 className="font-semibold text-gray-900 mt-2 break-words">{item.title}</h3>
          <div className="text-sm text-gray-500 mt-1 break-words">
            {joinText([item.supplierName, item.categoryName, `负责人：${item.ownerName}`])}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-gray-700">{item.status}</div>
          <div className="text-xs text-gray-400 mt-1">{item.currentStage}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-xs text-gray-400 mb-1">截止日期</div>
          <div className="text-gray-700">{formatDate(item.dueDate)}</div>
        </div>
        <div className="bg-gray-50 rounded-md p-3 md:col-span-2">
          <div className="text-xs text-gray-400 mb-1">当前问题/下一步</div>
          <div className="text-gray-700 break-words">{joinText([item.currentProblem, item.nextAction]) || '暂无补充'}</div>
        </div>
      </div>
      {extra && <div className="mt-3 text-sm text-red-700 bg-red-50 rounded-md p-3">{extra}</div>}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export default function BossReportPage() {
  const week = getWeekInputs()
  const [startDate, setStartDate] = useState(week.startDate)
  const [endDate, setEndDate] = useState(week.endDate)
  const [data, setData] = useState<BossReportData | null>(null)
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadReport = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const params = new URLSearchParams({ startDate, endDate })
      const response = await fetch(`/api/boss-report?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '加载失败')
      setData(payload)
      setState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
      setState('error')
    }
  }, [startDate, endDate])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const exportCsv = () => {
    const params = new URLSearchParams({ startDate, endDate })
    window.location.href = `/api/boss-report/export?${params.toString()}`
  }

  const copyMarkdown = async () => {
    if (!data) return
    await navigator.clipboard.writeText(data.markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const highRisks = data?.currentRisks.filter((item) => item.riskLevel === 'high') ?? []
  const watchRisks = data?.currentRisks.filter((item) => item.riskLevel === 'watch') ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">老板汇报</h1>
          <p className="text-sm text-gray-500 mt-1">
            默认按本周统计进展；未关闭的老板决策与当前未解决风险会跨日期范围展示。
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-3 flex flex-wrap items-end gap-3 shadow-sm">
          <label className="text-sm text-gray-600">
            <span className="block text-xs text-gray-400 mb-1">开始日期</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            <span className="block text-xs text-gray-400 mb-1">结束日期</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
          </label>
          <button onClick={loadReport} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            刷新
          </button>
          <button onClick={copyMarkdown} disabled={!data} className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {copied ? '已复制' : '复制 Markdown'}
          </button>
          <button onClick={exportCsv} disabled={!data} className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            导出 CSV
          </button>
        </div>
      </div>

      {state === 'error' && <div className="mt-6 bg-red-50 text-red-700 border border-red-100 rounded-lg p-4">{error}</div>}

      {state === 'loading' && !data && <div className="mt-10 text-center text-gray-400">加载中...</div>}

      {data && (
        <>
          <div className="mt-6 text-sm text-gray-500">统计范围：{data.range.label}</div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <SummaryCard label="开发进展" value={data.summary.developmentProgressCount} tone="text-blue-600" />
            <SummaryCard label="采购进展" value={data.summary.purchaseProgressCount} tone="text-emerald-600" />
            <SummaryCard label="待老板决策" value={data.summary.bossDecisionCount} tone="text-red-600" />
            <SummaryCard label="高风险" value={data.summary.highRiskCount} tone="text-orange-600" />
            <SummaryCard label="关注项" value={data.summary.watchRiskCount} tone="text-slate-700" />
          </div>

          <Section title="重点品类" subtitle="按日期范围内开发事项数 + 采购事项数 + 风险事项数综合排序，默认展示前 5 个。">
            {data.focusCategories.length === 0 ? (
              <EmptyLine text="当前范围暂无重点品类" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                {data.focusCategories.map((item, index) => (
                  <div key={item.categoryId} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-400">第 {index + 1} 位</div>
                    <div className="font-semibold text-gray-900 mt-1 break-words">{item.categoryName}</div>
                    <div className="text-2xl font-bold text-gray-900 mt-3">{item.totalCount}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      开发 {item.developmentCount} / 采购 {item.purchaseCount} / 风险 {item.riskCount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="本期开发/采购进展" subtitle="纳入创建、更新或截止日期落在当前日期范围内的开发/采购事项。">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {[...data.developmentProgress, ...data.purchaseProgress].length === 0 ? (
                <EmptyLine text="当前范围暂无开发/采购进展" />
              ) : (
                [...data.developmentProgress, ...data.purchaseProgress].map((item) => <ItemRow key={`${item.source}-${item.id}`} item={item} />)
              )}
            </div>
          </Section>

          <Section title="待老板决策事项" subtitle="口径为 needBossDecision=true、未归档、状态未关闭；不会因创建时间不在本周而漏掉。">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data.bossDecisions.length === 0 ? (
                <EmptyLine text="当前暂无待老板决策事项" />
              ) : (
                data.bossDecisions.map((item) => <ItemRow key={`${item.source}-${item.id}`} item={item} />)
              )}
            </div>
          </Section>

          <Section title="当前未解决风险/异常/暂停" subtitle="风险项可跨日期范围展示；高风险与关注项分层，避免普通问题被过度标红。">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-red-700 mb-3">高风险</h3>
                <div className="space-y-3">
                  {highRisks.length === 0 ? (
                    <EmptyLine text="当前暂无高风险事项" />
                  ) : (
                    highRisks.map((item: BossReportRiskItem) => (
                      <ItemRow key={`${item.source}-${item.id}`} item={item} extra={item.riskReasons.join('、')} />
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-700 mb-3">关注项</h3>
                <div className="space-y-3">
                  {watchRisks.length === 0 ? (
                    <EmptyLine text="当前暂无关注项" />
                  ) : (
                    watchRisks.map((item: BossReportRiskItem) => (
                      <ItemRow key={`${item.source}-${item.id}`} item={item} extra={item.riskReasons.join('、')} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Markdown 预览">
            <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-sm overflow-auto whitespace-pre-wrap max-h-[520px]">{data.markdown}</pre>
          </Section>
        </>
      )}
    </div>
  )
}
