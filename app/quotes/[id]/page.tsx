'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Attachment { id: string; fileName: string; filePath: string; fileType: string | null; notes: string | null; createdAt: string }
interface QuoteItem {
  id: string; compareKey: string; productName: string; model: string | null; unit: string | null
  price: number | null; includesTax: boolean; taxRate: number | null; includesFreight: boolean
  minOrderQty: number | null; deliveryTime: string | null; paymentTerms: string | null
  warranty: string | null; priceNotes: string | null
}
interface QuoteDetail {
  id: string; quoteNumber: string | null; title: string | null; supplierId: string; categoryId: string
  supplier: { id: string; name: string }; category: { id: string; name: string }
  quoteDate: string; sourceType: string | null; quoteStage: string | null
  rawText: string | null; notes: string | null; items: QuoteItem[]; attachments: Attachment[]
}
interface CategoryOption { id: string; name: string }
interface SupplierOption { id: string; name: string }

const SOURCE_TYPES = ['微信', '图片', 'PDF', 'Excel', '口头', '其他']
const QUOTE_STAGES = ['初次报价', '二次议价', '最终确认价', '量大优惠价']
const TABS = ['基本信息', '报价明细', '附件管理']

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Item modal
  const [itemModal, setItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null)
  const [itemForm, setItemForm] = useState({ compareKey: '', productName: '', model: '', unit: '', price: '', includesTax: false, taxRate: '', includesFreight: false, minOrderQty: '', deliveryTime: '', paymentTerms: '', warranty: '', priceNotes: '' } as Record<string, string | boolean>)
  const [archiveItem, setArchiveItem] = useState<QuoteItem | null>(null)

  // Attachment
  const [attModal, setAttModal] = useState(false)
  const [attForm, setAttForm] = useState({ filePath: '', notes: '' })
  const [deleteAtt, setDeleteAtt] = useState<Attachment | null>(null)

  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/quotes/${id}`)
        if (!res.ok) throw new Error()
        setQuote(await res.json())
      } catch { showToast('获取报价单详情失败', 'error') }
      finally { setLoading(false) }
    }
    load()
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/suppliers').then(r => r.json()).then((d: SupplierOption[]) => setSuppliers(d)).catch(() => {})
  }, [id, reloadKey, showToast])

  function startEdit() {
    if (!quote) return
    setForm({
      quoteNumber: quote.quoteNumber || '', title: quote.title || '',
      supplierId: quote.supplierId, categoryId: quote.categoryId,
      quoteDate: quote.quoteDate.slice(0, 10), sourceType: quote.sourceType || '',
      quoteStage: quote.quoteStage || '', rawText: quote.rawText || '', notes: quote.notes || '',
    })
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast('报价单更新成功', 'success'); setEditing(false); reload()
    } catch (e) { showToast(e instanceof Error ? e.message : '更新失败', 'error') }
    finally { setSaving(false) }
  }

  // Item CRUD
  function openAddItem() {
    setEditingItem(null)
    setItemForm({ compareKey: '', productName: '', model: '', unit: '', price: '', includesTax: false, taxRate: '', includesFreight: false, minOrderQty: '', deliveryTime: '', paymentTerms: '', warranty: '', priceNotes: '' })
    setItemModal(true)
  }
  function openEditItem(item: QuoteItem) {
    setEditingItem(item)
    setItemForm({
      compareKey: item.compareKey, productName: item.productName, model: item.model || '',
      unit: item.unit || '', price: item.price !== null ? String(item.price) : '',
      includesTax: item.includesTax, taxRate: item.taxRate !== null ? String(item.taxRate) : '',
      includesFreight: item.includesFreight, minOrderQty: item.minOrderQty !== null ? String(item.minOrderQty) : '',
      deliveryTime: item.deliveryTime || '', paymentTerms: item.paymentTerms || '',
      warranty: item.warranty || '', priceNotes: item.priceNotes || '',
    })
    setItemModal(true)
  }
  async function saveItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      const payload = {
        ...itemForm,
        price: (itemForm.price as string) ? Number(itemForm.price) : null,
        taxRate: (itemForm.taxRate as string) ? Number(itemForm.taxRate) : null,
        minOrderQty: (itemForm.minOrderQty as string) ? Number(itemForm.minOrderQty) : null,
        ...(editingItem ? { itemId: editingItem.id } : {}),
      }
      const url = `/api/quotes/${id}/items`
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast(editingItem ? '明细已更新' : '明细已添加', 'success')
      setItemModal(false); reload()
    } catch (e) { showToast(e instanceof Error ? e.message : '操作失败', 'error') }
  }
  async function doArchiveItem() {
    if (!archiveItem) return
    try {
      const res = await fetch(`/api/quotes/${id}/items?itemId=${archiveItem.id}`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      showToast('明细已归档', 'success'); setArchiveItem(null); reload()
    } catch { showToast('归档失败', 'error') }
  }

  // Attachment
  async function saveAttachment(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch(`/api/quotes/${id}/attachments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attForm) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast('附件已添加', 'success'); setAttModal(false); setAttForm({ filePath: '', notes: '' }); reload()
    } catch (e) { showToast(e instanceof Error ? e.message : '添加失败', 'error') }
  }
  async function doDeleteAtt() {
    if (!deleteAtt) return
    try {
      const res = await fetch(`/api/quotes/${id}/attachments?attachmentId=${deleteAtt.id}`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      showToast('附件记录已移除', 'success'); setDeleteAtt(null); reload()
    } catch { showToast('移除失败', 'error') }
  }

  if (loading) return <div className="p-6 text-gray-500">加载中...</div>
  if (!quote) return <div className="p-6 text-red-500">报价单不存在</div>

  const ic = 'w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'
  const sc = 'h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] bg-white text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const lc = 'block text-[13px] font-semibold text-[#334155] mb-1.5'
  const tc = 'w-full border border-[#e5eaf3] rounded-xl px-3 py-2 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

  return (
    <div className="p-6">
      <button onClick={() => router.push('/quotes')} className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">← 返回报价列表</button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">{quote.title || quote.supplier.name + ' 报价'}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {quote.quoteNumber && <span className="mr-3 font-mono">#{quote.quoteNumber}</span>}
            {quote.supplier.name} · {quote.category.name} · {new Date(quote.quoteDate).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >{tab}</button>
          ))}
        </div>
      </div>

      {/* Tab 0: 基本信息 */}
      {activeTab === 0 && (
        <div className="rounded-[20px] bg-white border border-[#e5eaf3] p-6 shadow-sm">
          {!editing ? (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={startEdit} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">编辑信息</button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {([
                  ['报价单编号', quote.quoteNumber], ['报价单名称', quote.title],
                  ['供应商', quote.supplier.name], ['品类', quote.category.name],
                  ['报价日期', new Date(quote.quoteDate).toLocaleDateString('zh-CN')],
                  ['报价来源', quote.sourceType], ['报价阶段', quote.quoteStage],
                ] as [string, string | null][]).map(([label, val]) => (
                  <div key={label} className="flex"><span className="text-gray-500 w-24 shrink-0">{label}</span><span className="text-gray-800">{val || '-'}</span></div>
                ))}
              </div>
              {(quote.rawText || quote.notes) && (
                <div className="mt-4 space-y-2 text-sm">
                  {quote.rawText && <div><span className="text-gray-500">原始说明：</span><span className="text-gray-700">{quote.rawText}</span></div>}
                  {quote.notes && <div><span className="text-gray-500">备注：</span><span className="text-gray-700">{quote.notes}</span></div>}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lc}>报价单编号</label><input type="text" value={form.quoteNumber} onChange={e => setForm({...form, quoteNumber: e.target.value})} className={ic} /></div>
                <div><label className={lc}>报价单名称</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={ic} /></div>
                <div><label className={lc}>供应商</label><select value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})} className={sc}>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className={lc}>品类</label><select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className={sc}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className={lc}>报价日期</label><input type="date" value={form.quoteDate} onChange={e => setForm({...form, quoteDate: e.target.value})} className={ic} /></div>
                <div><label className={lc}>报价来源</label><select value={form.sourceType} onChange={e => setForm({...form, sourceType: e.target.value})} className={sc}><option value="">请选择</option>{SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className={lc}>报价阶段</label><select value={form.quoteStage} onChange={e => setForm({...form, quoteStage: e.target.value})} className={sc}><option value="">请选择</option>{QUOTE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div><label className={lc}>原始说明</label><textarea value={form.rawText} onChange={e => setForm({...form, rawText: e.target.value})} rows={2} className={tc} /></div>
              <div><label className={lc}>备注</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={tc} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium">取消</button>
                <button type="submit" disabled={saving} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab 1: 报价明细 */}
      {activeTab === 1 && (
        <div className="rounded-[20px] bg-white border border-[#e5eaf3] p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">报价明细列表</h2>
            <button onClick={openAddItem} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">+ 新增明细</button>
          </div>
          {quote.items.length === 0 ? <div className="text-gray-400 text-center py-8">暂无报价明细</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-[#f8fafc] border-b border-[#e5eaf3]">
                  <th className="text-left px-3 h-[52px] text-[13px] font-bold text-[#475569]">产品名称</th>
                  <th className="text-left px-3 h-[52px] text-[13px] font-bold text-[#475569]">型号</th>
                  <th className="text-left px-3 h-[52px] text-[13px] font-bold text-[#475569]">单位</th>
                  <th className="text-right px-3 h-[52px] text-[13px] font-bold text-[#475569]">报价</th>
                  <th className="text-center px-3 h-[52px] text-[13px] font-bold text-[#475569]">含税</th>
                  <th className="text-center px-3 h-[52px] text-[13px] font-bold text-[#475569]">税率</th>
                  <th className="text-center px-3 h-[52px] text-[13px] font-bold text-[#475569]">含运</th>
                  <th className="text-left px-3 h-[52px] text-[13px] font-bold text-[#475569]">交期</th>
                  <th className="text-right px-3 h-[52px] text-[13px] font-bold text-[#475569]">操作</th>
                </tr></thead>
                <tbody>
                  {quote.items.map(item => (
                    <tr key={item.id} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                      <td className="px-3 py-2 font-medium">{item.productName}</td>
                      <td className="px-3 py-2 text-gray-600">{item.model || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                      <td className="px-3 py-2 text-right font-mono">{item.price !== null ? `¥${Number(item.price).toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-2 text-center">{item.includesTax ? <span className="text-green-600">✓</span> : '-'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{item.taxRate !== null ? `${(Number(item.taxRate) * 100).toFixed(0)}%` : '-'}</td>
                      <td className="px-3 py-2 text-center">{item.includesFreight ? <span className="text-green-600">✓</span> : '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{item.deliveryTime || '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => openEditItem(item)} className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-800 mr-4">编辑</button>
                        <button onClick={() => setArchiveItem(item)} className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700">归档</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Modal open={itemModal} onClose={() => setItemModal(false)} title={editingItem ? '编辑明细' : '新增明细'}>
            <form onSubmit={saveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>产品名称 <span className="text-red-500">*</span></label><input type="text" value={itemForm.productName as string} onChange={e => setItemForm({...itemForm, productName: e.target.value})} className={ic} required /></div>
                <div><label className={lc}>对比规格标识</label><input type="text" value={itemForm.compareKey as string} onChange={e => setItemForm({...itemForm, compareKey: e.target.value})} className={ic} /></div>
                <div><label className={lc}>型号规格</label><input type="text" value={itemForm.model as string} onChange={e => setItemForm({...itemForm, model: e.target.value})} className={ic} /></div>
                <div><label className={lc}>单位</label><input type="text" value={itemForm.unit as string} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className={ic} /></div>
                <div><label className={lc}>报价</label><input type="number" step="0.01" value={itemForm.price as string} onChange={e => setItemForm({...itemForm, price: e.target.value})} className={ic} /></div>
                <div><label className={lc}>税率 (小数)</label><input type="number" step="0.01" value={itemForm.taxRate as string} onChange={e => setItemForm({...itemForm, taxRate: e.target.value})} className={ic} /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={itemForm.includesTax as boolean} onChange={e => setItemForm({...itemForm, includesTax: e.target.checked})} className="rounded" />含税</label>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={itemForm.includesFreight as boolean} onChange={e => setItemForm({...itemForm, includesFreight: e.target.checked})} className="rounded" />含运费</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>最小起订量</label><input type="number" value={itemForm.minOrderQty as string} onChange={e => setItemForm({...itemForm, minOrderQty: e.target.value})} className={ic} /></div>
                <div><label className={lc}>交期</label><input type="text" value={itemForm.deliveryTime as string} onChange={e => setItemForm({...itemForm, deliveryTime: e.target.value})} className={ic} /></div>
                <div><label className={lc}>付款条件</label><input type="text" value={itemForm.paymentTerms as string} onChange={e => setItemForm({...itemForm, paymentTerms: e.target.value})} className={ic} /></div>
                <div><label className={lc}>质保期</label><input type="text" value={itemForm.warranty as string} onChange={e => setItemForm({...itemForm, warranty: e.target.value})} className={ic} /></div>
              </div>
              <div><label className={lc}>价格备注</label><input type="text" value={itemForm.priceNotes as string} onChange={e => setItemForm({...itemForm, priceNotes: e.target.value})} className={ic} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setItemModal(false)} className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium">取消</button>
                <button type="submit" className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">保存</button>
              </div>
            </form>
          </Modal>
          <ConfirmDialog open={!!archiveItem} onClose={() => setArchiveItem(null)} onConfirm={doArchiveItem}
            title="确认归档明细" message={`确定要归档「${archiveItem?.productName}」吗？归档后该明细将不再出现在对比列表中。`} confirmText="确认归档" />
        </div>
      )}

      {/* Tab 2: 附件管理 */}
      {activeTab === 2 && (
        <div className="rounded-[20px] bg-white border border-[#e5eaf3] p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">附件列表</h2>
            <button onClick={() => setAttModal(true)} className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">+ 添加附件路径</button>
          </div>
          {quote.attachments.length === 0 ? <div className="text-gray-400 text-center py-8">暂无附件</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f8fafc] border-b border-[#e5eaf3]">
                <th className="text-left px-4 h-[52px] text-[13px] font-bold text-[#475569]">文件名</th>
                <th className="text-left px-4 h-[52px] text-[13px] font-bold text-[#475569]">路径</th>
                <th className="text-left px-4 h-[52px] text-[13px] font-bold text-[#475569]">类型</th>
                <th className="text-left px-4 h-[52px] text-[13px] font-bold text-[#475569]">备注</th>
                <th className="text-right px-4 h-[52px] text-[13px] font-bold text-[#475569]">操作</th>
              </tr></thead>
              <tbody>
                {quote.attachments.map(att => (
                  <tr key={att.id} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="px-4 py-3 font-medium">{att.fileName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-xs truncate">{att.filePath}</td>
                    <td className="px-4 py-3 text-gray-600">{att.fileType || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{att.notes || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleteAtt(att)} className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700">移除记录</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Modal open={attModal} onClose={() => setAttModal(false)} title="添加附件路径">
            <form onSubmit={saveAttachment} className="space-y-4">
              <div><label className={lc}>文件路径 <span className="text-red-500">*</span></label><input type="text" value={attForm.filePath} onChange={e => setAttForm({...attForm, filePath: e.target.value})} className={ic} required placeholder="本地文件路径" /></div>
              <div><label className={lc}>备注</label><input type="text" value={attForm.notes} onChange={e => setAttForm({...attForm, notes: e.target.value})} className={ic} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAttModal(false)} className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium">取消</button>
                <button type="submit" className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">保存</button>
              </div>
            </form>
          </Modal>
          <ConfirmDialog open={!!deleteAtt} onClose={() => setDeleteAtt(null)} onConfirm={doDeleteAtt}
            title="确认移除附件记录" message={`确定要移除附件「${deleteAtt?.fileName}」的路径关联吗？此操作不会删除本地物理文件。`} confirmText="确认移除" />
        </div>
      )}
    </div>
  )
}
