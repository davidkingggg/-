'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface CategoryOption { id: string; name: string }
interface RiskTag { id: string; name: string; color: string | null }
interface RiskTagRelation { riskTag: RiskTag }
interface Contact {
  id: string; name: string; position: string | null; phone: string | null
  wechat: string | null; email: string | null; isPrimary: boolean; notes: string | null
}
interface AttachmentRecord {
  id: string
  relatedType: string
  relatedId: string
  fileName: string
  filePath: string
  fileType: string | null
  notes: string | null
  createdAt: string
}
interface Supplier {
  id: string; name: string; categoryId: string
  category: { id: string; name: string }
  region: string | null; companyType: string | null; source: string | null
  hasQuoted: boolean; hasVisited: boolean; willingToJoin: boolean
  cooperationWillingness: string | null; qualification: string | null
  deliveryAbility: string | null; afterSalesAbility: string | null
  paymentTerms: string | null; priceLevel: string | null
  recommendedLevel: string | null; riskSummary: string | null
  notes: string | null; nextFollowUpDate: string | null
  contacts: Contact[]; riskTags: RiskTagRelation[]
}

const COMPANY_TYPES = ['厂家', '代理商', '经销商', '服务商', '安装公司', '其他']
const SOURCES = ['展会', '网络', '老板推荐', '销售推荐', '供应商转介绍', '其他']
const COOPERATION = ['强', '一般', '弱', '未确认']
const PRICE_LEVELS = ['高', '中', '低', '未知']
const REC_LEVELS = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']

