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

const TABS = ['基本信息', '联系人', '风险与备注', '关联报价', '评分与考察', '采购记录']

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

      {/* Tab 3-5: 占位 */}
      {activeTab === 3 && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">报价模块开发中，将在第 3 阶段实现</div>}
      {activeTab === 4 && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">评分与考察模块开发中，将在第 5 阶段实现</div>}
      {activeTab === 5 && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">采购记录模块开发中，将在第 6 阶段实现</div>}
    </div>
  )
}
