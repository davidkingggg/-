import type { ReactNode } from 'react'

export function WorkbenchTable({
  title,
  subtitle,
  toolbar,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section
      data-workbench-motion="table"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-extrabold text-slate-900">{title}</h2>
          {subtitle && <div className="mt-1 text-[12px] font-semibold text-slate-500">{subtitle}</div>}
        </div>
        {toolbar && <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbar}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3">{footer}</div>}
    </section>
  )
}

export function WorkbenchEmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 px-4 text-center">
      <div className="h-10 w-12 rounded-md bg-slate-100" />
      <div className="text-[13px] font-extrabold text-slate-500">{title}</div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