const TABS = ['基本信息', '联系人', '风险与备注', '关联报价', '附件管理', '评分与考察', '开发进度', '采购执行']

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [allRiskTags, setAllRiskTags] = useState<RiskTag[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  // 编辑状态
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [saving, setSaving] = useState(false)

  // 联系人
  const [contactModal, setContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({ name: '', position: '', phone: '', wechat: '', email: '', isPrimary: false, notes: '' })
  const [archiveContact, setArchiveContact] = useState<Contact | null>(null)

  // 风险标签
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagsDirty, setTagsDirty] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/suppliers/${id}`)
        if (!res.ok) throw new Error()
        const data: Supplier = await res.json()
        setSupplier(data)
        setSelectedTagIds(data.riskTags.map(rt => rt.riskTag.id))
      } catch { showToast('获取供应商详情失败', 'error') }
      finally { setLoading(false) }
    }
    load()
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/risk-tags').then(r => r.json()).then(setAllRiskTags).catch(() => {})
  }, [id, reloadKey, showToast])

  function reload() { setReloadKey(k => k + 1) }

  function startEdit() {
    if (!supplier) return
    setForm({
      name: supplier.name, categoryId: supplier.categoryId,
      region: supplier.region || '', companyType: supplier.companyType || '',
      source: supplier.source || '', cooperationWillingness: supplier.cooperationWillingness || '',
      qualification: supplier.qualification || '', deliveryAbility: supplier.deliveryAbility || '',
      afterSalesAbility: supplier.afterSalesAbility || '', paymentTerms: supplier.paymentTerms || '',
      priceLevel: supplier.priceLevel || '', recommendedLevel: supplier.recommendedLevel || '',
      riskSummary: supplier.riskSummary || '', notes: supplier.notes || '',
      nextFollowUpDate: supplier.nextFollowUpDate ? supplier.nextFollowUpDate.slice(0, 10) : '',
      hasQuoted: supplier.hasQuoted, hasVisited: supplier.hasVisited, willingToJoin: supplier.willingToJoin,
    })
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast('供应商信息更新成功', 'success')
      setEditing(false)
      reload()
    } catch (e) { showToast(e instanceof Error ? e.message : '更新失败', 'error') }
    finally { setSaving(false) }
  }

  // 联系人操作
  function openAddContact() {
    setEditingContact(null)
    setContactForm({ name: '', position: '', phone: '', wechat: '', email: '', isPrimary: false, notes: '' })
    setContactModal(true)
  }
  function openEditContact(c: Contact) {
    setEditingContact(c)
    setContactForm({ name: c.name, position: c.position || '', phone: c.phone || '', wechat: c.wechat || '', email: c.email || '', isPrimary: c.isPrimary, notes: c.notes || '' })
    setContactModal(true)
  }
  async function saveContact(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingContact ? `/api/suppliers/${id}/contacts/${editingContact.id}` : `/api/suppliers/${id}/contacts`
      const method = editingContact ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast(editingContact ? '联系人更新成功' : '联系人新增成功', 'success')
      setContactModal(false)
      reload()
    } catch (e) { showToast(e instanceof Error ? e.message : '操作失败', 'error') }
  }
  async function doArchiveContact() {
    if (!archiveContact) return
    try {
      const res = await fetch(`/api/suppliers/${id}/contacts/${archiveContact.id}`, { method: 'PATCH' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast('联系人已归档', 'success')
      reload()
    } catch (e) { showToast(e instanceof Error ? e.message : '归档失败', 'error') }
  }

  // 风险标签
  function toggleTag(tagId: string) {
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId])
    setTagsDirty(true)
  }
  async function saveRiskTags() {
    try {
      const res = await fetch(`/api/suppliers/${id}/risk-tags`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskTagIds: selectedTagIds }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast('风险标签更新成功', 'success')
      setTagsDirty(false)
      reload()
    } catch (e) { showToast(e instanceof Error ? e.message : '更新失败', 'error') }
  }

  if (loading) return <div className="p-6 text-gray-500">加载中...</div>
  if (!supplier) return <div className="p-6 text-red-500">供应商不存在</div>

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
  const sc = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const lc = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="p-6">
      <button onClick={() => router.push('/suppliers')} className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">← 返回供应商列表</button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{supplier.name}</h1>
          <p className="text-sm text-gray-500 mt-1">主品类：{supplier.category.name} · {supplier.region || '未填写地区'}</p>
        </div>
      </div>

      {/* Tabs */}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {!editing ? (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={startEdit} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">编辑信息</button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  ['供应商名称', supplier.name], ['主品类', supplier.category.name],
                  ['所在地区', supplier.region], ['公司性质', supplier.companyType],
                  ['来源', supplier.source], ['合作意愿', supplier.cooperationWillingness],
                  ['价格水平', supplier.priceLevel], ['推荐等级', supplier.recommendedLevel],
                  ['资质情况', supplier.qualification], ['交期能力', supplier.deliveryAbility],
                  ['售后能力', supplier.afterSalesAbility], ['账期条件', supplier.paymentTerms],
                  ['已报价', supplier.hasQuoted ? '是' : '否'], ['已考察', supplier.hasVisited ? '是' : '否'],
                  ['愿意入驻', supplier.willingToJoin ? '是' : '否'],
                  ['下次跟进', supplier.nextFollowUpDate ? new Date(supplier.nextFollowUpDate).toLocaleDateString('zh-CN') : null],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex"><span className="text-gray-500 w-24 shrink-0">{label}</span><span className="text-gray-800">{val || '-'}</span></div>
                ))}
              </div>
              {(supplier.riskSummary || supplier.notes) && (
                <div className="mt-4 space-y-2 text-sm">
                  {supplier.riskSummary && <div><span className="text-gray-500">风险摘要：</span><span className="text-gray-700">{supplier.riskSummary}</span></div>}
                  {supplier.notes && <div><span className="text-gray-500">备注：</span><span className="text-gray-700">{supplier.notes}</span></div>}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lc}>供应商名称 *</label><input type="text" value={form.name as string} onChange={e => setForm({...form, name: e.target.value})} className={ic} required /></div>
                <div><label className={lc}>主品类 *</label><select value={form.categoryId as string} onChange={e => setForm({...form, categoryId: e.target.value})} className={sc} required><option value="">请选择</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className={lc}>所在地区</label><input type="text" value={form.region as string} onChange={e => setForm({...form, region: e.target.value})} className={ic} /></div>
                <div><label className={lc}>公司性质</label><select value={form.companyType as string} onChange={e => setForm({...form, companyType: e.target.value})} className={sc}><option value="">请选择</option>{COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className={lc}>来源</label><select value={form.source as string} onChange={e => setForm({...form, source: e.target.value})} className={sc}><option value="">请选择</option>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className={lc}>合作意愿</label><select value={form.cooperationWillingness as string} onChange={e => setForm({...form, cooperationWillingness: e.target.value})} className={sc}><option value="">请选择</option>{COOPERATION.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div><label className={lc}>价格水平</label><select value={form.priceLevel as string} onChange={e => setForm({...form, priceLevel: e.target.value})} className={sc}><option value="">请选择</option>{PRICE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div><label className={lc}>推荐等级</label><select value={form.recommendedLevel as string} onChange={e => setForm({...form, recommendedLevel: e.target.value})} className={sc}><option value="">请选择</option>{REC_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div><label className={lc}>下次跟进</label><input type="date" value={form.nextFollowUpDate as string} onChange={e => setForm({...form, nextFollowUpDate: e.target.value})} className={ic} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lc}>资质情况</label><input type="text" value={form.qualification as string} onChange={e => setForm({...form, qualification: e.target.value})} className={ic} /></div>
                <div><label className={lc}>交期能力</label><input type="text" value={form.deliveryAbility as string} onChange={e => setForm({...form, deliveryAbility: e.target.value})} className={ic} /></div>
                <div><label className={lc}>售后能力</label><input type="text" value={form.afterSalesAbility as string} onChange={e => setForm({...form, afterSalesAbility: e.target.value})} className={ic} /></div>
                <div><label className={lc}>账期条件</label><input type="text" value={form.paymentTerms as string} onChange={e => setForm({...form, paymentTerms: e.target.value})} className={ic} /></div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.hasQuoted as boolean} onChange={e => setForm({...form, hasQuoted: e.target.checked})} className="rounded" />已报价</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.hasVisited as boolean} onChange={e => setForm({...form, hasVisited: e.target.checked})} className="rounded" />已考察</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.willingToJoin as boolean} onChange={e => setForm({...form, willingToJoin: e.target.checked})} className="rounded" />愿意入驻</label>
              </div>
              <div><label className={lc}>风险摘要</label><textarea value={form.riskSummary as string} onChange={e => setForm({...form, riskSummary: e.target.value})} rows={2} className={ic} /></div>
              <div><label className={lc}>备注</label><textarea value={form.notes as string} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={ic} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab 1: 联系人 */}
      {activeTab === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">联系人列表</h2>
            <button onClick={openAddContact} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ 新增联系人</button>
          </div>
          {supplier.contacts.length === 0 ? <div className="text-gray-400 text-center py-8">暂无联系人</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 font-semibold text-gray-600">姓名</th><th className="text-left px-4 py-3 font-semibold text-gray-600">职务</th><th className="text-left px-4 py-3 font-semibold text-gray-600">电话</th><th className="text-left px-4 py-3 font-semibold text-gray-600">微信</th><th className="text-left px-4 py-3 font-semibold text-gray-600">邮箱</th><th className="text-center px-4 py-3 font-semibold text-gray-600">主要</th><th className="text-right px-4 py-3 font-semibold text-gray-600">操作</th></tr></thead>
              <tbody>
                {supplier.contacts.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.position || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.wechat || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-center">{c.isPrimary ? <span className="text-blue-600 font-medium">✓</span> : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditContact(c)} className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-medium">编辑</button>
                      <button onClick={() => setArchiveContact(c)} className="text-red-500 hover:text-red-700 text-xs font-medium">归档</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Modal open={contactModal} onClose={() => setContactModal(false)} title={editingContact ? '编辑联系人' : '新增联系人'}>
            <form onSubmit={saveContact} className="space-y-4">
              <div><label className={lc}>姓名 <span className="text-red-500">*</span></label><input type="text" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className={ic} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>职务</label><input type="text" value={contactForm.position} onChange={e => setContactForm({...contactForm, position: e.target.value})} className={ic} /></div>
                <div><label className={lc}>电话</label><input type="text" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className={ic} /></div>
                <div><label className={lc}>微信</label><input type="text" value={contactForm.wechat} onChange={e => setContactForm({...contactForm, wechat: e.target.value})} className={ic} /></div>
                <div><label className={lc}>邮箱</label><input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className={ic} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contactForm.isPrimary} onChange={e => setContactForm({...contactForm, isPrimary: e.target.checked})} className="rounded" />主要联系人</label>
              <div><label className={lc}>备注</label><textarea value={contactForm.notes} onChange={e => setContactForm({...contactForm, notes: e.target.value})} rows={2} className={ic} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setContactModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">保存</button>
              </div>
            </form>
          </Modal>
          <ConfirmDialog open={!!archiveContact} onClose={() => setArchiveContact(null)} onConfirm={doArchiveContact}
            title="确认归档联系人" message={`确定要归档联系人「${archiveContact?.name}」吗？`} confirmText="确认归档" />
        </div>
      )}

      {/* Tab 2: 风险与备注 */}
      {activeTab === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">风险标签</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {allRiskTags.map(tag => (
              <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedTagIds.includes(tag.id) ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >{tag.name}</button>
            ))}
          </div>
          {tagsDirty && (
            <button onClick={saveRiskTags} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 mb-6">保存标签变更</button>
          )}
          <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-6">风险摘要</h2>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">{supplier.riskSummary || '暂无风险摘要'}</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-6">备注</h2>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">{supplier.notes || '暂无备注'}</p>
        </div>
      )}

      {/* Tab 3: 关联报价 */}
      {activeTab === 3 && <SupplierQuotesTab supplierId={id} />}
      {activeTab === 4 && <SupplierAttachmentsTab supplierId={id} />}
      {activeTab === 5 && <SupplierScoresAndInvestigationsTab supplier={supplier} />}
      {activeTab === 6 && <SupplierDevelopmentTab supplier={supplier} />}
      {activeTab === 7 && <SupplierPurchaseTab supplier={supplier} />}
    </div>
  )
}

function SupplierQuotesTab({ supplierId }: { supplierId: string }) {
  const router = useRouter()
  const [quotes, setQuotes] = useState<{ id: string; quoteNumber: string | null; title: string | null; quoteDate: string; quoteStage: string | null; category: { name: string }; items: { id: string }[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/quotes?supplierId=${supplierId}`)
      .then(r => r.json())
      .then(setQuotes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [supplierId])

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">加载中...</div>

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">关联报价单</h2>
      {quotes.length === 0 ? (
        <div className="text-gray-400 text-center py-8">暂无关联报价</div>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-gray-600">编号</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">名称</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">品类</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">报价日期</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">阶段</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">明细数</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">操作</th>
          </tr></thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.quoteNumber || '-'}</td>
                <td className="px-4 py-3 font-medium">{q.title || '报价'}</td>
                <td className="px-4 py-3 text-gray-600">{q.category.name}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(q.quoteDate).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3">{q.quoteStage || '-'}</td>
                <td className="px-4 py-3 text-center">{q.items.length}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => router.push(`/quotes/${q.id}`)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">查看详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function SupplierAttachmentsTab({ supplierId }: { supplierId: string }) {
  const { showToast } = useToast()
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [attModal, setAttModal] = useState(false)
  const [attForm, setAttForm] = useState({ filePath: '', fileName: '', fileType: '', notes: '' })
  const [archiveTarget, setArchiveTarget] = useState<AttachmentRecord | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadAttachments() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          relatedType: 'Supplier',
          relatedId: supplierId,
        })
        const res = await fetch(`/api/attachments?${params.toString()}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!ignore) {
          setAttachments(data.records || [])
        }
      } catch {
        if (!ignore) showToast('获取供应商附件记录失败', 'error')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadAttachments()
    return () => { ignore = true }
  }, [supplierId, reloadKey, showToast])

  async function saveAttachment(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedType: 'Supplier',
          relatedId: supplierId,
          filePath: attForm.filePath,
          fileName: attForm.fileName,
          fileType: attForm.fileType,
          notes: attForm.notes,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast('附件路径记录已添加', 'success')
      setAttModal(false)
      setAttForm({ filePath: '', fileName: '', fileType: '', notes: '' })
      setReloadKey((k) => k + 1)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '添加附件路径失败', 'error')
    }
  }

  async function doArchiveAttachment() {
    if (!archiveTarget) return
    try {
      const res = await fetch(`/api/attachments/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast('附件记录已归档', 'success')
      setArchiveTarget(null)
      setReloadKey((k) => k + 1)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '归档附件失败', 'error')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
        本功能仅维护数据库附件路径记录，不上传、不下载、不预览、不校验真实文件。
      </p>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">附件列表</h2>
        <button onClick={() => setAttModal(true)} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          + 添加附件路径
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-8">加载中...</div>
      ) : attachments.length === 0 ? (
        <div className="text-gray-400 text-center py-8">暂无附件记录</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">文件名</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">路径</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">类型</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">备注</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">创建时间</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((att) => (
              <tr key={att.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">{att.fileName}</td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-xs truncate" title={att.filePath}>
                  {att.filePath}
                </td>
                <td className="px-4 py-3 text-gray-600">{att.fileType || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{att.notes || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(att.createdAt).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setArchiveTarget(att)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                    移除记录
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={attModal} onClose={() => setAttModal(false)} title="添加附件路径">
        <form onSubmit={saveAttachment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">文件路径 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={attForm.filePath}
              onChange={(e) => setAttForm({ ...attForm, filePath: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
              placeholder="本地文件路径"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">文件名</label>
            <input
              type="text"
              value={attForm.fileName}
              onChange={(e) => setAttForm({ ...attForm, fileName: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="留空时将按路径自动推导"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">文件类型</label>
            <input
              type="text"
              value={attForm.fileType}
              onChange={(e) => setAttForm({ ...attForm, fileType: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="如 pdf、xlsx；留空时自动推导"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <input
              type="text"
              value={attForm.notes}
              onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAttModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
            <button type="submit" className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">保存</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={doArchiveAttachment}
        title="确认移除附件记录"
        message={`确定要移除附件记录「${archiveTarget?.fileName || archiveTarget?.filePath || '(无名称)'}」吗？此操作不会删除物理文件。`}
        confirmText="确认移除"
      />
    </div>
  )
}

interface TabScore {
  id: string; scoreDate: string; totalScore: number; finalLevel: string;
  categoryId: string; scorer?: { name: string };
}
interface TabInvestigation {
  id: string; date: string; type: string; keyPoints: string | null; recommendFollowUp: boolean;
}

function SupplierScoresAndInvestigationsTab({ supplier }: { supplier: Supplier }) {
  const router = useRouter()
  const [scores, setScores] = useState<TabScore[]>([])
  const [investigations, setInvestigations] = useState<TabInvestigation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/scores?supplierId=${supplier.id}`).then(r => r.json()),
      fetch(`/api/investigations?supplierId=${supplier.id}`).then(r => r.json())
    ]).then(([sc, inv]) => {
      setScores(sc)
      setInvestigations(inv)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [supplier.id])

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">加载中...</div>

  const latestScore = scores.length > 0 ? scores[0] : null;

  return (
    <div className="space-y-6">
      {/* 评分摘要区 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">最新评分摘要</h2>
          <button 
            onClick={() => router.push(`/scores/new?supplierId=${supplier.id}&categoryId=${supplier.categoryId}`)}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            + 新建评分
          </button>
        </div>
        
        {latestScore ? (
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <div className="text-sm text-gray-500 mb-1">最后评分时间</div>
              <div className="font-medium text-gray-800">{new Date(latestScore.scoreDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">总分</div>
              <div className="text-2xl font-bold text-blue-600">{Number(latestScore.totalScore).toFixed(1)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">最终等级</div>
              <div className="text-2xl font-bold text-emerald-600">{latestScore.finalLevel}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">评分人</div>
              <div className="font-medium text-gray-800">{latestScore.scorer?.name || '-'}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">暂无评分记录</div>
        )}
      </div>

      {/* 历史记录区两列 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 历史评分 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">历史评分记录</h2>
          {scores.length === 0 ? <div className="text-gray-400 text-sm">暂无记录</div> : (
            <div className="space-y-3">
              {scores.map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{new Date(s.scoreDate).toLocaleDateString()} - {s.finalLevel}</div>
                    <div className="text-xs text-gray-500 mt-1">总分: {Number(s.totalScore).toFixed(1)} | 评分人: {s.scorer?.name || '-'}</div>
                  </div>
                  <button onClick={() => router.push(`/scores/${s.id}/edit`)} className="text-blue-600 text-xs hover:underline">查看/编辑</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 考察记录 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-800">调研/考察记录</h2>
            <button 
              onClick={() => router.push(`/investigations`)}
              className="text-blue-600 text-xs hover:underline"
            >
              前往考察模块管理
            </button>
          </div>
          {investigations.length === 0 ? <div className="text-gray-400 text-sm">暂无记录</div> : (
            <div className="space-y-3">
              {investigations.map(inv => (
                <div key={inv.id} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800 text-sm">{new Date(inv.date).toLocaleDateString()} · {inv.type}</span>
                    {inv.recommendFollowUp ? <span className="text-emerald-600 text-xs">推荐跟进</span> : <span className="text-gray-400 text-xs">不再跟进</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate" title={inv.keyPoints || ''}>{inv.keyPoints || '无重点记录'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SupplierDevelopmentTab({ supplier }: { supplier: Supplier }) {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [processes, setProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/development-processes?supplierId=${supplier.id}`)
      .then(r => r.json())
      .then(setProcesses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [supplier.id])

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">加载中...</div>

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">关联开发流程</h2>
        <button
          onClick={() => router.push(`/development-board?supplierId=${supplier.id}&categoryId=${supplier.categoryId}&autoOpen=true`)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          + 新建开发流程
        </button>
      </div>
      {processes.length === 0 ? (
        <div className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">暂无关联的开发流程</div>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-gray-600">品类</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">当前阶段</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">状态</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">负责人</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">优先级</th>
          </tr></thead>
          <tbody>
            {processes.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">{p.category?.name}</td>
                <td className="px-4 py-3">{p.currentStage}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${p.status === '已完成' ? 'bg-green-50 text-green-700' : p.status === '进行中' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">{p.owner?.name || '-'}</td>
                <td className="px-4 py-3">{p.priority || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function SupplierPurchaseTab({ supplier }: { supplier: Supplier }) {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [processes, setProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/purchase-processes?supplierId=${supplier.id}`)
      .then(r => r.json())
      .then(setProcesses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [supplier.id])

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">加载中...</div>

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">关联采购执行记录</h2>
        <button
          onClick={() => router.push(`/purchase-board?supplierId=${supplier.id}&categoryId=${supplier.categoryId}&autoOpen=true`)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          + 新建采购事项
        </button>
      </div>
      {processes.length === 0 ? (
        <div className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">暂无关联的采购执行记录</div>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-gray-600">事项名称</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">品类</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">当前阶段</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">状态</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">采购金额</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">负责人</th>
          </tr></thead>
          <tbody>
            {processes.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3">{p.category?.name}</td>
                <td className="px-4 py-3">{p.currentStage}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${p.status === '已完成' ? 'bg-green-50 text-green-700' : p.status === '进行中' ? 'bg-blue-50 text-blue-700' : p.status === '异常' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">{p.purchaseAmount !== null ? `¥${Number(p.purchaseAmount).toLocaleString()}` : '-'}</td>
                <td className="px-4 py-3">{p.owner?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
