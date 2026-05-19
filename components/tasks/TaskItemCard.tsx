import Link from 'next/link'
import type { TaskItem } from './task-types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatDate(value?: string) {
  if (!value) return '未设置'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function formatFullDate(value?: string) {
  if (!value) return '未设置'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function priorityDot(priority?: string) {
  if (priority === '高') return '#ef4444'
  if (priority === '中') return '#f59e0b'
  return '#94a3b8'
}

function priorityLabel(priority?: string) {
  return priority || '低'
}

interface TaskItemCardProps {
  item: TaskItem
}

export default function TaskItemCard({ item }: TaskItemCardProps) {
  return (
    <div
      className="relative rounded-2xl border bg-white px-5 py-4 transition-shadow hover:shadow-md"
      style={{
        borderColor: item.isOverdue ? '#fecaca' : '#e5eaf3',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
        ...(item.isOverdue
          ? { background: 'linear-gradient(90deg, #fff7f7 0%, #ffffff 36%)' }
          : {}),
      }}
    >
      {/* 顶部：标签行 + 截止日期 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ color: priorityDot(item.priority), backgroundColor: `${priorityDot(item.priority)}12` }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: priorityDot(item.priority) }}
            />
            {priorityLabel(item.priority)}优先级
          </span>

          {item.isOverdue && (
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
              已超期
            </span>
          )}

          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
            {item.sourceLabel}
          </span>

          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            {item.status}
          </span>
        </div>

        <span className="text-sm font-semibold" style={{ color: item.isOverdue ? '#dc2626' : '#64748b' }}>
          {formatFullDate(item.dueDate)}
        </span>
      </div>

      {/* 标题 */}
      <h3 className="mt-2 text-lg font-extrabold leading-snug text-gray-900">
        {item.title}
      </h3>

      {/* 元信息 */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {item.ownerName && <span>负责人：{item.ownerName}</span>}
        {item.currentStage && <span>阶段：{item.currentStage}</span>}
        {item.supplierName && <span>供应商：{item.supplierName}</span>}
        {item.categoryName && <span>品类：{item.categoryName}</span>}
      </div>

      {/* 下一步动作 */}
      {item.nextAction && (
        <div
          className="mt-3 rounded-xl px-3 py-2.5 text-sm text-gray-600"
          style={{ background: '#f8fafc' }}
        >
          <span className="font-medium text-gray-500">下一步：</span>
          {item.nextAction}
        </div>
      )}

      {/* 底部操作 */}
      <div className="mt-3 flex items-center justify-end">
        <Link
          className="inline-flex items-center justify-center rounded-lg border px-4 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          style={{ borderColor: '#bfdbfe' }}
          href={item.href}
        >
          查看详情
        </Link>
      </div>
    </div>
  )
}
