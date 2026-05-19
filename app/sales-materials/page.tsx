'use client'

import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { buildSalesMaterialPreview, TARGET_AUDIENCES } from '@/lib/sales-material-utils'

interface Category {
  id: string
  name: string
}

interface SalesMaterial {
  id: string
  title: string
  categoryId: string
  targetAudience: string | null
  coreSellingPoints: string | null
  priceAdvantage: string | null
  supplierAdvantage: string | null
  qualificationSupport: string | null
  deliveryAdvantage: string | null
  afterSalesAdvantage: string | null
  riskNotice: string | null
  formalText: string | null
  isArchived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  category: Category | null
}

interface SalesMaterialForm {
  title: string
  categoryId: string
  targetAudience: string
  coreSellingPoints: string
  priceAdvantage: string
  supplierAdvantage: string
  qualificationSupport: string
  deliveryAdvantage: string
  afterSalesAdvantage: string
  riskNotice: string
  formalText: string
}

const EMPTY_FORM: SalesMaterialForm = {
  title: '',
  categoryId: '',
  targetAudience: '销售部门',
  coreSellingPoints: '',
  priceAdvantage: '',
  supplierAdvantage: '',
  qualificationSupport: '',
  deliveryAdvantage: '',
  afterSalesAdvantage: '',
  riskNotice: '',
  formalText: '',
}

function formatDate(value: string) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function textOrDash(value: string | null) {
  return value?.trim() || '-'
}

