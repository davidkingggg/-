'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BossReportData, BossReportItem, BossReportRiskItem } from '@/lib/boss-report-utils'

type PageState =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'error'; message: string }

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

const CARD_SHADOW = { boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' } as const

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    '进行中': 'bg-blue-50 text-blue-700 border-blue-200',
    '已完成': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '暂停': 'bg-amber-50 text-amber-700 border-amber-200',
    '异常': 'bg-red-50 text-red-700 border-red-200',
    '淘汰': 'bg-red-50 text-red-700 border-red-200',
    '待启动': 'bg-gray-50 text-gray-600 border-gray-200',
  }
  const cls = colorMap[status] || 'bg-gray-50 text-gray-600 border-gray-200'
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>
}

function KpiCard({ label, value, description, tone, icon }: { label: string; value: number; description: string; tone: string; icon: string }) {
  return (
    <div className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={CARD_SHADOW}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`mt-2 text-4xl font-bold tracking-tight ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-400">{description}</div>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <div className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">{text}</div>
}

function CompactItemRow({ item }: { item: BossReportItem }) {
  return (
    <div className="py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
        <span className="text-xs text-gray-400 shrink-0">{formatDate(item.dueDate)}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <StatusBadge status={item.status} />
        {item.needBossDecision && <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">需决策</span>}
        <span className="text-xs text-gray-400">{joinText([item.supplierName, item.categoryName])}</span>
      </div>
    </div>
  )
}

function ItemRow({ item, extra }: { item: BossReportItem; extra?: string }) {
  return (
    <div className="rounded-[20px] border border-[#e5eaf3] bg-white p-4" style={CARD_SHADOW}>
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
          <StatusBadge status={item.status} />
          <div className="text-xs text-gray-400 mt-1">{item.currentStage}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">截止日期</div>
          <div className="text-gray-700">{formatDate(item.dueDate)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 md:col-span-2">
          <div className="text-xs text-gray-400 mb-1">当前问题/下一步</div>
          <div className="text-gray-700 break-words">{joinText([item.currentProblem, item.nextAction]) || '暂无补充'}</div>
        </div>
      </div>
      {extra && <div className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg p-3">{extra}</div>}
    </div>
  )
}

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
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
  const [pageState, setPageState] = useState<PageState>({ tag: 'idle' })
  const [copied, setCopied] = useState(false)

  const loadReport = useCallback(async () => {
    setPageState({ tag: 'loading' })
    try {
      const params = new URLSearchParams({ startDate, endDate })
      const response = await fetch(`/api/boss-report?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '加载失败')
      setData(payload)
      setPageState({ tag: 'idle' })
    } catch (err) {
      setPageState({ tag: 'error', message: err instanceof Error ? err.message : '加载失败' })
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

  const derivedData = useMemo(() => {
    if (!data) return { highRisks: [] as BossReportRiskItem[], watchRisks: [] as BossReportRiskItem[], allProgress: [] as BossReportItem[] }
    const high: BossReportRiskItem[] = []
    const watch: BossReportRiskItem[] = []
    for (const item of data.currentRisks) {
      if (item.riskLevel === 'high') high.push(item)
      else watch.push(item)
    }
    return {
      highRisks: high,
      watchRisks: watch,
      allProgress: [...data.developmentProgress, ...data.purchaseProgress],
    }
  }, [data])
  const { highRisks, watchRisks, allProgress } = derivedData

  const reportTimestamp = useMemo(() => new Date().toLocaleString('zh-CN'), [])

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">经营驾驶舱</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            采购经营数据概览，快速了解进展、风险与待决策事项。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-[#e5eaf3] rounded-xl px-3 py-2">
            <label className="text-xs text-gray-400">日期范围</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border-0 text-sm text-gray-700 p-0 focus:ring-0 bg-transparent"
            />
            <span className="text-gray-300">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="border-0 text-sm text-gray-700 p-0 focus:ring-0 bg-transparent"
            />
          </div>
          <button onClick={loadReport} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">
            生成简报
          </button>
          <button onClick={copyMarkdown} disabled={!data} className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium disabled:opacity-50">
            {copied ? '已复制' : '复制内容'}
          </button>
          <button onClick={exportCsv} disabled={!data} className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium disabled:opacity-50">
            导出 CSV
          </button>
        </div>
      </div>

      {pageState.tag === 'error' && <div className="mt-6 bg-red-50 text-red-700 border border-red-100 rounded-xl p-4">{pageState.message}</div>}

      {pageState.tag === 'loading' && !data && (
        <div className="mt-16 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-3">加载经营数据...</p>
        </div>
      )}

      {data && (
        <>
          {!data.personal.personBound && (
            <div className="mt-6 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
              当前账号未绑定人员，驾驶舱只展示公共采购经营数据；绑定人员后会同步显示“我的行政事项”。
            </div>
          )}

          {/* KPI Cards */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            <KpiCard label="开发进展" value={data.summary.developmentProgressCount} description="本期开发跟进事项" tone="text-blue-600" icon="🚀" />
            <KpiCard label="采购进展" value={data.summary.purchaseProgressCount} description="本期采购执行事项" tone="text-emerald-600" icon="🛒" />
            <KpiCard label="待决策" value={data.summary.bossDecisionCount} description="需要管理层决策" tone="text-red-600" icon="⚡" />
            <KpiCard label="高风险" value={data.summary.highRiskCount} description="异常/淘汰/超期" tone="text-orange-600" icon="🔴" />
            <KpiCard label="关注项" value={data.summary.watchRiskCount} description="暂停/有问题待解" tone="text-slate-600" icon="🟡" />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard label="我的行政待办" value={data.personal.adminOpenCount} description="当前账号名下未完成行政事项" tone="text-slate-700" icon="🗂️" />
            <KpiCard label="本周我的行政" value={data.personal.adminWeekCount} description="本周内到期的个人行政事项" tone="text-blue-600" icon="📆" />
            <KpiCard label="超期我的行政" value={data.personal.adminOverdueCount} description="当前已超期的个人行政事项" tone="text-red-600" icon="⏰" />
          </div>

          {/* 3-column overview */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Focus Categories */}
            <div className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={CARD_SHADOW}>
              <h3 className="text-sm font-semibold text-[#0f172a] mb-3">重点品类</h3>
              <p className="text-xs text-gray-400 mb-4">按事项综合排序，前 5 位</p>
              {data.focusCategories.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">暂无数据</div>
              ) : (
                <div className="space-y-3">
                  {data.focusCategories.map((item, index) => (
                    <div key={item.categoryId} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{item.categoryName}</div>
                        <div className="text-xs text-gray-400">开发 {item.developmentCount} / 采购 {item.purchaseCount} / 风险 {item.riskCount}</div>
                      </div>
                      <span className="text-lg font-bold text-gray-900 shrink-0">{item.totalCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Center: Key Items */}
            <div className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={CARD_SHADOW}>
              <h3 className="text-sm font-semibold text-[#0f172a] mb-3">重点待办</h3>
              <p className="text-xs text-gray-400 mb-4">待决策事项与近期进展</p>
              {data.bossDecisions.length === 0 && allProgress.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">暂无待办</div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto -mx-2">
                  {data.bossDecisions.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-red-600 px-2 mb-1">待决策</div>
                      {data.bossDecisions.slice(0, 5).map((item) => (
                        <CompactItemRow key={`d-${item.source}-${item.id}`} item={item} />
                      ))}
                    </>
                  )}
                  {allProgress.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-blue-600 px-2 mt-3 mb-1">本期进展</div>
                      {allProgress.slice(0, 8).map((item) => (
                        <CompactItemRow key={`p-${item.source}-${item.id}`} item={item} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right: Risks */}
            <div className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={CARD_SHADOW}>
              <h3 className="text-sm font-semibold text-[#0f172a] mb-3">风险提醒</h3>
              <p className="text-xs text-gray-400 mb-4">高风险与关注事项</p>
              {highRisks.length === 0 && watchRisks.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">当前无风险项</div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto -mx-2">
                  {highRisks.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-red-600 px-2 mb-1">高风险 ({highRisks.length})</div>
                      {highRisks.slice(0, 5).map((item: BossReportRiskItem) => (
                        <CompactItemRow key={`h-${item.source}-${item.id}`} item={item} />
                      ))}
                    </>
                  )}
                  {watchRisks.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-amber-600 px-2 mt-3 mb-1">关注项 ({watchRisks.length})</div>
                      {watchRisks.slice(0, 5).map((item: BossReportRiskItem) => (
                        <CompactItemRow key={`w-${item.source}-${item.id}`} item={item} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Sections */}
          <Section title="本期开发/采购进展" subtitle="创建、更新或截止日期落在当前范围内的事项。">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {allProgress.length === 0 ? (
                <EmptyLine text="当前范围暂无开发/采购进展" />
              ) : (
                allProgress.map((item) => <ItemRow key={`${item.source}-${item.id}`} item={item} />)
              )}
            </div>
          </Section>

          <Section title="待决策事项" subtitle="needBossDecision=true、未归档、状态未关闭。">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data.bossDecisions.length === 0 ? (
                <EmptyLine text="当前暂无待决策事项" />
              ) : (
                data.bossDecisions.map((item) => <ItemRow key={`${item.source}-${item.id}`} item={item} />)
              )}
            </div>
          </Section>

          <Section title="风险与异常" subtitle="高风险与关注项分层展示。">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-red-700 mb-3 text-sm">高风险</h3>
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
                <h3 className="font-semibold text-amber-700 mb-3 text-sm">关注项</h3>
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

          <Section title="我的行政事项" subtitle="仅展示当前登录账号绑定人员名下的个人行政事项。">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data.personal.adminItems.length === 0 ? (
                <EmptyLine text={data.personal.personBound ? '当前暂无个人行政事项' : '绑定人员后，这里会显示你的个人行政事项'} />
              ) : (
                data.personal.adminItems.map((item) => (
                  <div key={item.id} className="rounded-[20px] border border-[#e5eaf3] bg-white p-4" style={CARD_SHADOW}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">我的行政</span>
                          {item.priority && <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">{item.priority}</span>}
                        </div>
                        <h3 className="font-semibold text-gray-900 mt-2 break-words">{item.title}</h3>
                        <div className="text-sm text-gray-500 mt-1 break-words">{item.type}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={item.status} />
                        <div className="text-xs text-gray-400 mt-1">{formatDate(item.dueDate)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-600">{item.notes || '暂无备注'}</div>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Report Preview — renders data.markdown directly as single source of truth */}
          <Section
            title="采购经营简报"
            subtitle="以下内容与「复制内容」一致，可直接预览导出效果。"
            action={
              <div className="flex gap-2">
                <button onClick={copyMarkdown} disabled={!data} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm disabled:opacity-50">
                  {copied ? '已复制' : '复制内容'}
                </button>
                <button onClick={exportCsv} disabled={!data} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm disabled:opacity-50">
                  导出 CSV
                </button>
              </div>
            }
          >
            <div className="rounded-[20px] bg-white border border-[#e5eaf3] overflow-hidden" style={CARD_SHADOW}>
              <div className="px-6 py-4 border-b border-[#e5eaf3] bg-[#f8fafc]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-gray-700">采购经营简报 · {data.range.label}</span>
                </div>
              </div>
              <pre className="px-6 py-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{data.markdown}</pre>
            </div>
          </Section>

          {/* Footer */}
          <div className="mt-8 mb-4 text-center text-xs text-gray-300">
            统计范围：{data.range.label} · 数据截至 {reportTimestamp}
          </div>
        </>
      )}
    </div>
  )
}
