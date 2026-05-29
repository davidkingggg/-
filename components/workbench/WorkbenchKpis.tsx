import type { WorkbenchKpi, WorkbenchTone } from './workbench-types'

const toneClasses: Record<WorkbenchTone, { card: string; icon: string; trend: string }> = {
  blue: {
    card: 'border-blue-100 bg-blue-50/70',
    icon: 'bg-blue-600 text-white',
    trend: 'text-blue-700',
  },
  emerald: {
    card: 'border-emerald-100 bg-emerald-50/70',
    icon: 'bg-emerald-600 text-white',
    trend: 'text-emerald-700',
  },
  amber: {
    card: 'border-amber-100 bg-amber-50/80',
    icon: 'bg-amber-500 text-white',
    trend: 'text-amber-700',
  },
  rose: {
    card: 'border-rose-100 bg-rose-50/70',
    icon: 'bg-rose-600 text-white',
    trend: 'text-rose-700',
  },
  slate: {
    card: 'border-slate-200 bg-white',
    icon: 'bg-slate-700 text-white',
    trend: 'text-slate-600',
  },
  violet: {
    card: 'border-violet-100 bg-violet-50/70',
    icon: 'bg-violet-600 text-white',
    trend: 'text-violet-700',
  },
}

export function WorkbenchKpis({ items }: { items: WorkbenchKpi[] }) {
  return (
    <section
      data-workbench-motion="kpis"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      {items.map((item) => {
        const tone = item.tone ?? 'slate'
        const Icon = item.icon
        const classes = toneClasses[tone]

        return (
          <article
            key={item.label}
            className={`min-h-[108px] rounded-lg border p-4 shadow-sm ${classes.card}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold text-slate-500">{item.label}</div>
                <div className="mt-2 text-[26px] font-extrabold leading-none tracking-normal text-slate-950">
                  {item.value}
                </div>
              </div>
              {Icon && (
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${classes.icon}`}>
                  <Icon className="h-4 w-4" />
                </span>
              )}
            </div>
            {(item.helper || item.trend) && (
              <div className="mt-3 flex min-w-0 items-center justify-between gap-2 text-[11px] font-bold">
                {item.helper && <span className="min-w-0 truncate text-slate-500">{item.helper}</span>}
                {item.trend && <span className={`shrink-0 ${classes.trend}`}>{item.trend}</span>}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
