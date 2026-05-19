import type { TaskResponse } from './task-types'

const cards = [
  { key: 'weekCount' as const, label: '本周待办', desc: '本周需处理事项', color: '#2563eb', bg: '#eff6ff' },
  { key: 'overdueCount' as const, label: '超期待办', desc: '已逾期需处理', color: '#dc2626', bg: '#fff1f2' },
  { key: 'bossDecisionCount' as const, label: '老板决策', desc: '等待决策事项', color: '#d97706', bg: '#fffbeb' },
  { key: 'salesSupportCount' as const, label: '销售配合', desc: '需销售配合事项', color: '#059669', bg: '#ecfdf5' },
  { key: 'adminCount' as const, label: '行政事项', desc: '行政待办事项', color: '#475569', bg: '#f8fafc' },
]

interface TaskSummaryCardsProps {
  summary: TaskResponse['summary']
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function TaskSummaryCards({ summary, activeTab, onTabChange }: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const isActive = activeTab === card.key.replace('Count', '')
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onTabChange(card.key.replace('Count', ''))}
            className="cursor-pointer rounded-2xl border bg-white px-5 py-4 text-left transition-all"
            style={{
              minHeight: 92,
              borderColor: isActive ? card.color : '#e5e7eb',
              boxShadow: isActive
                ? `0 8px 24px ${card.color}18`
                : '0 8px 24px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div className="text-sm font-semibold" style={{ color: '#64748b' }}>
              {card.label}
            </div>
            <div
              className="mt-2 text-3xl font-extrabold leading-none"
              style={{ color: card.color }}
            >
              {summary[card.key]}
            </div>
            <div className="mt-2 text-xs" style={{ color: '#94a3b8' }}>
              {card.desc}
            </div>
          </button>
        )
      })}
    </div>
  )
}
