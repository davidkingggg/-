'use client'

import { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Person {
  id: string
  name: string
  department: string | null
  role: string | null
  phone: string | null
  email: string | null
  notes: string | null
  isActive: boolean
}

const AVATAR_PALETTE = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-indigo-500',
]

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff
  }
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

const EMPTY_FORM = {
  name: '',
  department: '',
  phone: '',
  email: '',
  notes: '',
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Person | null>(null)
  const [activateTarget, setActivateTarget] = useState<Person | null>(null)

  // filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [deptOptions, setDeptOptions] = useState<string[]>([])

  const { showToast } = useToast()
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (filterDept) params.set('department', filterDept)
        const res = await fetch(`/api/people?${params.toString()}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setPeople(data)
        const depts = [...new Set(data.map((p: Person) => p.department).filter(Boolean))] as string[]
        setDeptOptions((prev) => {
          const merged = [...new Set([...prev, ...depts])]
          return merged.sort()
        })
      } catch {
        showToast('获取人员列表失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filterDept, reloadKey, showToast])

  function reload() { setReloadKey(k => k + 1) }

  // stats
  const totalCount = people.length
  const activeCount = people.filter(p => p.isActive).length
  const inactiveCount = people.filter(p => !p.isActive).length
  const incompleteCount = people.filter(p => !p.phone || !p.email).length

  // client-side filtered list
  const filteredPeople = useMemo(() => {
    let list = people

    // search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      )
    }

    // status filter
    if (filterStatus === 'active') {
      list = list.filter(p => p.isActive)
    } else if (filterStatus === 'inactive') {
      list = list.filter(p => !p.isActive)
    } else if (filterStatus === 'incomplete') {
      list = list.filter(p => !p.phone || !p.email)
    }

    return list
  }, [people, searchQuery, filterStatus])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(person: Person) {
    setEditingId(person.id)
    setForm({
      name: person.name,
      department: person.department || '',
      phone: person.phone || '',
      email: person.email || '',
      notes: person.notes || '',
    })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingId ? `/api/people/${editingId}` : '/api/people'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          department: form.department || null,
          phone: form.phone || null,
          email: form.email || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast(editingId ? '人员更新成功' : '人员新增成功', 'success')
      setModalOpen(false)
      reload()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    try {
      const res = await fetch(`/api/people/${deactivateTarget.id}`, { method: 'PATCH' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast('人员已停用', 'success')
      reload()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '停用失败', 'error')
    }
  }

  async function handleActivate() {
    if (!activateTarget) return
    try {
      const res = await fetch(`/api/people/${activateTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      showToast('人员已启用', 'success')
      reload()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '启用失败', 'error')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">人员管理</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">维护系统内部参与人员的信息及联系方式</p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 text-[13px] font-semibold shadow-sm transition-colors"
        >
          + 新增人员
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="h-[82px] rounded-2xl bg-white border border-[#e5eaf3] flex items-center px-5">
          <div>
            <p className="text-[12px] text-slate-400">全部人员</p>
            <p className="text-[22px] font-bold text-[#0f172a] mt-0.5">{totalCount}</p>
          </div>
        </div>
        <div className="h-[82px] rounded-2xl bg-white border border-[#e5eaf3] flex items-center px-5">
          <div>
            <p className="text-[12px] text-slate-400">启用中</p>
            <p className="text-[22px] font-bold text-emerald-600 mt-0.5">{activeCount}</p>
          </div>
        </div>
        <div className="h-[82px] rounded-2xl bg-white border border-[#e5eaf3] flex items-center px-5">
          <div>
            <p className="text-[12px] text-slate-400">已停用</p>
            <p className="text-[22px] font-bold text-red-500 mt-0.5">{inactiveCount}</p>
          </div>
        </div>
        <div className="h-[82px] rounded-2xl bg-white border border-[#e5eaf3] flex items-center px-5">
          <div>
            <p className="text-[12px] text-slate-400">联系方式待完善</p>
            <p className="text-[22px] font-bold text-amber-600 mt-0.5">{incompleteCount}</p>
          </div>
        </div>
      </div>

      {/* Data quality warning */}
      {incompleteCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-700">
          <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          有 {incompleteCount} 位人员联系方式不完整，建议补充手机号或邮箱，便于任务提醒和系统通知
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索姓名、手机号、邮箱..."
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
        />
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部部门</option>
          {deptOptions.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部状态</option>
          <option value="active">启用中</option>
          <option value="inactive">已停用</option>
          <option value="incomplete">信息不完整</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-[20px] bg-white border border-[#e5eaf3] overflow-hidden" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        {loading ? (
          <div className="text-center text-slate-400 py-16 text-[13px]">加载中...</div>
        ) : filteredPeople.length === 0 ? (
          <div className="text-center text-slate-400 py-16 text-[13px]">暂无人员数据</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="h-[52px] bg-[#f8fafc] border-b border-[#e5eaf3]">
                <th className="text-left px-6 font-bold text-[#475569]">人员信息</th>
                <th className="text-left px-4 font-bold text-[#475569]">所属部门</th>
                <th className="text-left px-4 font-bold text-[#475569]">联系方式</th>
                <th className="text-left px-4 font-bold text-[#475569]">数据完整度</th>
                <th className="text-left px-4 font-bold text-[#475569]">状态</th>
                <th className="text-right px-6 font-bold text-[#475569]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map((p) => {
                const hasPhone = !!p.phone
                const hasEmail = !!p.email
                const isComplete = hasPhone && hasEmail
                return (
                  <tr key={p.id} className="h-[68px] border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc] transition-colors">
                    {/* 人员信息 */}
                    <td className="px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0 ${hashColor(p.name)}`}>
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#0f172a] truncate">{p.name}</p>
                          {p.notes && (
                            <p className="text-[12px] text-slate-400 truncate mt-0.5 max-w-[180px]">{p.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* 所属部门 */}
                    <td className="px-4 text-[#475569]">{p.department || '-'}</td>
                    {/* 联系方式 */}
                    <td className="px-4">
                      <div className="flex flex-col gap-1">
                        {hasPhone ? (
                          <span className="text-[#334155]">{p.phone}</span>
                        ) : (
                          <span className="h-5 px-2 rounded-full bg-slate-100 text-slate-400 text-[11px] inline-flex items-center w-fit">手机号未填写</span>
                        )}
                        {hasEmail ? (
                          <span className="text-[#334155] text-[12px]">{p.email}</span>
                        ) : (
                          <span className="h-5 px-2 rounded-full bg-slate-100 text-slate-400 text-[11px] inline-flex items-center w-fit">邮箱未填写</span>
                        )}
                      </div>
                    </td>
                    {/* 数据完整度 */}
                    <td className="px-4">
                      {isComplete ? (
                        <span className="h-6 px-3 rounded-full bg-emerald-50 text-emerald-600 text-[12px] font-medium inline-flex items-center">完整</span>
                      ) : (
                        <span className="h-6 px-3 rounded-full bg-amber-50 text-amber-600 text-[12px] font-medium inline-flex items-center">不完整</span>
                      )}
                    </td>
                    {/* 状态 */}
                    <td className="px-4">
                      {p.isActive ? (
                        <span className="h-6 px-3 rounded-full bg-emerald-50 text-emerald-600 text-[12px] font-medium inline-flex items-center">启用</span>
                      ) : (
                        <span className="h-6 px-3 rounded-full bg-red-50 text-red-500 text-[12px] font-medium inline-flex items-center">停用</span>
                      )}
                    </td>
                    {/* 操作 */}
                    <td className="px-6 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-[#2563eb] hover:text-blue-700 text-[12px] font-medium transition-colors"
                      >
                        编辑
                      </button>
                      {p.isActive ? (
                        <button
                          onClick={() => setDeactivateTarget(p)}
                          className="text-slate-400 hover:text-slate-600 text-[12px] ml-3 font-medium transition-colors"
                        >
                          停用
                        </button>
                      ) : (
                        <button
                          onClick={() => setActivateTarget(p)}
                          className="text-emerald-600 hover:text-emerald-700 text-[12px] ml-3 font-medium transition-colors"
                        >
                          启用
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '编辑人员' : '新增人员'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">姓名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">部门</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="如：采购部"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">电话</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="选填，便于系统通知"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">邮箱</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="选填，便于任务提醒"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-6 text-[13px] text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="确认停用人员"
        message={`确定要停用「${deactivateTarget?.name}」吗？停用后将不在人员列表中显示。`}
        confirmText="确认停用"
      />

      {/* Activate confirm */}
      <ConfirmDialog
        open={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivate}
        title="确认启用人员"
        message={`确定要启用「${activateTarget?.name}」吗？启用后将在人员列表中恢复显示。`}
        confirmText="确认启用"
        danger={false}
      />
    </div>
  )
}
