import Link from 'next/link'
import DashboardCard from '@/components/dashboard/DashboardCard'
import { buildDashboardData } from '@/lib/dashboard-utils'
import { getSession } from '@/lib/session'
import type { TaskItem } from '@/lib/task-aggregation'
import {
  Sparkles,
  Clock,
  ChevronRight
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(value?: string) {
  if (!value) return '鏈缃?
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '鏈缃?
  return date.toLocaleDateString('zh-CN')
}

function formatGeneratedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN')
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '澶滄繁浜?
  if (h < 12) return '鏃╀笂濂?
  if (h < 14) return '涓崍濂?
  if (h < 18) return '涓嬪崍濂?
  return '鏅氫笂濂?
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
        ) : item.priority === '楂? ? (
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
          {item.priority === '楂? && (
            <span className="rounded bg-rose-50 text-rose-600 px-2 py-0.5 text-[9px] font-extrabold border border-rose-100/50">
              楂?            </span>
          )}
          {item.isOverdue && (
            <span className="rounded bg-red-50 text-red-500 px-2 py-0.5 text-[9px] font-extrabold border border-red-200/50 animate-pulse">
              瓒呮湡
            </span>
          )}
        </div>
        <div className="text-[12.5px] font-bold text-slate-700 group-hover:text-blue-600 premium-transition truncate">
          {item.title}
        </div>
        <div className="mt-0.5 text-[10.5px] text-slate-400 font-medium truncate">
          {[item.categoryName, item.ownerName, item.nextAction].filter(Boolean).join(' 路 ')}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
        <div className="text-[10px] font-bold text-slate-400 font-display">{formatDate(item.dueDate)}</div>
        <ChevronRight className="w-3.5 h-3.5 text-blue-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 premium-transition" />
      </div>
    </Link>
  )
}

function TodoSection({ title, color, items, emptyText }: { title: string; color: string; items: TaskItem[]; emptyText: string }) {
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
        {items.map((item) => <TaskItemRow key={`${item.source}-${item.id}`} item={item} />)}
      </div>
    </div>
  )
}

