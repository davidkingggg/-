import TaskItemCard from './TaskItemCard'
import type { TaskItem } from './task-types'

interface TaskSectionProps {
  title: string
  items: TaskItem[]
}

export default function TaskSection({ title, items }: TaskSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">{items.length} 项</span>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <TaskItemCard key={`${title}-${item.source}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          暂无符合条件的待办事项
        </div>
      )}
    </section>
  )
}
