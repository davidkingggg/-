'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import RestoreArchiveDialog from './RestoreArchiveDialog'
import DeleteConfirmDialog from './DeleteConfirmDialog'

interface ArchiveRecord {
  id: string
  name: string
  type: string
  typeLabel: string
  archivedAt: string
}

const TYPE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'category', label: '品类' },
  { value: 'supplier', label: '供应商' },
  { value: 'quotesheet', label: '报价单' },
  { value: 'quoteitem', label: '报价明细' },
  { value: 'supplierscore', label: '供应商评分' },
  { value: 'investigationrecord', label: '调研/考察记录' },
  { value: 'supplierdevelopmentprocess', label: '供应商开发流程' },
  { value: 'purchaseexecutionprocess', label: '采购执行流程' },
  { value: 'salesmaterial', label: '销售/商务资料' },
]

function getRestoreWarning(type: string): string | undefined {
  if (type === 'quotesheet') {
    return '不会自动恢复其下已归档的报价明细或附件记录，请单独检查。'
  }
  if (type === 'quoteitem') {
    return '不会自动恢复所属报价单。如果所属报价单仍为归档状态，该明细可能仍不可见。'
  }
  return undefined
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

function itemKey(r: ArchiveRecord) {
  return `${r.type}:${r.id}`
}

export default function ArchivePage() {
  const { showToast } = useToast()
  const [records, setRecords] = useState<ArchiveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [restoreTarget, setRestoreTarget] = useState<ArchiveRecord | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [batchRestoring, setBatchRestoring] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadRecords() {
      setLoading(true)
      try {
        const url = filterType ? `/api/archive?type=${filterType}` : '/api/archive'
        const res = await fetch(url)
        if (!res.ok) {
          const data = await res.json()
          if (!ignore) showToast(data.error || '获取归档记录失败', 'error')
          return
        }
        const data = await res.json()
        if (!ignore) {
          setRecords(data)
          setSelectedKeys(new Set())
        }
      } catch {
        if (!ignore) showToast('获取归档记录失败', 'error')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadRecords()
    return () => {
      ignore = true
    }
  }, [filterType, showToast])

  const selectedItems = useMemo(() => {
    if (selectedKeys.size === 0) return []
    return records.filter((r) => selectedKeys.has(itemKey(r)))
  }, [records, selectedKeys])

  const allSelected = records.length > 0 && selectedKeys.size === records.length
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < records.length

  const toggleOne = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(records.map(itemKey)))
    }
  }, [records, allSelected])

  const doRestore = async () => {
    if (!restoreTarget) return
    const target = restoreTarget
    try {
      const res = await fetch(`/api/archive/${target.type}/${target.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: '确认恢复' }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || '恢复失败', 'error')
        return
      }
      showToast('恢复成功', 'success')
      setRestoreTarget(null)
      const key = itemKey(target)
      setRecords((prev) => prev.filter((r) => itemKey(r) !== key))
      setSelectedKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    } catch {
      showToast('恢复失败', 'error')
    }
  }

  const doBatchRestore = async () => {
    if (selectedItems.length === 0) return
    setBatchRestoring(true)
    let successCount = 0
    let failCount = 0

    for (const item of selectedItems) {
      try {
        const res = await fetch(`/api/archive/${item.type}/${item.id}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: '确认恢复' }),
        })
        if (res.ok) successCount++
        else failCount++
      } catch {
        failCount++
      }
    }

    setBatchRestoring(false)

    if (failCount === 0) {
      showToast(`成功恢复 ${successCount} 条记录`, 'success')
    } else {
      showToast(`恢复完成：成功 ${successCount} 条，失败 ${failCount} 条`, 'error')
    }

    const restoredKeys = new Set(selectedItems.map(itemKey))
    setRecords((prev) => prev.filter((r) => !restoredKeys.has(itemKey(r))))
    setSelectedKeys(new Set())
  }

  const doBatchDelete = async () => {
    if (selectedItems.length === 0) return
    setBatchDeleting(true)

    try {
      const res = await fetch('/api/archive/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map((r) => ({ type: r.type, id: r.id })),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || '删除失败', 'error')
      } else {
        showToast(data.message || `成功删除 ${data.deleted} 条`, data.failed > 0 ? 'error' : 'success')
        const deletedKeys = new Set(selectedItems.map(itemKey))
        setRecords((prev) => prev.filter((r) => !deletedKeys.has(itemKey(r))))
        setSelectedKeys(new Set())
      }
    } catch {
      showToast('批量删除失败', 'error')
    } finally {
      setBatchDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-[22px] font-bold text-[#0f172a] mb-2">归档数据管理</h1>
      <p className="text-[13px] text-slate-400 mt-0.5 mb-1">
        此处可查看和恢复已归档的记录。恢复归档只恢复数据库记录，不恢复被外部删除的附件物理文件。
      </p>

      {/* 筛选 + 批量操作栏 */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">对象类型：</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {selectedKeys.size > 0 && (
          <>
            <span className="text-sm text-gray-500">已选 {selectedKeys.size} 项</span>
            <button
              onClick={doBatchRestore}
              disabled={batchRestoring}
              className="px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {batchRestoring ? '恢复中…' : '批量恢复'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={batchDeleting}
              className="px-3 py-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              彻底删除
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 mt-8">加载中…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-gray-400 mt-8">
          {filterType ? '该类型暂无已归档记录' : '暂无已归档记录'}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f8fafc] border-b border-[#e5eaf3]">
              <tr>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569] w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">名称</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">类型</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">归档时间</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569] w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {records.map((r) => {
                const key = itemKey(r)
                const isSelected = selectedKeys.has(key)
                return (
                  <tr
                    key={key}
                    className={`hover:bg-[#f8fafc] transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-4 h-[58px]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(key)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 h-[58px] text-[14px] text-gray-800">{r.name || '-'}</td>
                    <td className="px-4 h-[58px] text-[14px] text-gray-500">{r.typeLabel}</td>
                    <td className="px-4 h-[58px] text-[14px] text-gray-500">{formatDate(r.archivedAt)}</td>
                    <td className="px-4 h-[58px] text-[14px]">
                      <button
                        onClick={() => setRestoreTarget(r)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        恢复
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <RestoreArchiveDialog
        open={!!restoreTarget}
        recordName={restoreTarget?.name || ''}
        recordType={restoreTarget?.typeLabel || ''}
        extraWarning={restoreTarget ? getRestoreWarning(restoreTarget.type) : undefined}
        onClose={() => setRestoreTarget(null)}
        onConfirm={doRestore}
      />

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        count={selectedItems.length}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={doBatchDelete}
      />
    </div>
  )
}