export default async function Home() {
  const data = await buildDashboardData()
  const session = await getSession()
  const userName = session.name || '鐢ㄦ埛'
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
      {/* Hero Card - Welcome Strip with fluid aurora & network grid */}
      <div
        className="relative overflow-hidden rounded-[24px] text-white premium-transition shimmer-sweep"
        style={{
          height: '128px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0d9488 100%)',
          boxShadow: '0 20px 48px rgba(37, 99, 235, 0.16)',
          padding: '28px 32px',
        }}
      >
        {/* Subtle decorative grid lines */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative flex items-center justify-between h-full">
          <div>
            <div className="text-[13px] text-blue-100/90 mb-1 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>{greeting}锛寋userName}</span>
            </div>
            <h1 className="text-[23px] font-display font-extrabold tracking-tight">浠婃棩閲囪喘宸ヤ綔鍙版瑙?/h1>
            <div className="mt-2 flex items-center gap-4 text-[13px] text-blue-100/80 font-medium">
              <span>渚涘簲鍟?{data.summary.supplierCount} 瀹?/span>
              <span className="w-px h-3 bg-blue-300/30" />
              <span>閲囪喘杩涜涓?{data.mainline.purchaseInProgressCount} 椤?/span>
              <span className="w-px h-3 bg-blue-300/30" />
              <span>瓒呮湡寰呭姙 {data.summary.overdueTodoCount} 椤?/span>
            </div>
          </div>

          <div className="text-right flex flex-col items-end justify-center">
            {alertCount > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 border border-rose-500/25 px-4 py-2 text-xs font-semibold text-rose-300 backdrop-blur-md shadow-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse-glow-red" />
                <span>鏈?{alertCount} 椤归渶瑕佸叧娉?/span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-4 py-2 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow-emerald" />
                <span>鏆傛棤绱ф€ヤ簨椤?/span>
              </div>
            )}
            <div className="mt-2 text-[10px] text-blue-200/50 font-bold font-display">
              鏇存柊浜?{formatGeneratedAt(data.generatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* KPI: Core Overview */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shadow-[0_2px_8px_rgba(59,130,246,0.4)]" />
          <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider">鏍稿績姒傝</h2>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">鎺ㄨ崘/澶囬€夌粺璁?/span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard label="渚涘簲鍟嗘€绘暟" value={data.summary.supplierCount} tone="blue" icon="鈼? />
          <DashboardCard label="鎺ㄨ崘/澶囬€変緵搴斿晢" value={data.summary.recommendedSupplierCount} tone="emerald" icon="鈽? />
          <DashboardCard label="鍝佺被鎬绘暟" value={data.summary.categoryCount} tone="violet" icon="鈾? />
          <DashboardCard label="鎶ヤ环鍗曟暟閲? value={data.summary.quoteSheetCount} tone="amber" icon="鉁? />
        </div>
      </section>

      {/* KPI: Risk & Reminders */}
      <section>
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard label="缁煎悎瓒呮湡寰呭姙" value={data.summary.overdueTodoCount} tone="red" icon="鈿? />
          <DashboardCard label="闇€鑰佹澘鍐崇瓥" value={data.summary.bossDecisionCount} tone="amber" icon="鈿? />
          <DashboardCard label="缁煎悎鏈懆寰呭姙" value={data.summary.weekTodoCount} tone="blue" icon="鈴? />
          <DashboardCard label="閿€鍞?鍟嗗姟璧勬枡" value={data.summary.salesMaterialCount} tone="slate" icon="鉁? />
        </div>
      </section>

      {/* Bottom Layout Grid: Mainline (70%) + Todo Panel (30%) */}
      <div className="grid grid-cols-10 gap-6">
        {/* Left Columns (Platform Mainline + Admin) */}
        <div className="col-span-7 space-y-6">
          {/* Platform Mainline */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600 shadow-[0_2px_8px_rgba(16,185,129,0.4)]" />
              <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider">骞冲彴涓荤嚎宸ヤ綔</h2>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">渚涘簲鍟嗗紑鍙戜笌閲囪喘鎵ц</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DashboardCard label="寮€鍙戣繘琛屼腑" value={data.mainline.developmentInProgressCount} tone="blue" compact />
              <DashboardCard label="閲囪喘杩涜涓? value={data.mainline.purchaseInProgressCount} tone="emerald" compact />
              <DashboardCard label="閲囪喘寮傚父/鏆傚仠" value={data.mainline.purchaseIssueCount} tone="red" compact />
              <DashboardCard label="鏈懆涓荤嚎寰呭姙" value={data.mainline.weekCount} tone="amber" compact />
              <DashboardCard label="涓荤嚎瓒呮湡寰呭姙" value={data.mainline.overdueCount} tone="red" compact />
              <DashboardCard label="闇€鑰佹澘鍐崇瓥" value={data.mainline.bossDecisionCount} tone="amber" compact />
            </div>
          </section>

          {/* Admin Tasks */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-slate-400 to-slate-600 shadow-[0_2px_8px_rgba(100,116,139,0.4)]" />
              <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider">琛屾斂浜嬮」</h2>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">鏃ュ父闈炰緵搴旈摼绠＄悊</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DashboardCard label="琛屾斂寰呭姙" value={data.admin.openCount} tone="slate" compact />
              <DashboardCard label="鏈懆琛屾斂浜嬮」" value={data.admin.weekCount} tone="blue" compact />
              <DashboardCard label="瓒呮湡琛屾斂浜嬮」" value={data.admin.overdueCount} tone="red" compact />
            </div>
          </section>
        </div>

        {/* Right Columns (Unified Premium Todo Panel) */}
        <div className="col-span-3">
          <div
            className="rounded-[24px] bg-white/80 backdrop-blur-xl border border-slate-200/50 overflow-hidden premium-transition shadow-sm hover:shadow-md"
            style={{
              boxShadow: '0 8px 32px rgba(15, 23, 42, 0.02)',
              minHeight: '100%'
            }}
          >
            {/* Panel Header */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <h2 className="text-[14px] font-extrabold uppercase tracking-wider">杩戞湡閲嶇偣浜嬮」</h2>
                </div>
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-display">
                  {allTodoItems.length} 椤?                </span>
              </div>
            </div>

            {/* Panel Body Sections */}
            <div className="px-5 py-3 divide-y divide-slate-50">
              <TodoSection
                title="瓒呮湡寰呭姙"
                color="bg-rose-500"
                items={data.todos.overdueItems}
                emptyText="鏆傛棤瓒呮湡寰呭姙"
              />
              <TodoSection
                title="鏈懆寰呭姙"
                color="bg-amber-500"
                items={data.todos.weekItems}
                emptyText="鏆傛棤鏈懆寰呭姙"
              />
              <TodoSection
                title="闇€鑰佹澘鍐崇瓥"
                color="bg-blue-500"
                items={data.todos.bossDecisionItems}
                emptyText="鏆傛棤闇€鑰佹澘鍐崇瓥浜嬮」"
              />
              <TodoSection
                title="閲囪喘寮傚父/鏆傚仠"
                color="bg-orange-500"
                items={data.mainline.purchaseIssueItems}
                emptyText="鏆傛棤寮傚父浜嬮」"
              />
              <TodoSection
                title="琛屾斂浜嬮」"
                color="bg-slate-400"
                items={data.admin.items}
                emptyText="鏆傛棤琛屾斂浜嬮」"
              />
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <Link href="/tasks" className="group/btn flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 premium-transition">
                <span>鏌ョ湅鍏ㄩ儴寰呭姙</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 premium-transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
