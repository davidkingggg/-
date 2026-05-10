'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import RestoreArchiveDialog from './RestoreArchiveDialog'

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
  { value: 'admintask', label: '行政事项' },
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

export default function ArchivePage() {
  const { showToast } = useToast()
  const [records, setRecords] = useState<ArchiveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<ArchiveRecord | null>(null)

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
        if (!ignore) setRecords(data)
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
      setRecords((prev) => prev.filter((r) => !(r.id === target.id && r.type === target.type)))
    } catch {
      showToast('恢复失败', 'error')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">归档数据管理</h1>
      <p className="text-sm text-gray-500 mb-1">
        此处可查看和恢复已归档的记录。恢复归档只恢复数据库记录，不恢复被外部删除的附件物理文件。
      </p>

      <div className="mt-6 flex items-center gap-3">
        <label className="text-sm text-gray-600">对象类型：</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">名称</th>
                <th className="px-4 py-2 font-medium">类型</th>
                <th className="px-4 py-2 font-medium">归档时间</th>
                <th className="px-4 py-2 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((r) => (
                <tr key={`${r.type}-${r.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{r.name || '-'}</td>
                  <td className="px-4 py-2 text-gray-500">{r.typeLabel}</td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(r.archivedAt)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setRestoreTarget(r)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      恢复
                    </button>
                  </td>
                </tr>
              ))}
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
    </div>
  )
}
