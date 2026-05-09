'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface CategoryOption { id: string; name: string }
interface SupplierOption { id: string; name: string }

interface QuoteItemForm {
  compareKey: string
  productName: string
  model: string
  unit: string
  price: string
  includesTax: boolean
  taxRate: string
  includesFreight: boolean
  minOrderQty: string
  deliveryTime: string
  paymentTerms: string
  warranty: string
  priceNotes: string
}

const SOURCE_TYPES = ['微信', '图片', 'PDF', 'Excel', '口头', '其他']
const QUOTE_STAGES = ['初次报价', '二次议价', '最终确认价', '量大优惠价']

const EMPTY_ITEM: QuoteItemForm = {
  compareKey: '', productName: '', model: '', unit: '',
  price: '', includesTax: false, taxRate: '', includesFreight: false,
  minOrderQty: '', deliveryTime: '', paymentTerms: '', warranty: '', priceNotes: '',
}

export default function NewQuotePage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    quoteNumber: '',
    title: '',
    supplierId: '',
    categoryId: '',
    quoteDate: new Date().toISOString().slice(0, 10),
    sourceType: '',
    quoteStage: '',
    rawText: '',
    notes: '',
    filePath: '',
  })

  const [items, setItems] = useState<QuoteItemForm[]>([{ ...EMPTY_ITEM }])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/suppliers').then(r => r.json()).then((data: SupplierOption[]) => setSuppliers(data)).catch(() => {})
  }, [])

  function updateItem(index: number, field: keyof QuoteItemForm, value: string | boolean) {
    setItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // 自动同步 compareKey
      if (field === 'productName' && !next[index].compareKey) {
        next[index].compareKey = value as string
      }
      return next
    })
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(index: number) { setItems(prev => prev.filter((_, i) => i !== index)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.supplierId) { showToast('请选择供应商', 'error'); return }
    if (!form.categoryId) { showToast('请选择品类', 'error'); return }
    if (!form.quoteDate) { showToast('请填写报价日期', 'error'); return }

    const validItems = items.filter(i => i.productName.trim())
    if (validItems.length === 0) { showToast('请至少添加一条报价明细', 'error'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        quoteNumber: form.quoteNumber || null,
        title: form.title || null,
        sourceType: form.sourceType || null,
        quoteStage: form.quoteStage || null,
        filePath: form.filePath || null,
        items: validItems.map(item => ({
          ...item,
          price: item.price ? Number(item.price) : null,
          taxRate: item.taxRate ? Number(item.taxRate) : null,
          minOrderQty: item.minOrderQty ? Number(item.minOrderQty) : null,
        })),
      }

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const quote = await res.json()
      showToast('报价单创建成功', 'success')
      router.push(`/quotes/${quote.id}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '创建失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
  const sc = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const lc = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <button onClick={() => router.push('/quotes')} className="text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2 inline-block">
          ← 返回报价列表
        </button>
        <h1 className="text-2xl font-bold text-gray-800">新增报价单</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 报价单主信息 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">报价单信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lc}>报价单编号</label>
              <input type="text" value={form.quoteNumber} onChange={e => setForm({...form, quoteNumber: e.target.value})} className={ic} placeholder="可选，用于 CSV 导入合并" />
            </div>
            <div>
              <label className={lc}>报价单名称</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={ic} placeholder="可选，便于查找" />
            </div>
            <div>
              <label className={lc}>供应商 <span className="text-red-500">*</span></label>
              <select value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})} className={sc} required>
                <option value="">请选择供应商</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>品类 <span className="text-red-500">*</span></label>
              <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className={sc} required>
                <option value="">请选择品类</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>报价日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.quoteDate} onChange={e => setForm({...form, quoteDate: e.target.value})} className={ic} required />
            </div>
            <div>
              <label className={lc}>报价来源</label>
              <select value={form.sourceType} onChange={e => setForm({...form, sourceType: e.target.value})} className={sc}>
                <option value="">请选择</option>
                {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>报价阶段</label>
              <select value={form.quoteStage} onChange={e => setForm({...form, quoteStage: e.target.value})} className={sc}>
                <option value="">请选择</option>
                {QUOTE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>报价文件路径</label>
              <input type="text" value={form.filePath} onChange={e => setForm({...form, filePath: e.target.value})} className={ic} placeholder="本地文件路径" />
            </div>
          </div>
          <div className="mt-4">
            <label className={lc}>原始报价说明</label>
            <textarea value={form.rawText} onChange={e => setForm({...form, rawText: e.target.value})} rows={2} className={ic} placeholder="补充文字说明" />
          </div>
          <div className="mt-4">
            <label className={lc}>备注</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={ic} />
          </div>
        </div>

        {/* 报价明细 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">报价明细</h2>
            <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              + 添加明细
            </button>
          </div>
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">明细 {i + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-500 hover:text-red-700">
                      移除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">产品名称 <span className="text-red-500">*</span></label>
                    <input type="text" value={item.productName} onChange={e => updateItem(i, 'productName', e.target.value)} className={ic} placeholder="必填" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">对比规格标识</label>
                    <input type="text" value={item.compareKey} onChange={e => updateItem(i, 'compareKey', e.target.value)} className={ic} placeholder="默认同产品名称" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">型号规格</label>
                    <input type="text" value={item.model} onChange={e => updateItem(i, 'model', e.target.value)} className={ic} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">单位</label>
                    <input type="text" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} className={ic} placeholder="个/套/台" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">报价</label>
                    <input type="number" step="0.01" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} className={ic} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">税率 (小数)</label>
                    <input type="number" step="0.01" value={item.taxRate} onChange={e => updateItem(i, 'taxRate', e.target.value)} className={ic} placeholder="如 0.13" />
                  </div>
                  <div className="flex items-end gap-4 col-span-3">
                    <label className="flex items-center gap-1 text-sm text-gray-600">
                      <input type="checkbox" checked={item.includesTax} onChange={e => updateItem(i, 'includesTax', e.target.checked)} className="rounded" />
                      含税
                    </label>
                    <label className="flex items-center gap-1 text-sm text-gray-600">
                      <input type="checkbox" checked={item.includesFreight} onChange={e => updateItem(i, 'includesFreight', e.target.checked)} className="rounded" />
                      含运费
                    </label>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">最小起订量</label>
                    <input type="number" value={item.minOrderQty} onChange={e => updateItem(i, 'minOrderQty', e.target.value)} className={ic} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">交期</label>
                    <input type="text" value={item.deliveryTime} onChange={e => updateItem(i, 'deliveryTime', e.target.value)} className={ic} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">付款条件</label>
                    <input type="text" value={item.paymentTerms} onChange={e => updateItem(i, 'paymentTerms', e.target.value)} className={ic} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">质保期</label>
                    <input type="text" value={item.warranty} onChange={e => updateItem(i, 'warranty', e.target.value)} className={ic} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">价格备注</label>
                    <input type="text" value={item.priceNotes} onChange={e => updateItem(i, 'priceNotes', e.target.value)} className={ic} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 提交 */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push('/quotes')}
            className="px-5 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            {saving ? '保存中...' : '保存报价单'}
          </button>
        </div>
      </form>
    </div>
  )
}
