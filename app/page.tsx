import Link from 'next/link'
import {
  ClipboardList,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Siren,
  TrendingUp,
  Users,
} from 'lucide-react'
import { AttentionRail } from '@/components/workbench/AttentionRail'
import {
  FilterField,
  WorkbenchFilterBar,
  workbenchInputClass,
} from '@/components/workbench/WorkbenchFilterBar'
import { WorkbenchKpis } from '@/components/workbench/WorkbenchKpis'
import { WorkbenchMotion } from '@/components/workbench/WorkbenchMotion'
import { WorkbenchEmptyState, WorkbenchTable } from '@/components/workbench/WorkbenchTable'
import type { AttentionItem, RiskItem, WorkbenchKpi, WorkbenchTone } from '@/components/workbench/workbench-types'
import { buildDashboardData } from '@/lib/dashboard-utils'
import { getCurrentUser } from '@/lib/auth-utils'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function formatDate(value?: string) {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未设置'
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
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

function priorityTone(priority?: string): WorkbenchTone {
  if (priority?.includes('高')) return 'amber'
  return 'emerald'
}

function FilterValue({ label, value }: { label: string; value: string }) {
  return (
    <span
      aria-label={`${label}：${value}`}
      className={`${workbenchInputClass} inline-flex cursor-default items-center`}
    >
      {value}
    </span>
  )
}

type WorkRow = {
  module: string
  href: string
  owner: string
  current: string
  pending: string
  risk: string
  action: string
  tone: 'amber' | 'blue' | 'emerald' | 'rose' | 'slate'
}

export default async function Home() {
  const user = await getCurrentUser()
  const data = await buildDashboardData(user?.personId)
  const session = await getSession()
  const userName = session.name || '用户'
  const riskSignalCount =
    data.summary.overdueTodoCount + data.summary.bossDecisionCount + data.mainline.purchaseIssueCount

  const homeKpis: WorkbenchKpi[] = [
    {
      label: '询价中项目',
      value: data.summary.quoteSheetCount,
      helper: '报价单数量',
      trend: '价格资产',
      tone: 'blue',
      icon: ClipboardList,
    },
    {
      label: '待报价项目',
      value: data.summary.weekTodoCount,
      helper: '本周待办',
      trend: data.summary.weekTodoCount > 0 ? '持续推进' : '节奏平稳',
      tone: 'amber',
      icon: FileSpreadsheet,
    },
    {
      label: '已超期项目',
      value: data.summary.overdueTodoCount,
      helper: '需要马上处理',
      trend: data.summary.overdueTodoCount > 0 ? '优先关闭' : '暂无超期',
      tone: 'rose',
      icon: Siren,
    },
    {
      label: '采购执行中',
      value: data.mainline.purchaseInProgressCount,
      helper: '主线流程',
      trend: '持续跟进',
      tone: 'emerald',
      icon: ShoppingCart,
    },
    {
      label: '风险提醒',
      value: data.summary.bossDecisionCount + data.mainline.purchaseIssueCount,
      helper: '需处理',
      trend: '老板决策/异常',
      tone: 'violet',
      icon: TrendingUp,
    },
  ]

  const attentionItems: AttentionItem[] = [
    ...data.todos.overdueItems,
    ...data.todos.weekItems,
    ...data.todos.bossDecisionItems,
    ...data.mainline.purchaseIssueItems,
    ...data.admin.items,
  ]
    .slice(0, 5)
    .map((item) => ({
      title: item.title,
      meta: [item.sourceLabel, item.categoryName, item.ownerName].filter(Boolean).join(' / '),
      time: item.dueDate ? formatDate(item.dueDate) : undefined,
      tone: item.isOverdue ? 'rose' : priorityTone(item.priority),
      href: item.href,
    }))

  const riskItems: RiskItem[] = [
    {
      title: '超期待办',
      description: '需要优先协调负责人和下一步动作',
      count: data.summary.overdueTodoCount,
      tone: data.summary.overdueTodoCount > 0 ? 'rose' : 'slate',
      href: '/tasks',
    },
    {
      title: '老板决策',
      description: '报价、供应商或流程存在决策阻塞',
      count: data.summary.bossDecisionCount,
      tone: data.summary.bossDecisionCount > 0 ? 'amber' : 'slate',
      href: '/tasks',
    },
    {
      title: '采购异常',
      description: '异常或暂停的采购执行流程',
      count: data.mainline.purchaseIssueCount,
      tone: data.mainline.purchaseIssueCount > 0 ? 'rose' : 'slate',
      href: '/purchase-board',
    },
    {
      title: '行政超期',
      description: '当前账号绑定人员的行政事项',
      count: data.admin.overdueCount,
      tone: data.admin.overdueCount > 0 ? 'amber' : 'slate',
      href: '/admin-tasks',
    },
  ]

  const workRows: WorkRow[] = [
    {
      module: '报价对比',
      href: '/quote-compare',
      owner: '采购负责人',
      current: `${data.summary.quoteSheetCount} 张报价单`,
      pending: `${data.summary.weekTodoCount} 项本周待办`,
      risk: data.summary.bossDecisionCount > 0 ? `${data.summary.bossDecisionCount} 项需决策` : '无决策阻塞',
      action: '查看完整对比',
      tone: data.summary.bossDecisionCount > 0 ? 'amber' : 'blue',
    },
    {
      module: '供应商开发',
      href: '/development-board',
      owner: '开发负责人',
      current: `${data.mainline.developmentInProgressCount} 项开发中`,
      pending: `${data.summary.recommendedSupplierCount} 家推荐/备选`,
      risk: `${data.mainline.overdueCount} 项主线超期`,
      action: '选择供应商',
      tone: data.mainline.overdueCount > 0 ? 'rose' : 'emerald',
    },
    {
      module: '采购执行',
      href: '/purchase-board',
      owner: '执行负责人',
      current: `${data.mainline.purchaseInProgressCount} 项进行中`,
      pending: `${data.mainline.purchaseIssueCount} 项异常/暂停`,
      risk: data.mainline.purchaseIssueCount > 0 ? '需要重新排程' : '流程正常',
      action: '确定成交供应商',
      tone: data.mainline.purchaseIssueCount > 0 ? 'rose' : 'emerald',
    },
    {
      module: '报价管理',
      href: '/quotes',
      owner: '报价维护',
      current: `${data.summary.quoteSheetCount} 张报价单`,
      pending: `${data.summary.categoryCount} 个品类覆盖`,
      risk: '关注报价有效期',
      action: '重新询价',
      tone: 'blue',
    },
    {
      module: '行政事项',
      href: '/admin-tasks',
      owner: userName,
      current: `${data.admin.openCount} 项打开`,
      pending: `${data.admin.weekCount} 项本周`,
      risk: data.admin.overdueCount > 0 ? `${data.admin.overdueCount} 项超期` : '暂无行政超期',
      action: '查看事项',
      tone: data.admin.overdueCount > 0 ? 'amber' : 'slate',
    },
  ]

  const toneClass: Record<WorkRow['tone'], string> = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  }

  const tableToolbar = (
    <>
      <Link
        href="/quote-compare"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12px] font-extrabold text-white transition hover:bg-blue-700"
      >
        <Search className="h-3.5 w-3.5" />
        查看完整对比
      </Link>
      <Link
        href="/suppliers"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <Users className="h-3.5 w-3.5" />
        选择供应商
      </Link>
      <Link
        href="/quotes"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        重新询价
      </Link>
    </>
  )

  return (
    <WorkbenchMotion>
      <div className="space-y-4">
        {!user?.personId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
            当前账号未绑定人员，首页仍会显示公共采购盘面；绑定人员后会同步显示你的个人行政事项。
          </div>
        )}

        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-[12px] font-extrabold text-slate-500">{getGreeting()}，{userName}</div>
            <h1 className="mt-1 text-[22px] font-extrabold tracking-normal text-slate-950">今日采购工作台</h1>
            <p className="mt-1 text-[13px] font-semibold text-slate-500">
              供应商 {data.summary.supplierCount} 家，采购进行中 {data.mainline.purchaseInProgressCount} 项，更新于 {formatGeneratedAt(data.generatedAt)}
            </p>
          </div>
          <div
            className={`inline-flex h-9 items-center gap-2 self-start rounded-md px-3 text-[13px] font-extrabold ring-1 lg:self-auto ${
              riskSignalCount > 0 ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            {riskSignalCount > 0 ? `有 ${riskSignalCount} 个风险信号` : '暂无风险信号'}
          </div>
        </div>

        <WorkbenchFilterBar showReset={false} showSaveView={false}>
          <FilterField label="时间范围">
            <FilterValue label="时间范围" value="本周" />
          </FilterField>
          <FilterField label="组织">
            <FilterValue label="组织" value="全部组织" />
          </FilterField>
          <FilterField label="采购类别">
            <FilterValue label="采购类别" value="全部品类" />
          </FilterField>
          <FilterField label="状态">
            <FilterValue label="状态" value="全部状态" />
          </FilterField>
        </WorkbenchFilterBar>

        <WorkbenchKpis items={homeKpis} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <WorkbenchTable
              title="报价对比"
              subtitle="采购主线、报价资产和风险事项的今日样例盘面"
              toolbar={tableToolbar}
              footer={
                <div className="flex flex-col gap-2 text-[12px] font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>共 {workRows.length} 个业务模块，所有操作均跳转到真实功能页。</span>
                  <Link href="/purchase-board" className="font-extrabold text-blue-600 hover:text-blue-700">
                    确定成交供应商
                  </Link>
                </div>
              }
            >
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-[12px] font-extrabold text-slate-500">
                    <th scope="col" className="px-4 py-3">业务模块</th>
                    <th scope="col" className="px-4 py-3">负责人</th>
                    <th scope="col" className="px-4 py-3">当前量</th>
                    <th scope="col" className="px-4 py-3">待处理</th>
                    <th scope="col" className="px-4 py-3">风险提示</th>
                    <th scope="col" className="px-4 py-3 text-right">动作</th>
                  </tr>
                </thead>
                <tbody>
                  {workRows.map((row) => (
                    <tr key={row.module} className="border-b border-slate-100 text-[13px] last:border-b-0 hover:bg-blue-50/25">
                      <td className="px-4 py-3">
                        <Link href={row.href} className="font-extrabold text-slate-900 hover:text-blue-700">
                          {row.module}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{row.owner}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.current}</td>
                      <td className="px-4 py-3 text-slate-600">{row.pending}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-md px-2 py-1 text-[12px] font-extrabold ring-1 ${toneClass[row.tone]}`}>
                          {row.risk}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={row.href} className="font-extrabold text-blue-600 hover:text-blue-700">
                          {row.action}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </WorkbenchTable>

            {workRows.length === 0 && (
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <WorkbenchEmptyState
                  title="暂无符合条件的项目"
                  action={
                    <Link href="/quote-compare" className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700">
                      清空筛选条件
                    </Link>
                  }
                />
              </section>
            )}
          </div>

          <AttentionRail items={attentionItems} risks={riskItems} />
        </div>
      </div>
    </WorkbenchMotion>
  )
}
