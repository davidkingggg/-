import type { ReactNode } from 'react'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'slate'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const toneClasses: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  primary: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-white text-slate-700',
}

const kpiToneClasses: Record<Tone, string> = {
  neutral: 'from-slate-50 to-white text-slate-700',
  primary: 'from-blue-50 to-white text-blue-700',
  success: 'from-emerald-50 to-white text-emerald-700',
  warning: 'from-amber-50 to-white text-amber-700',
  danger: 'from-rose-50 to-white text-rose-700',
  slate: 'from-slate-100 to-white text-slate-700',
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  meta,
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <section data-workspace-motion="enter" className="workship-page-header mb-5 flex flex-col gap-4 border-b border-slate-200/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[24px] font-extrabold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-[13px] font-medium text-slate-500">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end">{actions}</div>}
    </section>
  )
}

export function FilterPanel({
  children,
  summary,
  actions,
  className,
}: {
  children: ReactNode
  summary?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <section data-workspace-motion="enter" className={cx('workship-filter-panel mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]', className)}>
      {(summary || actions) && (
        <div className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          {summary && <div className="text-[12px] font-semibold text-slate-500">{summary}</div>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="grid gap-3">{children}</div>
    </section>
  )
}

export function KpiStrip({
  items,
  columns = 4,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }>
  columns?: 2 | 3 | 4 | 5 | 6
}) {
  const gridClass = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  }[columns]

  return (
    <div data-workspace-motion="enter" className={cx('workship-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2', gridClass)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cx(
            'rounded-lg border border-slate-200 bg-gradient-to-br p-4 shadow-[0_8px_20px_rgba(15,23,42,0.025)]',
            kpiToneClasses[item.tone ?? 'neutral']
          )}
        >
          <div className="text-[12px] font-bold text-slate-500">{item.label}</div>
          <div className="mt-1 text-[24px] font-extrabold tabular-nums tracking-tight">{item.value}</div>
          {item.hint && <div className="mt-1 text-[11px] font-medium text-slate-400">{item.hint}</div>}
        </div>
      ))}
    </div>
  )
}

export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span className={cx('workship-status-badge inline-flex h-6 items-center rounded-md border px-2 text-[12px] font-bold', toneClasses[tone], className)}>
      {children}
    </span>
  )
}

export function DataSurface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section data-workspace-motion="enter" className={cx('workship-data-surface overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.045)]', className)}>
      {children}
    </section>
  )
}

export const workspaceControlClass =
  'h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-300'

export const workspacePrimaryButtonClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50'

export const workspaceSecondaryButtonClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]'
