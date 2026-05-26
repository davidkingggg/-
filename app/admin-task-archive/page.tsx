'use client'

import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

type Period = 'day' | 'week' | 'month' | 'year'

interface ArchivedAdminTask {
  id: string
  title: string
  type: string
  priority: string | null
  dueDate: string | null
  taskDate: string | null
  startTime: string | null
  endTime: string | null
  status: string
  completedAt: string | null
  notes: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ArchiveSummary {
  totalCount: number
  completedCount: number
  overdueCount: number
  typeCounts: Record<string, number>
}

interface ArchiveData {
  tasks: ArchivedAdminTask[]
  summary: ArchiveSummary
}

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

const EMPTY_SUMMARY: ArchiveSummary = {
  totalCount: 0,
  completedCount: 0,
  overdueCount: 0,
  typeCounts: {},
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return value
  }
}

function formatTimeRange(task: ArchivedAdminTask) {
  if (!task.startTime && !task.endTime) return '-'
  return `${task.startTime || '-'}${task.endTime ? ` - ${task.endTime}` : ''}`
}

function taskDate(task: ArchivedAdminTask) {
  return formatDate(task.taskDate || task.dueDate || task.createdAt)
}

function completionRate(summary: ArchiveSummary) {
  if (summary.totalCount === 0) return '0%'
  return `${Math.round((summary.completedCount / summary.totalCount) * 100)}%`
}

