'use client'

import { useState, useEffect } from 'react'
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

const ROLES = ['总经理助理', '老板', '销售', '商务', '工程师', '采购需求提交人', '行政', '其他']

const EMPTY_FORM = {
  name: '',
  department: '',
  role: '',
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

  // 筛选
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [deptOptions, setDeptOptions] = useState<string[]>([])

  const { showToast } = useToast()
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (filterRole) params.set('role', filterRole)
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
  }, [filterRole, filterDept, reloadKey, showToast])

  function reload() { setReloadKey(k => k + 1) }

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
      role: person.role || '',
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
          role: form.role || null,
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

  const roleColors: Record<string, string> = {
    '老板': 'bg-purple-50 text-purple-700',
    '总经理助理': 'bg-blue-50 text-blue-700',
    '销售': 'bg-green-50 text-green-700',
    '商务': 'bg-teal-50 text-teal-700',
    '工程师': 'bg-indigo-50 text-indigo-700',
    '采购需求提交人': 'bg-amber-50 text-amber-700',
    '行政': 'bg-pink-50 text-pink-700',
    '其他': 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">人员管理</h1>
          <p className="text-sm text-gray-500 mt-1">维护系统内部参与人员的信息及职责角色</p>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          + 新增人员
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部角色</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部部门</option>
          {deptOptions.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : people.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无人员数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">姓名</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">部门</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">角色</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">电话</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">邮箱</th>
                <th className="text-right px-6 py-3.5 font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-4 text-gray-600">{p.department || '-'}</td>
                  <td className="px-4 py-4">
                    {p.role ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[p.role] || 'bg-gray-100 text-gray-600'}`}>
                        {p.role}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{p.phone || '-'}</td>
                  <td className="px-4 py-4 text-gray-600">{p.email || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-medium"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeactivateTarget(p)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      停用
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '编辑人员' : '新增人员'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="如：采购部"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">请选择</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 停用确认 */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="确认停用人员"
        message={`确定要停用「${deactivateTarget?.name}」吗？停用后将不在人员列表中显示。`}
        confirmText="确认停用"
      />
    </div>
  )
}
