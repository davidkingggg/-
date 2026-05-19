import Link from 'next/link'
import DashboardCard from '@/components/dashboard/DashboardCard'
import { buildDashboardData } from '@/lib/dashboard-utils'
import { getSession } from '@/lib/session'
import type { TaskItem } from '@/lib/task-aggregation'
import { Sparkles, Clock, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(value?: string) {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未设置'
  return date.toLocaleDateString('zh-CN')
}

function formatGeneratedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN')
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function TaskItemRow({ item }: { item: TaskItem }) {
  return (
    <Link
      key={`${item.source}-${item.id}`}
      href={item.href}
      className="group flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0 premium-transition hover:bg-blue-50/20 -mx-2 px-2 rounded-xl active-shrink-sm"
    >
      <div className="mt-1 shrink-0 relative">
        {item.isOverdue ? (
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse-glow-red" />
        ) : item.priority === '高' ? (
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
        ) : (
          <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider border border-slate-200/20">
            {item.sourceLabel}
          </span>
          {item.priority === '高' && (
            <span className="rounded bg-rose-50 text-rose-600 px-2 py-0.5 text-[9px] font-extrabold border border-rose-100/50">
              高
            </span>
          )}
          {item.isOverdue && (
            <span className="rounded bg-red-50 text-red-500 px-2 py-0.5 text-[9px] font-extrabold border border-red-200/50 animate-pulse">
              超期
            </span>
          )}
        </div>
        <div className="text-[12.5px] font-bold text-slate-700 group-hover:text-blue-600 premium-transition truncate">
          {item.title}
        </div>
        <div className="mt-0.5 text-[10.5px] text-slate-400 font-medium truncate">
          {[item.categoryName, item.ownerName, item.nextAction].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
        <div className="text-[10px] font-bold text-slate-400 font-display">{formatDate(item.dueDate)}</div>
        <ChevronRight className="w-3.5 h-3.5 text-blue-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 premium-transition" />
      </div>
    </Link>
  )
}

function TodoSection({
  title,
  color,
  items,
  emptyText,
}: {
  title: string
  color: string
  items: TaskItem[]
  emptyText: string
}) {
  if (items.length === 0) {
    return (
      <div className="py-2 border-b border-slate-100/60 last:border-b-0">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-block w-1.5 h-3 rounded-full ${color}`} />
          <span className="text-[12.5px] font-extrabold text-slate-700">{title}</span>
          <span className="text-[9px] font-extrabold text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-md">0</span>
        </div>
        <p className="text-[11px] text-slate-400/80 pl-3.5 font-medium">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="py-2.5 border-b border-slate-100/60 last:border-b-0">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block w-1.5 h-3 rounded-full ${color}`} />
        <span className="text-[12.5px] font-extrabold text-slate-700">{title}</span>
        <span className="text-[9px] font-extrabold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded-md">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <TaskItemRow key={`${item.source}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}

export default async function Home() {
  const data = await buildDashboardData()
  const session = await getSession()
  const userName = session.name || '用户'
  const greeting = getGreeting()

  const alertCount = data.summary.overdueTodoCount + data.summary.bossDecisionCount + data.mainline.purchaseIssueCount

  const allTodoItems = [
    ...data.todos.overdueItems,
    ...data.todos.weekItems,
    ...data.todos.bossDecisionItems,
    ...data.mainline.purchaseIssueItems,
    ...data.admin.items,
  ]

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-[24px] text-white premium-transition shimmer-sweep"
        style={{
          height: '128px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0d9488 100%)',
          boxShadow: '0 20px 48px rgba(37, 99, 235, 0.16)',
          padding: '28px 32px',
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        <div className="relative flex items-center justify-between h-full">
          <div>
            <div className="text-[13px] text-blue-100/90 mb-1 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>{greeting}，{userName}</span>
            </div>
            <h1 className="text-[23px] font-display font-extrabold tracking-tight">今日采购工作台概览</h1>
            <div className="mt-2 flex items-center gap-4 text-[13px] text-blue-100/80 font-medium">
              <span>供应商 {data.summary.supplierCount} 家</span>
              <span className="w-px h-3 bg-blue-300/30" />
              <span>采购进行中 {data.mainline.purchaseInProgressCount} 项</span>
              <span className="w-px h-3 bg-blue-300/30" />
              <span>超期待办 {data.summary.overdueTodoCount} 项</span>
            </div>
          </div>

          <div className="text-right flex flex-col items-end justify-center">
            {alertCount > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 border border-rose-500/25 px-4 py-2 text-xs font-semibold text-rose-300 backdrop-blur-md shadow-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse-glow-red" />
                <span>有 {alertCount} 项需要关注</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-4 py-2 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow-emerald" />
                <span>暂无紧急事项</span>
              </div>
            )}
            <div className="mt-2 text-[10px] text-blue-200/50 font-bold font-display">
              更新于 {formatGeneratedAt(data.generatedAt)}
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shadow-[0_2px_8px_rgba(59,130,246,0.4)]" />
          <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider">核心概览</h2>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">推荐/备选统计</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard label="供应商总数" value={data.summary.supplierCount} tone="blue" icon="supplier" />
          <DashboardCard label="推荐/备选供应商" value={data.summary.recommendedSupplierCount} tone="emerald" icon="award" />
          <DashboardCard label="品类总数" value={data.summary.categoryCount} tone="violet" icon="category" />
          <DashboardCard label="报价单数量" value={data.summary.quoteSheetCount} tone="amber" icon="quote" />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard label="综合超期待办" value={data.summary.overdueTodoCount} tone="red" icon="alert" />
          <DashboardCard label="需老板决策" value={data.summary.bossDecisionCount} tone="amber" icon="decision" />
          <DashboardCard label="综合本周待办" value={data.summary.weekTodoCount} tone="blue" icon="clock" />
          <DashboardCard label="销售/商务资料" value={data.summary.salesMaterialCount} tone="slate" icon="material" />
        </div>
      </section>

      <div className="grid grid-cols-10 gap-6">
        <div className="col-span-7 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600 shadow-[0_2px_8px_rgba(16,185,129,0.4)]" />
              <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider">平台主线工作</h2>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">供应商开发与采购执行</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DashboardCard label="开发进行中" value={data.mainline.developmentInProgressCount} tone="blue" compact />
              <DashboardCard label="采购进行中" value={data.mainline.purchaseInProgressCount} tone="emerald" compact />
              <DashboardCard label="采购异常/暂停" value={data.mainline.purchaseIssueCount} tone="red" compact />
              <DashboardCard label="本周主线待办" value={data.mainline.weekCount} tone="amber" compact />
              <DashboardCard label="主线超期待办" value={data.mainline.overdueCount} tone="red" compact />
              <DashboardCard label="需老板决策" value={data.mainline.bossDecisionCount} tone="amber" compact />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-slate-400 to-slate-600 shadow-[0_2px_8px_rgba(100,116,139,0.4)]" />
              <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider">行政事项</h2>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">日常非供应链管理</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DashboardCard label="行政待办" value={data.admin.openCount} tone="slate" compact />
              <DashboardCard label="本周行政事项" value={data.admin.weekCount} tone="blue" compact />
              <DashboardCard label="超期行政事项" value={data.admin.overdueCount} tone="red" compact />
            </div>
          </section>
        </div>

        <div className="col-span-3">
          <div
            className="rounded-[24px] bg-white/80 backdrop-blur-xl border border-slate-200/50 overflow-hidden premium-transition shadow-sm hover:shadow-md"
            style={{
              boxShadow: '0 8px 32px rgba(15, 23, 42, 0.02)',
              minHeight: '100%',
            }}
          >
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <h2 className="text-[14px] font-extrabold uppercase tracking-wider">近期重点事项</h2>
                </div>
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-display">
                  {allTodoItems.length} 项
                </span>
              </div>
            </div>

            <div className="px-5 py-3 divide-y divide-slate-50">
              <TodoSection title="超期待办" color="bg-rose-500" items={data.todos.overdueItems} emptyText="暂无超期待办" />
              <TodoSection title="本周待办" color="bg-amber-500" items={data.todos.weekItems} emptyText="暂无本周待办" />
              <TodoSection title="需老板决策" color="bg-blue-500" items={data.todos.bossDecisionItems} emptyText="暂无需老板决策事项" />
              <TodoSection title="采购异常/暂停" color="bg-orange-500" items={data.mainline.purchaseIssueItems} emptyText="暂无异常事项" />
              <TodoSection title="行政事项" color="bg-slate-400" items={data.admin.items} emptyText="暂无行政事项" />
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <Link href="/tasks" className="group/btn flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 premium-transition">
                <span>查看全部待办</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 premium-transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