function isPersonBindingMessage(message: string) {
  return message.includes('未绑定人员') || message.includes('绑定后再使用个人数据')
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

export default function AdminTaskArchivePage() {
  const { showToast } = useToast()
  const [period, setPeriod] = useState<Period>('month')
  const [anchor, setAnchor] = useState(() => toDateKey(new Date()))
  const [data, setData] = useState<ArchiveData>({ tasks: [], summary: EMPTY_SUMMARY })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<ArchivedAdminTask | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ArchivedAdminTask | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [acting, setActing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const summary = data.summary
  const typeCounts = useMemo(() => Object.entries(summary.typeCounts), [summary.typeCounts])
  const isBindingError = Boolean(error && isPersonBindingMessage(error))
  const canDelete = deleteConfirmation.trim() === '确认彻底删除'

  useEffect(() => {
    const controller = new AbortController()

    async function loadArchive() {
      try {
        const response = await fetch(`/api/admin-task-archive?period=${period}&anchor=${anchor}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(await readApiError(response, '获取行政事项归档失败'))
        }

        const nextData = await response.json()
        setData({
          tasks: Array.isArray(nextData.tasks) ? nextData.tasks : [],
          summary: {
            ...EMPTY_SUMMARY,
            ...(nextData.summary || {}),
            typeCounts: nextData.summary?.typeCounts || {},
          },
        })
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return
        const message = loadError instanceof Error ? loadError.message : '获取行政事项归档失败'
        setError(message)
        setData({ tasks: [], summary: EMPTY_SUMMARY })
        if (!isPersonBindingMessage(message)) {
          showToast(message, 'error')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadArchive()
    return () => controller.abort()
  }, [anchor, period, reloadKey, showToast])

  function reload() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  function changePeriod(nextPeriod: Period) {
    if (nextPeriod === period) return
    setLoading(true)
    setError('')
    setPeriod(nextPeriod)
  }

  function changeAnchor(nextAnchor: string) {
    setLoading(true)
    setError('')
    setAnchor(nextAnchor)
  }

  async function restoreTask() {
    if (!restoreTarget) return
    setActing(true)

    try {
      const response = await fetch(`/api/admin-task-archive/${restoreTarget.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: '确认恢复' }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, '恢复行政事项失败'))
      }

      showToast('行政事项已恢复', 'success')
      setRestoreTarget(null)
      reload()
    } catch (restoreError) {
      showToast(restoreError instanceof Error ? restoreError.message : '恢复行政事项失败', 'error')
    } finally {
      setActing(false)
    }
  }

  async function deleteTask() {
    if (!deleteTarget || !canDelete) return
    setActing(true)

    try {
      const response = await fetch(`/api/admin-task-archive/${deleteTarget.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation.trim() }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, '彻底删除行政事项失败'))
      }

      showToast('行政事项已彻底删除', 'success')
      setDeleteTarget(null)
      setDeleteConfirmation('')
      reload()
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : '彻底删除行政事项失败', 'error')
    } finally {
      setActing(false)
    }
  }

  function openDeleteModal(task: ArchivedAdminTask) {
    setDeleteTarget(task)
    setDeleteConfirmation('')
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-slate-950">行政事项归档</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">
            查看本人已归档的行政事项，支持按日、周、月、年统计，并可恢复或彻底删除。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex h-10 rounded-lg border border-slate-200 bg-white p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changePeriod(option.value)}
                className={`h-8 min-w-[44px] rounded-md px-3 text-[13px] font-semibold transition-colors ${
                  period === option.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={anchor}
            onChange={(event) => changeAnchor(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="统计锚点日期"
          />
        </div>
      </div>

      {error ? (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-[13px] ${
          isBindingError
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {isBindingError ? '当前账号未绑定人员，请联系管理员在用户管理中完成绑定后再查看个人行政事项归档。' : error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="归档事项" value={summary.totalCount} />
        <SummaryCard label="已完成" value={summary.completedCount} />
        <SummaryCard label="超期" value={summary.overdueCount} tone="text-red-600" />
        <SummaryCard label="完成率" value={completionRate(summary)} />
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800">类型分布</h2>
          <span className="text-xs text-slate-400">来自 summary.typeCounts</span>
        </div>
        {typeCounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
            当前周期暂无类型统计
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {typeCounts.map(([type, count]) => (
              <span key={type} className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-700">
                {type || '未分类'}：{count}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">归档事项列表</h2>
            <p className="mt-1 text-xs text-slate-400">表格可横向滚动，彻底删除后无法恢复。</p>
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            刷新
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">正在加载行政事项归档...</div>
        ) : data.tasks.length === 0 ? (
          <div className="p-4">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <div className="text-sm font-semibold text-slate-600">
                {isBindingError ? '绑定人员后，这里会显示你的个人行政事项归档' : '当前周期暂无已归档行政事项'}
              </div>
              <p className="mt-2 text-[13px] text-slate-400">
                可调整统计周期或锚点日期查看其他归档记录。
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <TableHeader>标题</TableHeader>
                  <TableHeader>类型</TableHeader>
                  <TableHeader>日期</TableHeader>
                  <TableHeader>时间</TableHeader>
                  <TableHeader>状态</TableHeader>
                  <TableHeader>优先级</TableHeader>
                  <TableHeader>归档时间</TableHeader>
                  <TableHeader>备注</TableHeader>
                  <TableHeader>操作</TableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70">
                    <TableCell>
                      <span className="block max-w-[220px] whitespace-normal break-words font-semibold text-slate-800">
                        {task.title || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{task.type || '-'}</TableCell>
                    <TableCell>{taskDate(task)}</TableCell>
                    <TableCell>{formatTimeRange(task)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(task.status)}`}>
                        {task.status || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass(task.priority)}`}>
                        {task.priority || '未设'}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(task.archivedAt)}</TableCell>
                    <TableCell>
                      <span className="block max-w-[240px] whitespace-normal break-words text-slate-500">
                        {task.notes || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[124px] items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setRestoreTarget(task)}
                          className="text-[13px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          恢复
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(task)}
                          className="text-[13px] font-semibold text-red-600 hover:text-red-700"
                        >
                          彻底删除
                        </button>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={restoreTask}
        title="确认恢复行政事项"
        message={`确认恢复“${restoreTarget?.title || ''}”吗？恢复后会回到我的行政事项列表。`}
        confirmText={acting ? '恢复中...' : '确认恢复'}
        cancelText="取消"
        danger={false}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="彻底删除行政事项"
        width="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
            此操作会永久删除“{deleteTarget?.title || ''}”，删除后无法恢复。请输入“确认彻底删除”继续。
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">确认短语</label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="确认彻底删除"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="h-10 rounded-lg bg-slate-100 px-5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="button"
              onClick={deleteTask}
              disabled={!canDelete || acting}
              className="h-10 rounded-lg bg-red-600 px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {acting ? '删除中...' : '确认彻底删除'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SummaryCard({ label, value, tone = 'text-slate-950' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  )
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return <th className="h-12 px-4 text-[13px] font-bold text-slate-600">{children}</th>
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-[13px] text-slate-600">{children}</td>
}
