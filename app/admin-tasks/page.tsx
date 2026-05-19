'use client'

import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

interface AdminTask {
  id: string
  title: string
  type: string
  priority: string | null
  dueDate: string | null
  isRecurring: boolean
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
  priority: string
  dueDate: string
  isRecurring: boolean
  status: string
  notes: string
}

const PRIORITIES = ['高', '中', '低']
const STATUSES = ['未开始', '进行中', '已完成', '暂停']
const DEFAULT_TYPES = ['会议', '周报', '办公采购', '接待', '证照资料', '其他']

const EMPTY_FORM: TaskForm = {
  title: '',
  type: '会议',
  priority: '中',
  dueDate: '',
  isRecurring: false,
  status: '未开始',
  notes: '',
}

function toDateInputValue(value: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function isTaskOverdue(task: AdminTask) {
  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dueTime = task.dueDate ? Date.parse(task.dueDate.slice(0, 10)) : Number.NaN

  return Boolean(task.dueDate && dueTime < todayUtc && task.status !== '已完成' && !task.isArchived)
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

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<AdminTask | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterOverdue, setFilterOverdue] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const { showToast } = useToast()

  const typeOptions = useMemo(() => {
    const existingTypes = tasks.map((task) => task.type).filter(Boolean)
    return [...new Set([...DEFAULT_TYPES, ...existingTypes])].sort()
  }, [tasks])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filterType) params.set('type', filterType)
        if (filterStatus) params.set('status', filterStatus)
        if (filterPriority) params.set('priority', filterPriority)
        if (filterOverdue) params.set('overdue', filterOverdue)

        const response = await fetch(`/api/admin-tasks?${params.toString()}`)
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '获取行政事项列表失败')
        }

        setTasks(await response.json())
      } catch (error) {
        showToast(error instanceof Error ? error.message : '获取行政事项列表失败', 'error')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [filterType, filterStatus, filterPriority, filterOverdue, reloadKey, showToast])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(task: AdminTask) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      type: task.type,
      priority: task.priority || '中',
      dueDate: toDateInputValue(task.dueDate),
      isRecurring: task.isRecurring,
      status: task.status,
      notes: task.notes || '',
    })
    setModalOpen(true)
  }

  async function submitTask(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(editingId ? `/api/admin-tasks/${editingId}` : '/api/admin-tasks', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '保存行政事项失败')
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
        const error = await response.json()
        throw new Error(error.error || '更新状态失败')
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
        const error = await response.json()
        throw new Error(error.error || '归档行政事项失败')
      }

      showToast('行政事项已归档', 'success')
      reload()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '归档行政事项失败', 'error')
    }
  }

  function resetFilters() {
    setFilterType('')
    setFilterStatus('')
    setFilterPriority('')
    setFilterOverdue('')
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">行政事项</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">独立管理会议、周报、接待和办公采购等行政事项。</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="w-fit h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm"
        >
          新增行政事项
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-[20px] border border-[#e5eaf3] bg-white p-4 md:grid-cols-5" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部类型</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部状态</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(event) => setFilterPriority(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部优先级</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>
        <select
          value={filterOverdue}
          onChange={(event) => setFilterOverdue(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部期限</option>
          <option value="true">仅看超期</option>
          <option value="false">仅看未超期</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
        >
          清空筛选
        </button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[#e5eaf3] bg-white" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">正在加载行政事项...</div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">暂无符合条件的行政事项</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e5eaf3] text-left">
                  <th className="px-5 h-[52px] text-[13px] font-bold text-[#475569]">事项名称</th>
                  <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">类型</th>
                  <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">优先级</th>
                  <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">截止日期</th>
                  <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">状态</th>
                  <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">完成时间</th>
                  <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">快速状态</th>
                  <th className="px-5 h-[52px] text-[13px] font-bold text-[#475569] text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="px-5 h-[58px]">
                      <div className="text-[14px] font-bold text-[#0f172a]">{task.title}</div>
                      {task.notes ? <div className="mt-1 max-w-xs truncate text-xs text-gray-500">{task.notes}</div> : null}
                    </td>
                    <td className="px-4 h-[58px] text-gray-700">{task.type}</td>
                    <td className="px-4 h-[58px]">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass(task.priority)}`}>
                        {task.priority || '-'}
                      </span>
                    </td>
                    <td className="px-4 h-[58px]">
                      <div className="text-gray-700">{formatDate(task.dueDate)}</div>
                      {isTaskOverdue(task) ? <div className="mt-1 text-xs font-medium text-red-600">已超期</div> : null}
                    </td>
                    <td className="px-4 h-[58px]">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 h-[58px] text-gray-600">{formatDate(task.completedAt)}</td>
                    <td className="px-4 h-[58px]">
                      <select
                        value={task.status}
                        onChange={(event) => updateStatus(task, event.target.value)}
                        className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 h-[58px] text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(task)}
                        className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-800 mr-4"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(task)}
                        className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700"
                      >
                        归档
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑行政事项' : '新增行政事项'}
        width="max-w-2xl"
      >
        <form onSubmit={submitTask} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">事项名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
              <datalist id="admin-task-types">
                {typeOptions.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">截止日期</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">优先级</label>
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(event) => setForm({ ...form, isRecurring: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              重复事项
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">备注</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={4}
              className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
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
        message={`确定要归档“${archiveTarget?.title || ''}”吗？归档后默认列表不再显示。`}
        confirmText="确认归档"
        cancelText="取消"
      />
    </div>
  )
}
