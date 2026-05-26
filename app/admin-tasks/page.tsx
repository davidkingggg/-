'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

interface AdminTask {
  id: string
  title: string
  type: string
  priority: string | null
  dueDate: string | null
  taskDate: string | null
  startTime: string | null
  endTime: string | null
  isRecurring: boolean
  recurrenceType: string
  recurrenceEndDate: string | null
  status: string
  completedAt: string | null
  notes: string | null
  isArchived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface TaskForm {
  title: string
  type: string
  taskDate: string
  startTime: string
  endTime: string
  priority: string
  status: string
  recurrenceType: string
  recurrenceEndDate: string
  notes: string
}

interface MonthCell {
  date: Date
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
}

const PRIORITIES = ['高', '中', '低']
const STATUSES = ['未开始', '进行中', '已完成', '暂停']
const RECURRENCE_TYPES = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
]
const DEFAULT_TYPES = ['会议', '周报', '办公采购', '接待', '证照资料', '其他']
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfMonthGrid(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - mondayOffset)
  return gridStart
}

function buildMonthCells(monthDate: Date) {
  const gridStart = startOfMonthGrid(monthDate)
  const todayKey = toDateKey(new Date())

  return Array.from({ length: 42 }, (_, index): MonthCell => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const dateKey = toDateKey(date)

    return {
      date,
      dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: dateKey === todayKey,
    }
  })
}

