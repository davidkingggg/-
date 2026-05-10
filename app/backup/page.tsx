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
      showToast(payload.message, 'success')
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
        <h1 className="text-2xl font-bold text-gray-800">本地备份与恢复</h1>
        <div className="mt-6 text-sm text-gray-500">正在加载备份信息...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">本地备份与恢复</h1>
          <p className="text-sm text-gray-500 mt-1">
            仅用于本机 SQLite 数据库文件的手动备份和受控恢复。
          </p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating || !data?.database.exists}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
        >
          {creating ? '创建中...' : '创建备份'}
        </button>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">当前数据库状态</h2>
          <button
            onClick={loadBackups}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">备份列表</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">文件名</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">类型</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">大小</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">创建时间</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">修改时间</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.backups.map((backup) => (
                <tr key={backup.fileName} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{backup.fileName}</td>
                  <td className="px-5 py-4 text-gray-700">{typeLabel(backup.type)}</td>
                  <td className="px-5 py-4 text-gray-700">{formatBytes(backup.size)}</td>
                  <td className="px-5 py-4 text-gray-700">{formatDate(backup.createdAt)}</td>
                  <td className="px-5 py-4 text-gray-700">{formatDate(backup.updatedAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => {
                        setRestoreTarget(backup)
                        setConfirmText('')
                      }}
                      className="px-3 py-1.5 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
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
              <p>系统会在恢复前自动创建 before-restore 安全备份，恢复完成后请重启本地服务并刷新系统。</p>
              <p className="font-mono text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 break-all">
                {restoreTarget.fileName}
              </p>
            </div>
            <label className="block mt-5 text-sm font-medium text-gray-700">
              请输入“确认恢复”
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder={CONFIRM_TEXT}
              />
            </label>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRestoreTarget(null)}
                disabled={restoring}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring || confirmText !== CONFIRM_TEXT}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
