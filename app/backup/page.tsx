'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

type BackupType = 'normal' | 'before-restore'

interface DatabaseStatus {
  exists: boolean
  size: number | null
  updatedAt: string | null
  journalFiles: string[]
  warnings: string[]
}

interface BackupItem {
  fileName: string
  type: BackupType
  size: number
  createdAt: string
  updatedAt: string
}

interface BackupsResponse {
  database: DatabaseStatus
  backups: BackupItem[]
}

const CONFIRM_TEXT = '确认恢复'

function formatBytes(size: number | null) {
  if (size === null) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function typeLabel(type: BackupType) {
  return type === 'before-restore' ? '恢复前安全备份' : '普通备份'
}

function typeDescription(type: BackupType) {
  return type === 'before-restore'
    ? '恢复操作前自动生成，用于必要时回退。'
    : '手动创建的当前 SQLite 数据库快照。'
}

export default function BackupPage() {
  const [data, setData] = useState<BackupsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const { showToast } = useToast()
  const fetchedRef = useRef(false)

  const loadBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/backups', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || '获取备份信息失败。')
      setData(payload)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取备份信息失败。', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function loadInitialBackups() {
      try {
        const res = await fetch('/api/backups', { cache: 'no-store' })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || '获取备份信息失败。')
        setData(payload)
      } catch (error) {
        showToast(error instanceof Error ? error.message : '获取备份信息失败。', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadInitialBackups()
  }, [showToast])

  const warningText = useMemo(() => data?.database.warnings.join(' ') ?? '', [data])

  async function handleCreateBackup() {
    setCreating(true)
    try {
      const res = await fetch('/api/backups', { method: 'POST' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || '创建备份失败。')
      showToast(payload.message || '备份创建成功。', 'success')
      if (payload.warnings?.length) showToast(payload.warnings.join(' '), 'error')
      await loadBackups()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '创建备份失败。', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: restoreTarget.fileName, confirmText }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || '恢复备份失败。')
      showToast(
        payload.message || '恢复已完成。请停止并重新启动本地服务后再继续使用。',
        'success'
      )
      if (payload.warnings?.length) showToast(payload.warnings.join(' '), 'error')
      setRestoreTarget(null)
      setConfirmText('')
      await loadBackups()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '恢复备份失败。', 'error')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-[22px] font-bold text-[#0f172a]">本地备份与恢复</h1>
        <div className="mt-6 text-[13px] text-slate-400">正在加载备份信息...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">本地备份与恢复</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            仅用于本机 SQLite 数据库文件的手动备份和受控恢复。
          </p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating || !data?.database.exists}
          className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-[13px] font-semibold shadow-sm"
        >
          {creating ? '创建中...' : '创建备份'}
        </button>
      </div>

      <section className="bg-sky-50 border border-sky-100 rounded-xl p-5">
        <h2 className="text-base font-semibold text-sky-950">运维范围说明</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-sky-900">
          <div>
            <div className="font-medium">只处理本地数据库</div>
            <p className="mt-1 text-sky-800">
              本功能仅备份和恢复 `prisma/schema.prisma` 指向的本地 SQLite 数据库文件。
            </p>
          </div>
          <div>
            <div className="font-medium">不包含外部资产</div>
            <p className="mt-1 text-sky-800">
              不包含附件物理文件、系统环境、Node 依赖、本地日志、导出 CSV 或外部文档。
            </p>
          </div>
          <div>
            <div className="font-medium">恢复后需要重启</div>
            <p className="mt-1 text-sky-800">
              恢复会覆盖当前数据库。完成后请停止并重新启动本地服务，再继续使用系统。
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] bg-white border border-[#e5eaf3] overflow-hidden p-5" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">当前数据库状态</h2>
          <button
            onClick={loadBackups}
            className="h-8 px-3 text-[12px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
          >
            刷新
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">数据库文件</div>
            <div className={data?.database.exists ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
              {data?.database.exists ? '存在' : '不存在'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">文件大小</div>
            <div className="font-medium text-gray-800">{formatBytes(data?.database.size ?? null)}</div>
          </div>
          <div>
            <div className="text-gray-500">最近修改时间</div>
            <div className="font-medium text-gray-800">{formatDate(data?.database.updatedAt ?? null)}</div>
          </div>
          <div>
            <div className="text-gray-500">SQLite 附属文件</div>
            <div className="font-medium text-gray-800">
              {data?.database.journalFiles.length ? data.database.journalFiles.join('、') : '未检测到'}
            </div>
          </div>
        </div>
        {warningText && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warningText}
            <div className="mt-1">
              如正在运行开发服务，建议先停止服务，再执行备份或恢复，避免 SQLite 快照处于未完全落盘状态。
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[20px] bg-white border border-[#e5eaf3] overflow-hidden" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <div className="px-5 py-4 border-b border-[#e5eaf3]">
          <h2 className="text-lg font-semibold text-gray-800">备份列表</h2>
          <p className="mt-1 text-sm text-gray-500">
            仅显示符合系统命名规则的 `.sqlite` 文件。普通备份用于手动留存当前数据库，恢复前安全备份用于恢复操作前的回退保护。
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e5eaf3]">
                <th className="text-left px-5 h-[52px] text-[13px] font-bold text-[#475569]">文件名</th>
                <th className="text-left px-5 h-[52px] text-[13px] font-bold text-[#475569]">类型</th>
                <th className="text-left px-5 h-[52px] text-[13px] font-bold text-[#475569]">用途说明</th>
                <th className="text-left px-5 h-[52px] text-[13px] font-bold text-[#475569]">大小</th>
                <th className="text-left px-5 h-[52px] text-[13px] font-bold text-[#475569]">创建时间</th>
                <th className="text-left px-5 h-[52px] text-[13px] font-bold text-[#475569]">修改时间</th>
                <th className="text-right px-5 h-[52px] text-[13px] font-bold text-[#475569]">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.backups.map((backup) => (
                <tr key={backup.fileName} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 h-[58px] text-[14px] font-mono text-xs text-gray-700">{backup.fileName}</td>
                  <td className="px-5 h-[58px] text-[14px] text-gray-700">{typeLabel(backup.type)}</td>
                  <td className="px-5 h-[58px] text-[14px] text-gray-600">{typeDescription(backup.type)}</td>
                  <td className="px-5 h-[58px] text-[14px] text-gray-700">{formatBytes(backup.size)}</td>
                  <td className="px-5 h-[58px] text-[14px] text-gray-700">{formatDate(backup.createdAt)}</td>
                  <td className="px-5 h-[58px] text-[14px] text-gray-700">{formatDate(backup.updatedAt)}</td>
                  <td className="px-5 h-[58px] text-[14px] text-right">
                    <button
                      onClick={() => {
                        setRestoreTarget(backup)
                        setConfirmText('')
                      }}
                      className="h-8 px-3 text-[12px] text-red-600 font-semibold hover:text-red-700 transition-colors"
                    >
                      恢复
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.backups.length && (
          <div className="text-center text-gray-400 py-12">暂无备份文件</div>
        )}
      </section>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRestoreTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认恢复数据库</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>恢复会覆盖当前 SQLite 主数据库文件。</p>
              <p>系统会在恢复前自动创建 before-restore 安全备份，用于必要时回退到恢复前状态。</p>
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700">
                恢复完成后，请停止并重新启动本地服务后再继续使用，并刷新系统页面。
              </p>
              <p className="font-mono text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 break-all">
                {restoreTarget.fileName}
              </p>
            </div>
            <label className="block mt-5 text-sm font-medium text-gray-700">
              请输入“确认恢复”
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="mt-2 w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                placeholder={CONFIRM_TEXT}
              />
            </label>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRestoreTarget(null)}
                disabled={restoring}
                className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring || confirmText !== CONFIRM_TEXT}
                className="h-10 px-6 text-[13px] text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {restoring ? '恢复中...' : '确认恢复'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
