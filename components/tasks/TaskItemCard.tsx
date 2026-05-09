import Link from 'next/link'
import type { TaskItem } from './task-types'

function formatDate(value?: string) {
  if (!value) return '未设置'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function priorityClass(priority?: string) {
  if (priority === '高') return 'bg-red-50 text-red-700 border-red-100'
  if (priority === '中') return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-gray-50 text-gray-600 border-gray-100'
}

interface TaskItemCardProps {
  item: TaskItem
}

export default function TaskItemCard({ item }: TaskItemCardProps) {
  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${item.isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
            <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {item.sourceLabel}
            </span>
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${priorityClass(item.priority)}`}>
              {item.priority || '低'}
            </span>
            {item.isOverdue && (
              <span className="rounded border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                已超期
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
            <div>截止日期：{formatDate(item.dueDate)}</div>
            <div>状态：{item.status}</div>
            <div>阶段：{item.currentStage || '未设置'}</div>
            <div>负责人：{item.ownerName || '未设置'}</div>
            <div>供应商：{item.supplierName || '无'}</div>
            <div>品类：{item.categoryName || '无'}</div>
          </div>

          {(item.nextAction || item.currentProblem) && (
            <div className="mt-3 space-y-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {item.nextAction && <div>下一步动作：{item.nextAction}</div>}
              {item.currentProblem && <div>当前问题：{item.currentProblem}</div>}
            </div>
          )}
        </div>

        <Link
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          href={item.href}
        >
          查看来源
        </Link>
      </div>
    </div>
  )
}
