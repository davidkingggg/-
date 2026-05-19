import { useState } from 'react'
import type { LookupOption, TaskFiltersValue } from './task-types'

const sourceOptions = [
  { value: '', label: '全部来源' },
  { value: 'development', label: '开发流程' },
  { value: 'purchase', label: '采购流程' },
  { value: 'admin', label: '行政事项' },
]

const priorities = ['', '高', '中', '低']
const statuses = ['', '未开始', '进行中', '暂停', '已完成', '淘汰', '异常']

interface TaskFiltersProps {
  value: TaskFiltersValue
  categories: LookupOption[]
  people: LookupOption[]
  onChange: (nextValue: TaskFiltersValue) => void
  onReset: () => void
}

export default function TaskFilters({ value, categories, people, onChange, onReset }: TaskFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const setValue = (key: keyof TaskFiltersValue, next: string) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div
      className="rounded-2xl border bg-white"
      style={{
        borderColor: '#e5eaf3',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* 常用筛选 */}
      <div className="p-4 pb-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <select
            className="rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
            style={{ borderColor: '#e2e8f0' }}
            value={value.source}
            onChange={(event) => setValue('source', event.target.value)}
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
            style={{ borderColor: '#e2e8f0' }}
            value={value.priority}
            onChange={(event) => setValue('priority', event.target.value)}
          >
            {priorities.map((priority) => (
              <option key={priority || 'all'} value={priority}>
                {priority || '全部优先级'}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
            style={{ borderColor: '#e2e8f0' }}
            value={value.status}
            onChange={(event) => setValue('status', event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status || 'all'} value={status}>
                {status || '全部状态'}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
            style={{ borderColor: '#e2e8f0' }}
            value={value.ownerId}
            onChange={(event) => setValue('ownerId', event.target.value)}
          >
            <option value="">全部负责人</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e2e8f0' }}
              type="button"
              onClick={onReset}
            >
              重置
            </button>
            <button
              className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e2e8f0' }}
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '收起' : '高级'}
            </button>
          </div>
        </div>
      </div>

      {/* 高级筛选（默认收起） */}
      {showAdvanced && (
        <div className="border-t px-4 py-3" style={{ borderColor: '#f1f5f9' }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
              style={{ borderColor: '#e2e8f0' }}
              value={value.categoryId}
              onChange={(event) => setValue('categoryId', event.target.value)}
            >
              <option value="">全部品类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
              style={{ borderColor: '#e2e8f0' }}
              type="date"
              placeholder="开始日期"
              value={value.from}
              onChange={(event) => setValue('from', event.target.value)}
            />

            <input
              className="rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
              style={{ borderColor: '#e2e8f0' }}
              type="date"
              placeholder="结束日期"
              value={value.to}
              onChange={(event) => setValue('to', event.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
