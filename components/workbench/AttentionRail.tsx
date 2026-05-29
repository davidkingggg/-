import Link from 'next/link'
import { AlertTriangle, ChevronRight, CircleAlert } from 'lucide-react'
import type { AttentionItem, RiskItem, WorkbenchTone } from './workbench-types'

const dotTone: Record<WorkbenchTone, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
  violet: 'bg-violet-500',
}

const riskTone: Record<WorkbenchTone, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-50 text-violet-600',
}

function RailCard({
  href,
  children,
}: {
  href?: string
  children: React.ReactNode
}) {
  if (href) {
    return (
      <Link href={href} className="block">
        {children}
      </Link>
    )
  }

  return <div>{children}</div>
}

export function AttentionRail({ items, risks }: { items: AttentionItem[]; risks: RiskItem[] }) {
  return (
    <aside data-workbench-motion="rail" className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold text-slate-900">今日重点</h2>
          <Link href="/tasks" className="shrink-0 text-[12px] font-extrabold text-blue-600">
            全部待办
          </Link>
        </div>
        <div className="space-y-1">
          {items.length === 0 && (
            <div className="rounded-md bg-slate-50 px-3 py-4 text-[13px] font-bold text-slate-400">
              今日暂无重点事项
            </div>
          )}
          {items.map((item) => (
            <RailCard key={`${item.title}-${item.href ?? item.time ?? ''}`} href={item.href}>
              <div className="flex items-start gap-3 rounded-md px-2 py-2 transition hover:bg-slate-50">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotTone[item.tone ?? 'emerald']}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-extrabold text-slate-800">{item.title}</div>
                  {item.meta && (
                    <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{item.meta}</div>
                  )}
                </div>
                {item.time && <div className="shrink-0 text-[11px] font-bold text-slate-400">{item.time}</div>}
              </div>
            </RailCard>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold text-slate-900">风险提醒</h2>
          <Link href="/data-quality" className="shrink-0 text-[12px] font-extrabold text-blue-600">
            全部风险
          </Link>
        </div>
        <div className="space-y-2">
          {risks.length === 0 && (
            <div className="rounded-md bg-slate-50 px-3 py-4 text-[13px] font-bold text-slate-400">
              暂无风险提醒
            </div>
          )}
          {risks.map((risk) => {
            const tone = risk.tone ?? 'amber'
            const Icon = tone === 'rose' ? CircleAlert : AlertTriangle
            const content = (
              <div className="flex items-center gap-3 rounded-md border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/30">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${riskTone[tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold text-slate-800">
                    {risk.title}
                    {typeof risk.count === 'number' ? `（${risk.count}）` : ''}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-slate-400">{risk.description}</span>
                </span>
                {risk.href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
              </div>
            )

            return (
              <RailCard key={`${risk.title}-${risk.href ?? risk.description}`} href={risk.href}>
                {content}
              </RailCard>
            )
          })}
        </div>
      </section>
    </aside>
  )
}