export default function SalesMaterialsPage() {
  const [materials, setMaterials] = useState<SalesMaterial[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewTarget, setPreviewTarget] = useState<SalesMaterial | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<SalesMaterial | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SalesMaterialForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterTargetAudience, setFilterTargetAudience] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const { showToast } = useToast()

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filterCategoryId) params.set('categoryId', filterCategoryId)
    if (filterTargetAudience) params.set('targetAudience', filterTargetAudience)
    if (filterKeyword.trim()) params.set('keyword', filterKeyword.trim())
    return params.toString()
  }, [filterCategoryId, filterTargetAudience, filterKeyword])

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) throw new Error('获取品类列表失败')
        setCategories(await response.json())
      } catch (error) {
        showToast(error instanceof Error ? error.message : '获取品类列表失败', 'error')
      }
    }

    loadCategories()
  }, [showToast])

  useEffect(() => {
    async function loadMaterials() {
      setLoading(true)
      try {
        const response = await fetch(`/api/sales-materials?${queryString}`)
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '获取销售/商务资料列表失败')
        }
        setMaterials(await response.json())
      } catch (error) {
        showToast(error instanceof Error ? error.message : '获取销售/商务资料列表失败', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadMaterials()
  }, [queryString, reloadKey, showToast])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function updateForm(field: keyof SalesMaterialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id || '',
    })
    setModalOpen(true)
  }

  function openEdit(material: SalesMaterial) {
    if (material.isArchived) {
      showToast('已归档资料不可编辑', 'error')
      return
    }

    setEditingId(material.id)
    setForm({
      title: material.title,
      categoryId: material.categoryId,
      targetAudience: material.targetAudience || '销售部门',
      coreSellingPoints: material.coreSellingPoints || '',
      priceAdvantage: material.priceAdvantage || '',
      supplierAdvantage: material.supplierAdvantage || '',
      qualificationSupport: material.qualificationSupport || '',
      deliveryAdvantage: material.deliveryAdvantage || '',
      afterSalesAdvantage: material.afterSalesAdvantage || '',
      riskNotice: material.riskNotice || '',
      formalText: material.formalText || '',
    })
    setModalOpen(true)
  }

  async function submitMaterial(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(editingId ? `/api/sales-materials/${editingId}` : '/api/sales-materials', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '保存销售/商务资料失败')
      }

      showToast(editingId ? '销售/商务资料已更新' : '销售/商务资料已新增', 'success')
      setModalOpen(false)
      reload()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存销售/商务资料失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function archiveMaterial() {
    if (!archiveTarget) return

    try {
      const response = await fetch(`/api/sales-materials/${archiveTarget.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '归档销售/商务资料失败')
      }

      showToast('销售/商务资料已归档', 'success')
      reload()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '归档销售/商务资料失败', 'error')
    }
  }

  async function copyFormalText(material: SalesMaterial) {
    try {
      await navigator.clipboard.writeText(buildSalesMaterialPreview(material))
      showToast('正式正文已复制', 'success')
    } catch {
      showToast('复制正文失败', 'error')
    }
  }

  function resetFilters() {
    setFilterCategoryId('')
    setFilterTargetAudience('')
    setFilterKeyword('')
  }

  function exportUrl(format: 'csv' | 'markdown') {
    const params = new URLSearchParams(queryString)
    params.set('format', format)
    return `/api/sales-materials/export?${params.toString()}`
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">销售/商务资料</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">管理面向销售和商务支持的正式对外资料正文。</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm"
        >
          + 新增资料
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-[20px] border border-[#e5eaf3] bg-white p-4 lg:grid-cols-[1fr_1fr_2fr_auto_auto_auto]" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <select
          value={filterCategoryId}
          onChange={(event) => setFilterCategoryId(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部品类</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select
          value={filterTargetAudience}
          onChange={(event) => setFilterTargetAudience(event.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部目标对象</option>
          {TARGET_AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>{audience}</option>
          ))}
        </select>
        <input
          value={filterKeyword}
          onChange={(event) => setFilterKeyword(event.target.value)}
          placeholder="输入关键词搜索资料内容"
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="button"
          onClick={resetFilters}
          className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
        >
          重置筛选
        </button>
        <a
          href={exportUrl('csv')}
          className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-center text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          导出 CSV
        </a>
        <a
          href={exportUrl('markdown')}
          className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          导出 Markdown
        </a>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[#e5eaf3] bg-white" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">加载中...</div>
        ) : materials.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">暂无销售/商务资料</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e5eaf3]">
                <th className="px-6 h-[52px] text-left text-[13px] font-bold text-[#475569]">资料名称</th>
                <th className="px-4 h-[52px] text-left text-[13px] font-bold text-[#475569]">品类</th>
                <th className="px-4 h-[52px] text-left text-[13px] font-bold text-[#475569]">目标对象</th>
                <th className="px-4 h-[52px] text-left text-[13px] font-bold text-[#475569]">核心卖点</th>
                <th className="px-4 h-[52px] text-left text-[13px] font-bold text-[#475569]">更新时间</th>
                <th className="px-6 h-[52px] text-right text-[13px] font-bold text-[#475569]">操作</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                  <td className="px-6 h-[58px] text-[14px] font-bold text-[#0f172a]">{material.title}</td>
                  <td className="px-4 h-[58px] text-gray-600">{material.category?.name || '-'}</td>
                  <td className="px-4 h-[58px]">
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {textOrDash(material.targetAudience)}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 h-[58px] text-gray-600">
                    <span className="line-clamp-2">{textOrDash(material.coreSellingPoints)}</span>
                  </td>
                  <td className="px-4 h-[58px] text-gray-500">{formatDate(material.updatedAt)}</td>
                  <td className="px-6 h-[58px] text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTarget(material)}
                        className="text-[13px] font-semibold text-slate-600 hover:text-slate-800"
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        onClick={() => copyFormalText(material)}
                        className="text-[13px] font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        复制正文
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(material)}
                        className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-700"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(material)}
                        className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700"
                      >
                        归档
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑销售/商务资料' : '新增销售/商务资料'}
        width="max-w-4xl"
      >
        <form onSubmit={submitMaterial} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">资料名称</span>
              <input
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="例如：阀门客户沟通资料"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">适用品类</span>
              <select
                value={form.categoryId}
                onChange={(event) => updateForm('categoryId', event.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">请选择品类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">目标对象</span>
              <select
                value={form.targetAudience}
                onChange={(event) => updateForm('targetAudience', event.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {TARGET_AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>{audience}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextareaField label="核心卖点" value={form.coreSellingPoints} onChange={(value) => updateForm('coreSellingPoints', value)} />
            <TextareaField label="价格优势" value={form.priceAdvantage} onChange={(value) => updateForm('priceAdvantage', value)} />
            <TextareaField label="供应商优势" value={form.supplierAdvantage} onChange={(value) => updateForm('supplierAdvantage', value)} />
            <TextareaField label="资质背书" value={form.qualificationSupport} onChange={(value) => updateForm('qualificationSupport', value)} />
            <TextareaField label="交付优势" value={form.deliveryAdvantage} onChange={(value) => updateForm('deliveryAdvantage', value)} />
            <TextareaField label="售后优势" value={form.afterSalesAdvantage} onChange={(value) => updateForm('afterSalesAdvantage', value)} />
          </div>

          <TextareaField label="风险提示" value={form.riskNotice} onChange={(value) => updateForm('riskNotice', value)} />
          <TextareaField
            label="正式资料正文"
            value={form.formalText}
            onChange={(value) => updateForm('formalText', value)}
            rows={7}
            placeholder="可填写最终对外正文；留空时系统会根据上方字段生成预览和复制正文。"
          />

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
              {saving ? '保存中...' : '保存资料'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(previewTarget)}
        onClose={() => setPreviewTarget(null)}
        title="正文预览"
        width="max-w-3xl"
      >
        {previewTarget && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{previewTarget.title}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {previewTarget.category?.name || '-'} / {previewTarget.targetAudience || '-'}
              </p>
            </div>
            <pre className="max-h-[55vh] whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              {buildSalesMaterialPreview(previewTarget) || '暂无正文内容'}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => copyFormalText(previewTarget)}
                className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm"
              >
                复制正式正文
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={archiveMaterial}
        title="归档销售/商务资料"
        message={`确认归档「${archiveTarget?.title || ''}」吗？归档后默认列表不再显示。`}
        confirmText="确认归档"
      />
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  )
}
