import Link from 'next/link'
import DashboardCard from '@/components/dashboard/DashboardCard'
import { buildDashboardData } from '@/lib/dashboard-utils'
import type { TaskItem } from '@/lib/task-aggregation'

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

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">{text}</div>
}

function TaskList({ items, emptyText }: { items: TaskItem[]; emptyText: string }) {
  if (items.length === 0) return <EmptyState text={emptyText} />

  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
      {items.map((item) => (
        <Link key={`${item.source}-${item.id}`} href={item.href} className="block p-4 transition-colors hover:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{item.sourceLabel}</span>
                {item.priority ? <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{item.priority}</span> : null}
                {item.isOverdue ? <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">已超期</span> : null}
              </div>
              <div className="mt-2 break-words font-medium text-gray-900">{item.title}</div>
              <div className="mt-1 break-words text-sm text-gray-500">
                {[item.categoryName, item.ownerName ? `负责人：${item.ownerName}` : '', item.nextAction].filter(Boolean).join(' / ') || '暂无补充'}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-gray-500">
              <div>{formatDate(item.dueDate)}</div>
              <div className="mt-1">{item.status}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}

export default async function Home() {
  const data = await buildDashboardData()

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">首页仪表盘</h1>
          <p className="mt-1 text-sm text-gray-600">
            汇总供应链主线工作与行政事项；综合待办包含行政事项，主线风险区只展示开发和采购流程。
          </p>
        </div>
        <div className="text-sm text-gray-400">更新时间：{formatGeneratedAt(data.generatedAt)}</div>
      </div>

      <section>
        <SectionHeader title="核心概览" subtitle="推荐/备选供应商数仅统计未归档且等级为 A优先推荐或 B备选的供应商。" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard label="推荐/备选供应商数" value={data.summary.recommendedSupplierCount} tone="blue" description="Supplier.isArchived=false，且推荐等级为 A 或 B" />
          <DashboardCard label="有效品类数" value={data.summary.activeCategoryCount} tone="emerald" description="未归档品类" />
          <DashboardCard label="已收录报价单" value={data.summary.quoteSheetCount} tone="violet" description="未归档报价单" />
          <DashboardCard label="进行中主线流程" value={data.summary.openMainlineProcessCount} tone="amber" description="开发流程 + 采购流程，排除行政事项" />
        </div>
      </section>

      <section>
        <SectionHeader title="平台主线工作" subtitle="供应商开发与采购执行的主线看板；行政事项不会进入这里的风险统计。" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <DashboardCard label="开发进行中" value={data.mainline.openDevelopmentCount} tone="blue" />
          <DashboardCard label="采购进行中" value={data.mainline.openPurchaseCount} tone="emerald" />
          <DashboardCard label="本周主线待办" value={data.mainline.weekCount} tone="amber" />
          <DashboardCard label="主线超期待办" value={data.mainline.overdueCount} tone="red" />
          <DashboardCard label="待老板决策" value={data.mainline.bossDecisionCount} tone="slate" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div>
            <SectionHeader title="本周主线待办" subtitle="口径与待办中心一致，排除行政事项。" />
            <TaskList items={data.mainline.weekItems} emptyText="本周暂无主线待办" />
          </div>
          <div>
            <SectionHeader title="主线超期待办" subtitle="仅开发流程和采购流程，避免行政事项被误判为供应链风险。" />
            <TaskList items={data.mainline.overdueItems} emptyText="当前暂无主线超期待办" />
          </div>
          <div>
            <SectionHeader title="老板决策事项" subtitle="来自未关闭的开发/采购流程，口径与待办中心保持一致。" />
            <TaskList items={data.mainline.bossDecisionItems} emptyText="当前暂无老板决策事项" />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="行政事项" subtitle="会议、周报、接待、办公采购等行政工作单独展示；综合待办数字会包含这些事项。" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <DashboardCard label="行政待办" value={data.admin.openCount} tone="slate" />
          <DashboardCard label="本周行政事项" value={data.admin.weekCount} tone="blue" />
          <DashboardCard label="超期行政事项" value={data.admin.overdueCount} tone="red" />
        </div>
        <div className="mt-4">
          <TaskList items={data.admin.items} emptyText="当前暂无行政事项" />
        </div>
      </section>

      <section>
        <SectionHeader title="综合待办口径" subtitle="以下数字与待办中心一致，其中本周待办和超期待办包含行政事项；供应链主线风险请看上方主线区。" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard label="本周待办" value={data.summary.weekTodoCount} tone="amber" />
          <DashboardCard label="超期待办" value={data.summary.overdueTodoCount} tone="red" />
          <DashboardCard label="老板决策" value={data.summary.bossDecisionCount} tone="slate" />
          <DashboardCard label="行政事项" value={data.summary.adminTodoCount} tone="blue" />
        </div>
      </section>
    </div>
  )
}
