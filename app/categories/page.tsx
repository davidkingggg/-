'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Category {
  id: string
  name: string
  type: string | null
  isPriority: boolean
  standardLevel: string | null
  afterSalesRisk: string | null
  purchaseFrequency: string | null
  notes: string | null
  isArchived: boolean
}

const LEVELS = ['高', '中', '低']
const EMPTY_FORM = {
  name: '',
  type: '',
  isPriority: false,
  standardLevel: '',
  afterSalesRisk: '',
  purchaseFrequency: '',
  notes: '',
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null)

  // 筛选
  const [filterPriority, setFilterPriority] = useState('')
  const [filterType, setFilterType] = useState('')
  const [typeOptions, setTypeOptions] = useState<string[]>([])

  const { showToast } = useToast()
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (filterPriority) params.set('isPriority', filterPriority)
        if (filterType) params.set('type', filterType)
        const res = await fetch(`/api/categories?${params.toString()}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setCategories(data)
        const types = [...new Set(data.map((c: Category) => c.type).filter(Boolean))] as string[]
        setTypeOptions((prev) => {
          const merged = [...new Set([...prev, ...types])]
          return merged.sort()
        })
      } catch {
        showToast('获取品类列表失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filterPriority, filterType, reloadKey, showToast])

  function reload() { setReloadKey(k => k + 1) }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      type: cat.type || '',
      isPriority: cat.isPriority,
      standardLevel: cat.standardLevel || '',
      afterSalesRisk: cat.afterSalesRisk || '',
      purchaseFrequency: cat.purchaseFrequency || '',
      notes: cat.notes || '',
    })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type || null,
          isPriority: form.isPriority,
          standardLevel: form.standardLevel || null,
          afterSalesRisk: form.afterSalesRisk || null,
          purchaseFrequency: form.purchaseFrequency || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast(editingId ? '品类更新成功' : '品类新增成功', 'success')
      setModalOpen(false)
      reload()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return
    try {
      const res = await fetch(`/api/categories/${archiveTarget.id}`, { method: 'PATCH' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast('品类已归档', 'success')
      reload()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '归档失败', 'error')
    }
  }

  function renderBadge(value: string | null, colorMap: Record<string, string>) {
    if (!value) return <span className="text-gray-300">-</span>
    const color = colorMap[value] || 'bg-gray-100 text-gray-600'
    return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold ${color}`}>{value}</span>
  }

  const levelColors: Record<string, string> = {
    '高': 'bg-red-50 text-red-700',
    '中': 'bg-amber-50 text-amber-700',
    '低': 'bg-green-50 text-green-700',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">品类中心</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">管理锅炉行业重点采购品类</p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm"
        >
          + 新增品类
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部推广状态</option>
          <option value="true">优先推广</option>
          <option value="false">非优先推广</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部品类类型</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div className="rounded-[20px] bg-white border border-[#e5eaf3] overflow-hidden" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无品类数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e5eaf3]">
                <th className="text-left px-6 h-[52px] text-[13px] font-bold text-[#475569]">品类名称</th>
                <th className="text-left px-4 h-[52px] text-[13px] font-bold text-[#475569]">品类类型</th>
                <th className="text-center px-4 h-[52px] text-[13px] font-bold text-[#475569]">优先推广</th>
                <th className="text-center px-4 h-[52px] text-[13px] font-bold text-[#475569]">标准化程度</th>
                <th className="text-center px-4 h-[52px] text-[13px] font-bold text-[#475569]">售后风险</th>
                <th className="text-center px-4 h-[52px] text-[13px] font-bold text-[#475569]">采购频率</th>
                <th className="text-right px-6 h-[52px] text-[13px] font-bold text-[#475569]">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc] transition-colors">
                  <td className="px-6 h-[58px] text-[14px] font-bold text-[#0f172a]">{cat.name}</td>
                  <td className="px-4 h-[58px] text-[14px] text-[#475569]">{cat.type || '-'}</td>
                  <td className="px-4 py-4 text-center">
                    {cat.isPriority ? (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold bg-blue-50 text-blue-700">是</span>
                    ) : (
                      <span className="text-gray-300">否</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">{renderBadge(cat.standardLevel, levelColors)}</td>
                  <td className="px-4 py-4 text-center">{renderBadge(cat.afterSalesRisk, levelColors)}</td>
                  <td className="px-4 py-4 text-center">{renderBadge(cat.purchaseFrequency, levelColors)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(cat)}
                      className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-800 mr-4"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setArchiveTarget(cat)}
                      className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700"
                    >
                      归档
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '编辑品类' : '新增品类'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">品类名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">品类类型</label>
            <input
              type="text"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="如：管道部件、动力设备"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">标准化程度</label>
              <select
                value={form.standardLevel}
                onChange={(e) => setForm({ ...form, standardLevel: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">请选择</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">售后风险</label>
              <select
                value={form.afterSalesRisk}
                onChange={(e) => setForm({ ...form, afterSalesRisk: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">请选择</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">采购频率</label>
              <select
                value={form.purchaseFrequency}
                onChange={(e) => setForm({ ...form, purchaseFrequency: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">请选择</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPriority"
              checked={form.isPriority}
              onChange={(e) => setForm({ ...form, isPriority: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isPriority" className="text-sm text-gray-700">优先推广</label>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
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
              className="h-10 px-6 text-[13px] text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 归档确认 */}
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="确认归档品类"
        message={`确定要归档品类「${archiveTarget?.name}」吗？归档后将不在列表中显示。`}
        confirmText="确认归档"
      />
    </div>
  )
}
