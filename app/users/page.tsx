'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface UserRecord {
  id: string
  username: string
  name: string
  isAdmin: boolean
  isActive: boolean
  createdAt: string
}

export default function UsersPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null)

  // Create form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editIsAdmin, setEditIsAdmin] = useState(false)
  const [editPassword, setEditPassword] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || '获取用户列表失败', 'error')
        return
      }
      const data = await res.json()
      setUsers(data)
    } catch {
      showToast('获取用户列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    startTransition(() => {
      void loadUsers()
    })
  }, [loadUsers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, name: newName, isAdmin: newIsAdmin }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || '创建失败', 'error')
        return
      }
      showToast('用户创建成功', 'success')
      setShowCreate(false)
      setNewUsername('')
      setNewPassword('')
      setNewName('')
      setNewIsAdmin(false)
      loadUsers()
    } catch {
      showToast('创建失败', 'error')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditLoading(true)
    try {
      const body: Record<string, unknown> = { name: editName, isAdmin: editIsAdmin }
      if (editPassword) body.password = editPassword

      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || '更新失败', 'error')
        return
      }
      showToast('更新成功', 'success')
      setEditTarget(null)
      setEditPassword('')
      loadUsers()
    } catch {
      showToast('更新失败', 'error')
    } finally {
      setEditLoading(false)
    }
  }

  async function toggleActive(user: UserRecord) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || '操作失败', 'error')
        return
      }
      showToast(user.isActive ? '已停用' : '已启用', 'success')
      loadUsers()
    } catch {
      showToast('操作失败', 'error')
    }
  }

  function openEdit(user: UserRecord) {
    setEditTarget(user)
    setEditName(user.name)
    setEditIsAdmin(user.isAdmin)
    setEditPassword('')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">用户管理</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">管理系统登录账号，仅管理员可操作</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm"
        >
          新建用户
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">加载中…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-400">暂无用户</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f8fafc] border-b border-[#e5eaf3]">
              <tr>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">姓名</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">用户名</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">角色</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">状态</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">创建时间</th>
                <th className="px-4 h-[52px] text-[13px] font-bold text-[#475569]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-4 h-[58px] text-[14px] text-gray-800 font-medium">{u.name}</td>
                  <td className="px-4 h-[58px] text-[14px] text-gray-500">{u.username}</td>
                  <td className="px-4 h-[58px] text-[14px]">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.isAdmin ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.isAdmin ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-4 h-[58px] text-[14px]">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {u.isActive ? '正常' : '已停用'}
                    </span>
                  </td>
                  <td className="px-4 h-[58px] text-[14px] text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 h-[58px] text-[14px] space-x-3">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800">
                      编辑
                    </button>
                    <button onClick={() => toggleActive(u)} className={u.isActive ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'}>
                      {u.isActive ? '停用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">新建用户</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">姓名</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">用户名</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  minLength={10}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="rounded border-gray-300"
                />
                管理员权限
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createLoading ? '创建中…' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">编辑用户 — {editTarget.username}</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">姓名</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">新密码（留空不修改）</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  minLength={10}
                  placeholder="留空则不修改密码"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editIsAdmin}
                  onChange={(e) => setEditIsAdmin(e.target.checked)}
                  className="rounded border-gray-300"
                />
                管理员权限
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {editLoading ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
