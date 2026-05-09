import type { LookupOption, TaskFiltersValue } from './task-types'

const sourceOptions = [
  { value: '', label: '全部来源' },
  { value: 'development', label: '开发流程' },
  { value: 'purchase', label: '采购流程' },
  { value: 'admin', label: '行政事项' },
]

const scopeOptions = [
  { value: '', label: '全部分区' },
  { value: 'week', label: '本周待办' },
  { value: 'overdue', label: '超期待办' },
  { value: 'bossDecision', label: '老板决策事项' },
  { value: 'salesSupport', label: '销售配合事项' },
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
  const setValue = (key: keyof TaskFiltersValue, next: string) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm text-gray-600">
          <span className="mb-1 block">来源类型</span>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
            value={value.source}
            onChange={(event) => setValue('source', event.target.value)}
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-600">
          <span className="mb-1 block">分区</span>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
            value={value.scope}
            onChange={(event) => setValue('scope', event.target.value)}
          >
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-600">
          <span className="mb-1 block">优先级</span>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
            value={value.priority}
            onChange={(event) => setValue('priority', event.target.value)}
          >
            {priorities.map((priority) => (
              <option key={priority || 'all'} value={priority}>
                {priority || '全部优先级'}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-600">
          <span className="mb-1 block">状态</span>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
            value={value.status}
            onChange={(event) => setValue('status', event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status || 'all'} value={status}>
                {status || '默认待办状态'}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-600">
          <span className="mb-1 block">品类</span>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
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
        </label>

        <label className="text-sm text-gray-600">
          <span className="mb-1 block">负责人</span>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
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
        </label>

        <label className="text-sm text-gray-600">
          <span className="mb-1 block">开始日期</span>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
            type="date"
            value={value.from}
            onChange={(event) => setValue('from', event.target.value)}
          />
        </label>

        <label className="text-sm text-gray-600">
          <span className="mb-1 block">结束日期</span>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
            type="date"
            value={value.to}
            onChange={(event) => setValue('to', event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          type="button"
          onClick={onReset}
        >
          清空筛选
        </button>
      </div>
    </div>
  )
}
