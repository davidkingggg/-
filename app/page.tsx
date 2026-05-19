import Link from 'next/link'
import DashboardCard from '@/components/dashboard/DashboardCard'
import { buildDashboardData } from '@/lib/dashboard-utils'
import type { TaskItem } from '@/lib/task-aggregation'

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
      className="group flex items-start gap-3 py-3.5 border-b border-[#eef2f7] last:border-b-0 transition-colors hover:bg-blue-50/30 -mx-1 px-1 rounded-lg"
    >
      <div className="mt-1 shrink-0">
        {item.isOverdue ? (
          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
        ) : item.priority === '高' ? (
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
        ) : (
          <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">{item.sourceLabel}</span>
          {item.priority === '高' && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">高</span>}
          {item.isOverdue && <span className="rounded bg-red-50 text-red-500 px-1.5 py-0.5 text-[10px] font-medium border border-red-200">超期</span>}
        </div>
        <div className="text-[13px] font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">{item.title}</div>
        <div className="mt-0.5 text-[11px] text-gray-400 truncate">
          {[item.categoryName, item.ownerName, item.nextAction].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="shrink-0 text-right pt-0.5">
        <div className="text-[11px] text-gray-400">{formatDate(item.dueDate)}</div>
      </div>
    </Link>
  )
}

function TodoSection({ title, color, items, emptyText }: { title: string; color: string; items: TaskItem[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block w-1.5 h-3 rounded-full ${color}`} />
          <span className="text-[13px] font-semibold text-gray-700">{title}</span>
          <span className="text-[11px] text-gray-400">0 项</span>
        </div>
        <p className="text-[12px] text-gray-300 pl-4">{emptyText}</p>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-block w-1.5 h-3 rounded-full ${color}`} />
        <span className="text-[13px] font-semibold text-gray-700">{title}</span>
        <span className="text-[11px] text-gray-400">{items.length} 项</span>
      </div>
      <div>
        {items.map((item) => <TaskItemRow key={`${item.source}-${item.id}`} item={item} />)}
      </div>
    </div>
  )
}

export default async function Home() {
  const data = await buildDashboardData()
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
    <div className="space-y-5">
      {/* Hero Card - 128px */}
      <div
        className="relative overflow-hidden rounded-[20px] text-white"
        style={{
          height: '128px',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 48%, #06b6d4 100%)',
          boxShadow: '0 18px 40px rgba(37, 99, 235, 0.22)',
          padding: '28px 32px',
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-center justify-between h-full">
          <div>
            <div className="text-[14px] text-blue-100 mb-1">{greeting}，演示用户</div>
            <h1 className="text-[24px] font-bold">今日采购工作台概览</h1>
            <div className="mt-2.5 flex items-center gap-4 text-[14px] text-blue-100/90">
              <span>供应商 {data.summary.supplierCount} 家</span>
              <span className="w-px h-3 bg-blue-300/30" />
              <span>采购进行中 {data.mainline.purchaseInProgressCount} 项</span>
              <span className="w-px h-3 bg-blue-300/30" />
              <span>超期待办 {data.summary.overdueTodoCount} 项</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end justify-center">
            {alertCount > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-red-500/90 backdrop-blur-sm px-4 py-2 text-[14px] font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>有 {alertCount} 项需要关注</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2 text-[14px]">
                <span className="text-emerald-300">✓</span>
                <span>暂无紧急事项</span>
              </div>
            )}
            <div className="mt-2 text-[11px] text-blue-200/50">
              更新于 {formatGeneratedAt(data.generatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* KPI: Core Overview */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block w-1 h-4 rounded-full bg-blue-500" />
          <h2 className="text-[15px] font-bold text-[#0f172a]">核心概览</h2>
          <span className="text-[11px] text-slate-400">推荐/备选仅统计 A优先推荐 或 B备选</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard label="供应商总数" value={data.summary.supplierCount} tone="blue" icon="&#9670;" />
          <DashboardCard label="推荐/备选供应商" value={data.summary.recommendedSupplierCount} tone="emerald" icon="&#9733;" />
          <DashboardCard label="品类总数" value={data.summary.categoryCount} tone="violet" icon="&#9830;" />
          <DashboardCard label="报价单数量" value={data.summary.quoteSheetCount} tone="amber" icon="&#9998;" />
        </div>
      </section>

      {/* KPI: Risk & Reminders */}
      <section>
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard label="综合超期待办" value={data.summary.overdueTodoCount} tone="red" icon="&#9888;" />
          <DashboardCard label="需老板决策" value={data.summary.bossDecisionCount} tone="amber" icon="&#9889;" />
          <DashboardCard label="综合本周待办" value={data.summary.weekTodoCount} tone="blue" icon="&#9200;" />
          <DashboardCard label="销售/商务资料" value={data.summary.salesMaterialCount} tone="slate" icon="&#9997;" />
        </div>
      </section>

      {/* Bottom: Mainline (70%) + Todo Panel (30%) */}
      <div className="grid grid-cols-10 gap-5">
        {/* Left: Platform Mainline + Admin */}
        <div className="col-span-7 space-y-5">
          {/* Platform Mainline */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-1 h-4 rounded-full bg-emerald-500" />
              <h2 className="text-[15px] font-bold text-[#0f172a]">平台主线工作</h2>
              <span className="text-[11px] text-slate-400">供应商开发与采购执行</span>
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

          {/* Admin */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-1 h-4 rounded-full bg-slate-400" />
              <h2 className="text-[15px] font-bold text-[#0f172a]">行政事项</h2>
              <span className="text-[11px] text-slate-400">会议、周报、接待等</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DashboardCard label="行政待办" value={data.admin.openCount} tone="slate" compact />
              <DashboardCard label="本周行政事项" value={data.admin.weekCount} tone="blue" compact />
              <DashboardCard label="超期行政事项" value={data.admin.overdueCount} tone="red" compact />
            </div>
          </section>
        </div>

        {/* Right: Unified Todo Panel */}
        <div className="col-span-3">
          <div
            className="rounded-[20px] bg-white border border-[#e5eaf3] overflow-hidden"
            style={{ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}
          >
            <div className="px-5 pt-5 pb-3 border-b border-[#eef2f7]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">⏱</span>
                  <h2 className="text-[15px] font-bold text-[#0f172a]">近期重点事项</h2>
                </div>
                <span className="text-[11px] text-slate-400">{allTodoItems.length} 项</span>
              </div>
            </div>
            <div className="px-5 py-2 space-y-1">
              <TodoSection
                title="超期待办"
                color="bg-red-400"
                items={data.todos.overdueItems}
                emptyText="暂无超期待办"
              />
              <TodoSection
                title="本周待办"
                color="bg-amber-400"
                items={data.todos.weekItems}
                emptyText="暂无本周待办"
              />
              <TodoSection
                title="需老板决策"
                color="bg-blue-400"
                items={data.todos.bossDecisionItems}
                emptyText="暂无需老板决策事项"
              />
              <TodoSection
                title="采购异常/暂停"
                color="bg-orange-400"
                items={data.mainline.purchaseIssueItems}
                emptyText="暂无异常事项"
              />
              <TodoSection
                title="行政事项"
                color="bg-slate-400"
                items={data.admin.items}
                emptyText="暂无行政事项"
              />
            </div>
            <div className="px-5 py-3 border-t border-[#eef2f7]">
              <Link href="/tasks" className="text-[12px] text-blue-600 hover:text-blue-700 font-medium">
                查看全部待办 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
