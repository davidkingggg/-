'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface AttachmentRecord {
  id: string
  relatedType: string
  relatedId: string
  fileName: string
  filePath: string
  fileType: string | null
  notes: string | null
  isArchived: boolean
  createdAt: string
}

const RELATED_TYPE_LABELS: Record<string, string> = {
  QuoteSheet: '报价单',
  Supplier: '供应商',
}

const RELATED_TYPE_LINKS: Record<string, string> = {
  QuoteSheet: '/quotes',
  Supplier: '/suppliers',
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

export default function AttachmentsPage() {
  const { showToast } = useToast()
  const [records, setRecords] = useState<AttachmentRecord[]>([])
  const [relatedTypes, setRelatedTypes] = useState<string[]>([])
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterFileType, setFilterFileType] = useState('')
  const [keyword, setKeyword] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<AttachmentRecord | null>(null)
  const [editTarget, setEditTarget] = useState<AttachmentRecord | null>(null)
  const [editForm, setEditForm] = useState({ fileName: '', filePath: '', fileType: '', notes: '' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filterType) params.set('relatedType', filterType)
        if (filterFileType) params.set('fileType', filterFileType)
        if (keyword.trim()) params.set('keyword', keyword.trim())
        if (includeArchived) params.set('includeArchived', 'true')
        const res = await fetch(`/api/attachments?${params}`)
        if (!res.ok) return
        const data = await res.json()
        if (!ignore) {
          setRecords(data.records)
          setRelatedTypes(data.relatedTypes || [])
          setFileTypes(data.fileTypes || [])
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [filterType, filterFileType, keyword, includeArchived, reloadKey])

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      const res = await fetch(`/api/attachments/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: true }),
      })
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || '归档失败', 'error')
        return
      }
      showToast('附件记录已归档', 'success')
      setArchiveTarget(null)
      // trigger reload
      setReloadKey((k) => k + 1)
    } catch {
      showToast('归档失败', 'error')
    }
  }

  const openEdit = (r: AttachmentRecord) => {
    setEditTarget(r)
    setEditForm({
      fileName: r.fileName || '',
      filePath: r.filePath || '',
      fileType: r.fileType || '',
      notes: r.notes || '',
    })
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      const res = await fetch(`/api/attachments/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || '更新失败', 'error')
        return
      }
      showToast('附件记录已更新', 'success')
      setEditTarget(null)
      setReloadKey((k) => k + 1)
    } catch {
      showToast('更新失败', 'error')
    }
  }

  const getRelatedLink = (r: AttachmentRecord) => {
    const base = RELATED_TYPE_LINKS[r.relatedType]
    if (!base) return null
    return `${base}/${r.relatedId}`
  }

  const getRelatedLabel = (r: AttachmentRecord) => {
    return RELATED_TYPE_LABELS[r.relatedType] || r.relatedType
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-[22px] font-bold text-[#0f172a] mb-2">附件路径中心</h1>
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
        本功能仅维护数据库中的附件路径记录，不处理真实文件。不检查文件是否存在，不支持上传、下载、预览或扫描。如需管理实际文件请使用系统文件管理器。
      </p>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">关键词：</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索文件名、路径、备注"
            className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">关联类型：</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">全部</option>
            {relatedTypes.map((t) => (
              <option key={t} value={t}>{RELATED_TYPE_LABELS[t] || t}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">文件类型：</label>
          <select
            value={filterFileType}
            onChange={(e) => setFilterFileType(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">全部</option>
            {fileTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded"
          />
          显示已归档
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">加载中…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-gray-400">暂无附件记录</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f8fafc] text-[#475569]">
              <tr>
                <th className="px-3 h-[52px] text-[13px] font-bold">文件名</th>
                <th className="px-3 h-[52px] text-[13px] font-bold">文件路径</th>
                <th className="px-3 h-[52px] text-[13px] font-bold">类型</th>
                <th className="px-3 h-[52px] text-[13px] font-bold">关联对象</th>
                <th className="px-3 h-[52px] text-[13px] font-bold">备注</th>
                <th className="px-3 h-[52px] text-[13px] font-bold">创建时间</th>
                <th className="px-3 h-[52px] text-[13px] font-bold w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {records.map((r) => (
                <tr key={r.id} className={`hover:bg-[#f8fafc] ${r.isArchived ? 'opacity-50' : ''}`}>
                  <td className="px-3 h-[58px] text-[14px] font-bold text-[#0f172a] max-w-[150px] truncate" title={r.fileName}>{r.fileName || '-'}</td>
                  <td className="px-3 h-[58px] text-gray-500 max-w-[200px] truncate" title={r.filePath}>{r.filePath || '-'}</td>
                  <td className="px-3 h-[58px] text-gray-500">{r.fileType || '-'}</td>
                  <td className="px-3 py-2">
                    {getRelatedLink(r) ? (
                      <Link
                        href={getRelatedLink(r)!}
                        className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-800"
                      >
                        {getRelatedLabel(r)}
                      </Link>
                    ) : (
                      <span className="text-gray-500">{r.relatedType}</span>
                    )}
                  </td>
                  <td className="px-3 h-[58px] text-gray-500 max-w-[120px] truncate" title={r.notes || ''}>{r.notes || '-'}</td>
                  <td className="px-3 h-[58px] text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="px-3 h-[58px] whitespace-nowrap">
                    {!r.isArchived && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-800 mr-4">编辑</button>
                        <button onClick={() => setArchiveTarget(r)} className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700">归档</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">编辑附件记录</h3>
            <p className="text-xs text-gray-400 mb-4">
              关联类型和关联 ID 不可在此编辑。关联类型：{getRelatedLabel(editTarget)}，关联 ID：{editTarget.relatedId}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">文件名</label>
                <input
                  type="text"
                  value={editForm.fileName}
                  onChange={(e) => setEditForm({ ...editForm, fileName: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">文件路径</label>
                <input
                  type="text"
                  value={editForm.filePath}
                  onChange={(e) => setEditForm({ ...editForm, filePath: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">文件类型</label>
                <input
                  type="text"
                  value={editForm.fileType}
                  onChange={(e) => setEditForm({ ...editForm, fileType: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="如 pdf、xlsx"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditTarget(null)} className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium">取消</button>
              <button onClick={handleEdit} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">保存</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="确认归档附件记录"
        message={`确定要归档附件记录「${archiveTarget?.fileName || archiveTarget?.filePath || '(无名称)'}」吗？归档后将不在列表中默认显示。此操作不删除物理文件。`}
        confirmText="确认归档"
      />
    </div>
  )
}
