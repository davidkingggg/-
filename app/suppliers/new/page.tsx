'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface CategoryOption { id: string; name: string }
interface RiskTag { id: string; name: string; color: string | null }
interface ContactForm { name: string; position: string; phone: string; wechat: string; email: string; isPrimary: boolean; notes: string }

const COMPANY_TYPES = ['厂家', '代理商', '经销商', '服务商', '安装公司', '其他']
const SOURCES = ['展会', '网络', '老板推荐', '销售推荐', '供应商转介绍', '其他']
const COOPERATION_LEVELS = ['强', '一般', '弱', '未确认']
const PRICE_LEVELS = ['高', '中', '低', '未知']
const RECOMMENDED_LEVELS = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']

const EMPTY_CONTACT: ContactForm = { name: '', position: '', phone: '', wechat: '', email: '', isPrimary: false, notes: '' }

export default function NewSupplierPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [riskTags, setRiskTags] = useState<RiskTag[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    region: '',
    companyType: '',
    source: '',
    hasQuoted: false,
    hasVisited: false,
    willingToJoin: false,
    cooperationWillingness: '',
    qualification: '',
    deliveryAbility: '',
    afterSalesAbility: '',
    paymentTerms: '',
    priceLevel: '',
    recommendedLevel: '',
    riskSummary: '',
    notes: '',
    nextFollowUpDate: '',
  })

  const [contacts, setContacts] = useState<ContactForm[]>([{ ...EMPTY_CONTACT, isPrimary: true }])
  const [selectedRiskTagIds, setSelectedRiskTagIds] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/risk-tags').then(r => r.json()).then(setRiskTags).catch(() => {})
  }, [])

  function updateContact(index: number, field: keyof ContactForm, value: string | boolean) {
    setContacts(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addContact() {
    setContacts(prev => [...prev, { ...EMPTY_CONTACT }])
  }

  function removeContact(index: number) {
    setContacts(prev => prev.filter((_, i) => i !== index))
  }

  function toggleRiskTag(tagId: string) {
    setSelectedRiskTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const validContacts = contacts.filter(c => c.name.trim())
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId || undefined,
          companyType: form.companyType || null,
          source: form.source || null,
          cooperationWillingness: form.cooperationWillingness || null,
          priceLevel: form.priceLevel || null,
          recommendedLevel: form.recommendedLevel || null,
          nextFollowUpDate: form.nextFollowUpDate || null,
          contacts: validContacts,
          riskTagIds: selectedRiskTagIds,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const supplier = await res.json()
      showToast('供应商新增成功', 'success')
      router.push(`/suppliers/${supplier.id}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '新增供应商失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
  const selectClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => router.push('/suppliers')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2 inline-block"
        >
          ← 返回供应商列表
        </button>
        <h1 className="text-2xl font-bold text-gray-800">新增供应商</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>供应商名称 <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>主品类 <span className="text-red-500">*</span></label>
              <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className={selectClass} required>
                <option value="">请选择品类</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>所在地区</label>
              <input type="text" value={form.region} onChange={e => setForm({...form, region: e.target.value})} className={inputClass} placeholder="如：浙江杭州" />
            </div>
            <div>
              <label className={labelClass}>公司性质</label>
              <select value={form.companyType} onChange={e => setForm({...form, companyType: e.target.value})} className={selectClass}>
                <option value="">请选择</option>
                {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>来源</label>
              <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className={selectClass}>
                <option value="">请选择</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>合作意愿</label>
              <select value={form.cooperationWillingness} onChange={e => setForm({...form, cooperationWillingness: e.target.value})} className={selectClass}>
                <option value="">请选择</option>
                {COOPERATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>价格水平</label>
              <select value={form.priceLevel} onChange={e => setForm({...form, priceLevel: e.target.value})} className={selectClass}>
                <option value="">请选择</option>
                {PRICE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>推荐等级</label>
              <select value={form.recommendedLevel} onChange={e => setForm({...form, recommendedLevel: e.target.value})} className={selectClass}>
                <option value="">请选择</option>
                {RECOMMENDED_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>下次跟进时间</label>
              <input type="date" value={form.nextFollowUpDate} onChange={e => setForm({...form, nextFollowUpDate: e.target.value})} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-6 mt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.hasQuoted} onChange={e => setForm({...form, hasQuoted: e.target.checked})} className="rounded border-gray-300" />
              已报价
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.hasVisited} onChange={e => setForm({...form, hasVisited: e.target.checked})} className="rounded border-gray-300" />
              已考察
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.willingToJoin} onChange={e => setForm({...form, willingToJoin: e.target.checked})} className="rounded border-gray-300" />
              愿意入驻平台
            </label>
          </div>
        </div>

        {/* 能力评估 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">能力评估</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>资质情况</label>
              <input type="text" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>交期能力</label>
              <input type="text" value={form.deliveryAbility} onChange={e => setForm({...form, deliveryAbility: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>售后能力</label>
              <input type="text" value={form.afterSalesAbility} onChange={e => setForm({...form, afterSalesAbility: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>账期条件</label>
              <input type="text" value={form.paymentTerms} onChange={e => setForm({...form, paymentTerms: e.target.value})} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>风险点摘要</label>
            <textarea value={form.riskSummary} onChange={e => setForm({...form, riskSummary: e.target.value})} rows={2} className={inputClass} />
          </div>
          <div className="mt-4">
            <label className={labelClass}>备注</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={inputClass} />
          </div>
        </div>

        {/* 联系人 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">联系人</h2>
            <button type="button" onClick={addContact} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              + 添加联系人
            </button>
          </div>
          <div className="space-y-4">
            {contacts.map((c, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">联系人 {i + 1}</span>
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      <input type="checkbox" checked={c.isPrimary} onChange={e => updateContact(i, 'isPrimary', e.target.checked)} className="rounded border-gray-300" />
                      主要联系人
                    </label>
                  </div>
                  {contacts.length > 1 && (
                    <button type="button" onClick={() => removeContact(i)} className="text-xs text-red-500 hover:text-red-700">
                      移除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} className={inputClass} placeholder="姓名" />
                  <input type="text" value={c.position} onChange={e => updateContact(i, 'position', e.target.value)} className={inputClass} placeholder="职务" />
                  <input type="text" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} className={inputClass} placeholder="电话" />
                  <input type="text" value={c.wechat} onChange={e => updateContact(i, 'wechat', e.target.value)} className={inputClass} placeholder="微信" />
                  <input type="email" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} className={inputClass} placeholder="邮箱" />
                  <input type="text" value={c.notes} onChange={e => updateContact(i, 'notes', e.target.value)} className={inputClass} placeholder="备注" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 风险标签 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">风险标签</h2>
          <div className="flex flex-wrap gap-2">
            {riskTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleRiskTag(tag.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedRiskTagIds.includes(tag.id)
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {tag.name}
              </button>
            ))}
            {riskTags.length === 0 && <span className="text-sm text-gray-400">暂无可用的风险标签</span>}
          </div>
        </div>

        {/* 提交 */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/suppliers')}
            className="px-5 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            {saving ? '保存中...' : '保存供应商'}
          </button>
        </div>
      </form>
    </div>
  )
}
