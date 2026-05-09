'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'

interface Investigation {
  id: string
  type: string
  supplierId: string
  categoryId: string
  supplier: { name: string }
  category: { name: string }
  date: string
  location: string | null
  participants: string | null
  keyPoints: string | null
  productHighlights: string | null
  priceInfo: string | null
  qualificationInfo: string | null
  deliveryInfo: string | null
  afterSalesInfo: string | null
  risks: string | null
  nextActions: string | null
  recommendFollowUp: boolean
  notes: string | null
}

const TYPE_OPTIONS = ['展会', '线上沟通', '实地考察', '电话沟通', '微信沟通']

export default function InvestigationsPage() {
  const [records, setRecords] = useState<Investigation[]>([])
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [archiveTarget, setArchiveTarget] = useState<Investigation | null>(null)

  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')

  const { showToast } = useToast()
  const [reloadKey, setReloadKey] = useState(0)

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    type: '线上沟通',
    supplierId: '',
    categoryId: '',
    date: new Date().toISOString().slice(0, 10),
    location: '',
    participants: '',
    keyPoints: '',
    productHighlights: '',
    priceInfo: '',
    qualificationInfo: '',
    deliveryInfo: '',
    afterSalesInfo: '',
    risks: '',
    nextActions: '',
    recommendFollowUp: true,
    notes: ''
  })

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers).catch(() => {})
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (filterSupplier) params.set('supplierId', filterSupplier)
        if (filterCategory) params.set('categoryId', filterCategory)
        if (filterType) params.set('type', filterType)
        
        const res = await fetch(`/api/investigations?${params.toString()}`)
        if (!res.ok) throw new Error()
        setRecords(await res.json())
      } catch {
        showToast('获取记录失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filterSupplier, filterCategory, filterType, reloadKey, showToast])

  async function handleArchive() {
    if (!archiveTarget) return
    try {
      const res = await fetch(`/api/investigations/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('记录已归档', 'success')
      setReloadKey(k => k + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '归档失败', 'error')
    }
  }

  const handleOpenForm = (record?: Investigation) => {
    if (record) {
      setEditingId(record.id)
      setFormData({
        type: record.type,
        supplierId: record.supplierId,
        categoryId: record.categoryId,
        date: new Date(record.date).toISOString().slice(0, 10),
        location: record.location || '',
        participants: record.participants || '',
        keyPoints: record.keyPoints || '',
        productHighlights: record.productHighlights || '',
        priceInfo: record.priceInfo || '',
        qualificationInfo: record.qualificationInfo || '',
        deliveryInfo: record.deliveryInfo || '',
        afterSalesInfo: record.afterSalesInfo || '',
        risks: record.risks || '',
        nextActions: record.nextActions || '',
        recommendFollowUp: record.recommendFollowUp,
        notes: record.notes || ''
      })
    } else {
      setEditingId(null)
      setFormData({
        type: '线上沟通',
        supplierId: '',
        categoryId: '',
        date: new Date().toISOString().slice(0, 10),
        location: '',
        participants: '',
        keyPoints: '',
        productHighlights: '',
        priceInfo: '',
        qualificationInfo: '',
        deliveryInfo: '',
        afterSalesInfo: '',
        risks: '',
        nextActions: '',
        recommendFollowUp: true,
        notes: ''
      })
    }
    setIsFormOpen(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId ? `/api/investigations/${editingId}` : '/api/investigations'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')
      
      showToast('保存成功', 'success')
      setIsFormOpen(false)
      setReloadKey(k => k + 1)
    } catch (err: unknown) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">调研/考察记录</h1>
          <p className="text-sm text-gray-500 mt-1">记录与供应商沟通、看厂及产品调研详情</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm inline-block"
        >
          + 新增记录
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部供应商</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部品类</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部记录类型</option>
          {TYPE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : records.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无考察记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">日期</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">供应商</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">品类</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">方式</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 w-1/4">沟通重点</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600">推荐跟进</th>
                  <th className="text-right px-6 py-3.5 font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-4 font-medium text-gray-800">
                      <Link href={`/suppliers/${r.supplierId}`} className="hover:text-blue-600 transition-colors">
                        {r.supplier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{r.category.name}</td>
                    <td className="px-4 py-4 text-gray-600">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 truncate max-w-xs" title={r.keyPoints || ''}>{r.keyPoints || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      {r.recommendFollowUp ? (
                        <span className="text-emerald-600 font-medium">✓ 是</span>
                      ) : (
                        <span className="text-gray-400">✗ 否</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenForm(r)}
                        className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-medium"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setArchiveTarget(r)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
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

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="确认归档记录"
        message={`确定要归档此考察记录吗？归档后将不在列表中显示。`}
        confirmText="确认归档"
      />

      <Modal open={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingId ? '编辑调研/考察记录' : '新增调研/考察记录'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">记录类型 *</label>
              <select required name="type" value={formData.type} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md p-2">
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期 *</label>
              <input required type="date" name="date" value={formData.date} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商 *</label>
              <select required disabled={!!editingId} name="supplierId" value={formData.supplierId} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md p-2">
                <option value="">请选择</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品类 *</label>
              <select required name="categoryId" value={formData.categoryId} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md p-2">
                <option value="">请选择</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
              <input type="text" name="location" value={formData.location} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参与人员</label>
              <input type="text" name="participants" value={formData.participants} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">沟通重点</label>
            <textarea name="keyPoints" value={formData.keyPoints} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品亮点</label>
              <textarea name="productHighlights" value={formData.productHighlights} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">价格情况</label>
              <textarea name="priceInfo" value={formData.priceInfo} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">资质情况</label>
              <textarea name="qualificationInfo" value={formData.qualificationInfo} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">交付情况</label>
              <textarea name="deliveryInfo" value={formData.deliveryInfo} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">售后情况</label>
              <textarea name="afterSalesInfo" value={formData.afterSalesInfo} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">风险点</label>
              <textarea name="risks" value={formData.risks} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">后续动作</label>
            <textarea name="nextActions" value={formData.nextActions} onChange={handleFormChange} rows={2} className="w-full border border-gray-300 rounded-md p-2" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="recommendFollowUp" name="recommendFollowUp" checked={formData.recommendFollowUp} onChange={handleFormChange} className="rounded border-gray-300" />
            <label htmlFor="recommendFollowUp" className="text-sm font-medium text-gray-700">推荐继续跟进该供应商</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">取消</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">保存</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