function toDateInputValue(value: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function taskDateKey(task: AdminTask) {
  return toDateInputValue(task.taskDate || task.dueDate || task.createdAt)
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function formatMonthTitle(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function formatSelectedTitle(dateKey: string) {
  const [year, month, day] = dateKey.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

function isTaskOverdue(task: AdminTask) {
  const todayKey = toDateKey(new Date())
  const dateKey = taskDateKey(task)
  return Boolean(dateKey && dateKey < todayKey && task.status !== '已完成' && !task.isArchived)
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    未开始: 'bg-gray-100 text-gray-700',
    进行中: 'bg-sky-50 text-sky-700',
    已完成: 'bg-emerald-50 text-emerald-700',
    暂停: 'bg-amber-50 text-amber-700',
  }

  return classes[status] || 'bg-gray-100 text-gray-700'
}

function priorityClass(priority: string | null) {
  const classes: Record<string, string> = {
    高: 'bg-red-50 text-red-700',
    中: 'bg-orange-50 text-orange-700',
    低: 'bg-slate-100 text-slate-700',
  }

  return priority ? classes[priority] || 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-600'
}

function recurrenceLabel(value: string) {
  return RECURRENCE_TYPES.find((item) => item.value === value)?.label || '不重复'
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data: unknown = await response.json()
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string' &&
      data.error.trim()
    ) {
      return data.error
    }
  } catch {
    return fallback
  }

  return fallback
}

function sortTasksByTime(a: AdminTask, b: AdminTask) {
  const aTime = a.startTime || '99:99'
  const bTime = b.startTime || '99:99'
  if (aTime !== bTime) return aTime.localeCompare(bTime)
  return a.createdAt.localeCompare(b.createdAt)
}

function createEmptyForm(taskDate: string): TaskForm {
  return {
    title: '',
    type: '会议',
    taskDate,
    startTime: '',
    endTime: '',
    priority: '中',
    status: '未开始',
    recurrenceType: 'none',
    recurrenceEndDate: '',
    notes: '',
  }
}

export default function AdminTasksPage() {
  const todayKey = useMemo(() => toDateKey(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)
  const [bindingError, setBindingError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TaskForm>(() => createEmptyForm(todayKey))
  const [saving, setSaving] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<AdminTask | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { showToast } = useToast()

  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth])
  const rangeFrom = monthCells[0]?.dateKey || todayKey
  const rangeTo = monthCells[monthCells.length - 1]?.dateKey || todayKey

  const typeOptions = useMemo(() => {
    const existingTypes = tasks.map((task) => task.type).filter(Boolean)
    return [...new Set([...DEFAULT_TYPES, ...existingTypes])].sort()
  }, [tasks])

  const tasksByDate = useMemo(() => {
    return tasks.reduce<Record<string, AdminTask[]>>((groups, task) => {
      const dateKey = taskDateKey(task)
      if (!dateKey) return groups
      groups[dateKey] = [...(groups[dateKey] || []), task]
      groups[dateKey].sort(sortTasksByTime)
      return groups
    }, {})
  }, [tasks])

  const selectedTasks = tasksByDate[selectedDate] || []
  const timedTasks = selectedTasks.filter((task) => task.startTime).sort(sortTasksByTime)
  const noTimeTasks = selectedTasks.filter((task) => !task.startTime).sort(sortTasksByTime)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin-tasks?from=${rangeFrom}&to=${rangeTo}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(await readApiError(response, '获取行政事项失败'))
        }

        setBindingError('')
        setTasks(await response.json())
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        const message = error instanceof Error ? error.message : '获取行政事项失败'
        if (message.includes('未绑定人员')) {
          setBindingError(message)
          setTasks([])
        } else {
          showToast(message, 'error')
        }
      } finally {
        if (controller.signal.aborted) return
        setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [rangeFrom, rangeTo, reloadKey, showToast])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function changeMonth(offset: number) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1))
  }

  function goToday() {
    const today = new Date()
    const dateKey = toDateKey(today)
    setSelectedDate(dateKey)
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  function openCreate() {
    setEditingId(null)
    setForm(createEmptyForm(selectedDate))
    setModalOpen(true)
  }

  function openEdit(task: AdminTask) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      type: task.type,
      taskDate: toDateInputValue(task.taskDate || task.dueDate),
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      priority: task.priority || '中',
      status: task.status,
      recurrenceType: task.recurrenceType || 'none',
      recurrenceEndDate: toDateInputValue(task.recurrenceEndDate),
      notes: task.notes || '',
    })
    setModalOpen(true)
  }

  async function submitTask(event: FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(editingId ? `/api/admin-tasks/${editingId}` : '/api/admin-tasks', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dueDate: form.taskDate,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          recurrenceEndDate: form.recurrenceEndDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, '保存行政事项失败'))
      }

      showToast(editingId ? '行政事项已更新' : '行政事项已新增', 'success')
      setModalOpen(false)
      reload()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存行政事项失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(task: AdminTask, status: string) {
    try {
      const response = await fetch(`/api/admin-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, '更新状态失败'))
      }

      showToast('状态已更新', 'success')
      reload()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新状态失败', 'error')
    }
  }

  async function archiveTask() {
    if (!archiveTarget) return

    try {
      const response = await fetch(`/api/admin-tasks/${archiveTarget.id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await readApiError(response, '归档行政事项失败'))
      }

      showToast('行政事项已归档', 'success')
      reload()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '归档行政事项失败', 'error')
    }
  }

  function renderTaskCard(task: AdminTask, compact = false) {
    return (
      <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {task.startTime ? (
                <span className="shrink-0 text-xs font-semibold text-slate-500">
                  {task.startTime}{task.endTime ? `-${task.endTime}` : ''}
                </span>
              ) : null}
              <span className="break-words text-sm font-semibold text-slate-900">{task.title}</span>
            </div>
            {!compact && task.notes ? (
              <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-slate-500">{task.notes}</p>
            ) : null}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(task.status)}`}>
            {task.status}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${priorityClass(task.priority)}`}>
            {task.priority || '未设优先级'}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{task.type}</span>
          {task.recurrenceType !== 'none' ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
              {recurrenceLabel(task.recurrenceType)}
              {task.recurrenceEndDate ? ` 至 ${formatDate(task.recurrenceEndDate)}` : ''}
            </span>
          ) : null}
          {isTaskOverdue(task) ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">已超期</span>
          ) : null}
        </div>

        {!compact ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <select
              value={task.status}
              onChange={(event) => updateStatus(task, event.target.value)}
              className="h-9 min-w-[116px] rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openEdit(task)}
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-800"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => setArchiveTarget(task)}
                className="text-[13px] font-semibold text-red-600 hover:text-red-700"
              >
                归档
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-950">我的行政事项</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">
            按日期安排个人行政事项，左侧查看整月分布，右侧处理选中日期的待办。
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="h-10 w-full rounded-lg bg-blue-600 px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 md:w-auto"
        >
          新增行政事项
        </button>
      </div>

      {bindingError ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {bindingError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="h-9 min-w-[36px] rounded-lg border border-slate-200 text-lg leading-none text-slate-700 hover:bg-slate-50"
                aria-label="上个月"
              >
                ‹
              </button>
              <div className="min-w-[132px] text-center text-lg font-bold text-slate-950">{formatMonthTitle(visibleMonth)}</div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="h-9 min-w-[36px] rounded-lg border border-slate-200 text-lg leading-none text-slate-700 hover:bg-slate-50"
                aria-label="下个月"
              >
                ›
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                今天
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">范围 {rangeFrom} 至 {rangeTo}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{tasks.length} 项</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAYS.map((weekday) => (
                  <div key={weekday} className="h-9 px-2 text-center text-xs font-semibold leading-9 text-slate-500">
                    周{weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthCells.map((cell) => {
                  const cellTasks = tasksByDate[cell.dateKey] || []
                  const isSelected = selectedDate === cell.dateKey

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateKey)}
                      className={`min-h-[116px] min-w-0 border-b border-r border-slate-100 p-2 text-left transition-colors hover:bg-blue-50/60 ${
                        isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'bg-white'
                      } ${cell.isCurrentMonth ? '' : 'text-slate-400'} ${(cell.date.getDay() === 0 || cell.date.getDay() === 6) ? 'bg-slate-50/70' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-1">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                          cell.isToday ? 'bg-blue-600 text-white' : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                        }`}>
                          {cell.dayNumber}
                        </span>
                        {cellTasks.length > 0 ? (
                          <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {cellTasks.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {cellTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className={`truncate rounded px-2 py-1 text-[11px] font-medium ${
                              task.status === '已完成' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                            }`}
                            title={task.title}
                          >
                            {task.startTime ? `${task.startTime} ` : ''}{task.title}
                          </div>
                        ))}
                        {cellTasks.length > 3 ? (
                          <div className="px-2 text-[11px] font-medium text-slate-400">还有 {cellTasks.length - 3} 项</div>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-500">选中日期</div>
            <div className="mt-1 break-words text-xl font-bold text-slate-950">{formatSelectedTitle(selectedDate)}</div>
            <div className="mt-2 text-[13px] text-slate-500">
              {selectedTasks.length > 0 ? `${selectedTasks.length} 项行政事项` : '暂无行政事项'}
            </div>
          </div>

          <div className="max-h-[720px] overflow-y-auto p-4">
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-400">正在加载行政事项...</div>
            ) : selectedTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                这一天还没有安排事项
              </div>
            ) : (
              <div className="space-y-5">
                {timedTasks.length > 0 ? (
                  <section>
                    <h2 className="mb-3 text-sm font-bold text-slate-800">有时间安排</h2>
                    <div className="space-y-3">{timedTasks.map((task) => renderTaskCard(task))}</div>
                  </section>
                ) : null}
                {noTimeTasks.length > 0 ? (
                  <section>
                    <h2 className="mb-3 text-sm font-bold text-slate-800">无具体时间</h2>
                    <div className="space-y-3">{noTimeTasks.map((task) => renderTaskCard(task))}</div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑行政事项' : '新增行政事项'}
        width="max-w-3xl"
      >
        <form onSubmit={submitTask} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">事项名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">类型 <span className="text-red-500">*</span></label>
              <input
                type="text"
                list="admin-task-types"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
              <datalist id="admin-task-types">
                {typeOptions.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">事项日期 <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.taskDate}
                onChange={(event) => setForm({ ...form, taskDate: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">开始时间</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">结束时间</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">优先级</label>
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">状态</label>
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">重复规则</label>
              <select
                value={form.recurrenceType}
                onChange={(event) => setForm({ ...form, recurrenceType: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {RECURRENCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">重复结束日期</label>
            <input
              type="date"
              value={form.recurrenceEndDate}
              onChange={(event) => setForm({ ...form, recurrenceEndDate: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">备注</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={4}
              className="min-h-[104px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 rounded-lg bg-slate-100 px-5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-blue-600 px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={archiveTask}
        title="确认归档行政事项"
        message={`确定要归档“${archiveTarget?.title || ''}”吗？归档后默认不再显示。`}
        confirmText="确认归档"
        cancelText="取消"
      />
    </div>
  )
}
