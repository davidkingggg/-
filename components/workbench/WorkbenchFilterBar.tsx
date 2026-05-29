import type { ReactNode } from 'react'
import { Bookmark, RotateCcw, SlidersHorizontal } from 'lucide-react'

export const workbenchInputClass =
  'h-9 min-w-[148px] rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-300'

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-extrabold text-slate-500">{label}</span>
      {children}
    </label>
  )
}

export function WorkbenchFilterBar({
  children,
  actions,
  onReset,
  onSaveView,
  showReset = true,
  showSaveView = true,
}: {
  children: ReactNode
  actions?: ReactNode
  onReset?: () => void
  onSaveView?: () => void
  showReset?: boolean
  showSaveView?: boolean
}) {
  return (
    <section
      data-workbench-motion="filters"
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
          <div className="flex h-9 items-center gap-2 rounded-md bg-slate-100 px-3 text-[13px] font-extrabold text-slate-700">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            筛选
          </div>
          {children}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {showReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={!onReset}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </button>
          )}
          {showSaveView && (
            <button
              type="button"
              onClick={onSaveView}
              disabled={!onSaveView}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-3 text-[13px] font-bold text-blue-700 transition hover:bg-blue-100/70 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-slate-50"
            >
              <Bookmark className="h-4 w-4" />
              保存视图
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
