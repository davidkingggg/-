'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, RefreshCw, ShieldOff } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface AgentToken {
  id: string
  name: string
  tokenPrefix: string
  userId: string
  isActive: boolean
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  user: { id: string; username: string; name: string; isActive: boolean; isAdmin: boolean }
}

interface UserOption {
  id: string
  username: string
  name: string
  isActive: boolean
}

function formatDateTime(value: string | null) {
  if (!value) return '从未使用'
  return new Date(value).toLocaleString('zh-CN')
}

export default function AgentTokensPage() {
  const { showToast } = useToast()
  const [tokens, setTokens] = useState<AgentToken[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [userId, setUserId] = useState('')
  const [plainToken, setPlainToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tokenRes, userRes] = await Promise.all([fetch('/api/agent-api-tokens'), fetch('/api/users')])
      if (!tokenRes.ok) throw new Error((await tokenRes.json()).error || '获取 Agent Token 失败')
      if (!userRes.ok) throw new Error((await userRes.json()).error || '获取用户列表失败')
      setTokens(await tokenRes.json())
      setUsers((await userRes.json()).filter((item: UserOption) => item.isActive))
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取 Agent Token 失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    startTransition(() => {
      void loadData()
    })
  }, [loadData])

  async function copyToken(value: string) {
    await navigator.clipboard.writeText(value)
    showToast('Token 已复制', 'success')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/agent-api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName, userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '创建 Agent Token 失败')
      setPlainToken(data.plainToken)
      setShowCreate(false)
      setTokenName('')
      setUserId('')
      showToast('Agent Token 已创建', 'success')
      void loadData()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '创建 Agent Token 失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleToken(token: AgentToken) {
    try {
      const res = await fetch(`/api/agent-api-tokens/${token.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !token.isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '更新 Agent Token 失败')
      showToast(token.isActive ? 'Agent Token 已停用' : 'Agent Token 已启用', 'success')
      void loadData()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新 Agent Token 失败', 'error')
    }
  }

  async function resetToken(token: AgentToken) {
    if (!window.confirm(`确认重置「${token.name}」？旧 Token 将立即失效。`)) return
    try {
      const res = await fetch(`/api/agent-api-tokens/${token.id}/reset`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '重置 Agent Token 失败')
      setPlainToken(data.plainToken)
      showToast('Agent Token 已重置', 'success')
      void loadData()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '重置 Agent Token 失败', 'error')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">Agent Token</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">为 Claude Code CLI、Codex 等内部 agent 授权调用 REST API。</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <KeyRound size={16} />
          新建 Token
        </button>
      </div>

      {plainToken && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 text-sm font-semibold text-amber-900">请立即复制明文 Token，关闭后将无法再次查看。</div>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-xs text-slate-700">{plainToken}</code>
            <button
              onClick={() => void copyToken(plainToken)}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"
            >
              <Copy size={14} />
              复制
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">正在加载 Agent Token...</div>
      ) : tokens.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">暂无 Agent Token</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e5eaf3] bg-[#f8fafc]">
              <tr>
                <th className="h-[52px] px-4 text-[13px] font-bold text-[#475569]">名称</th>
                <th className="h-[52px] px-4 text-[13px] font-bold text-[#475569]">绑定用户</th>
                <th className="h-[52px] px-4 text-[13px] font-bold text-[#475569]">前缀</th>
                <th className="h-[52px] px-4 text-[13px] font-bold text-[#475569]">状态</th>
                <th className="h-[52px] px-4 text-[13px] font-bold text-[#475569]">最近使用</th>
                <th className="h-[52px] px-4 text-[13px] font-bold text-[#475569]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {tokens.map((token) => (
                <tr key={token.id} className="transition-colors hover:bg-[#f8fafc]">
                  <td className="h-[58px] px-4 text-[14px] font-medium text-gray-800">{token.name}</td>
                  <td className="h-[58px] px-4 text-[14px] text-gray-500">
                    {token.user.name}（{token.user.username}）
                  </td>
                  <td className="h-[58px] px-4">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{token.tokenPrefix}...</code>
                  </td>
                  <td className="h-[58px] px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        token.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {token.isActive ? '启用中' : '已停用'}
                    </span>
                  </td>
                  <td className="h-[58px] px-4 text-[14px] text-gray-500">{formatDateTime(token.lastUsedAt)}</td>
                  <td className="h-[58px] px-4">
                    <div className="flex items-center gap-3 text-[13px]">
                      <button onClick={() => resetToken(token)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                        <RefreshCw size={14} />
                        重置
                      </button>
                      <button
                        onClick={() => toggleToken(token)}
                        className={token.isActive ? 'inline-flex items-center gap-1 text-red-600 hover:text-red-800' : 'inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800'}
                      >
                        <ShieldOff size={14} />
                        {token.isActive ? '停用' : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">新建 Agent Token</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Token 名称</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">绑定用户</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">请选择用户</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（{user.username}）
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
