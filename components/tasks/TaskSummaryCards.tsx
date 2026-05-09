import type { TaskResponse } from './task-types'

const cards = [
  { key: 'weekCount', label: '本周待办', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'overdueCount', label: '超期待办', tone: 'border-red-200 bg-red-50 text-red-700' },
  { key: 'bossDecisionCount', label: '老板决策', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'salesSupportCount', label: '销售配合', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'adminCount', label: '行政事项', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
] as const

interface TaskSummaryCardsProps {
  summary: TaskResponse['summary']
}

export default function TaskSummaryCards({ summary }: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.key} className={`rounded-lg border px-4 py-3 ${card.tone}`}>
          <div className="text-sm font-medium">{card.label}</div>
          <div className="mt-2 text-3xl font-bold leading-none">{summary[card.key]}</div>
        </div>
      ))}
    </div>
  )
}
