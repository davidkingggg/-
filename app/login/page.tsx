'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [needsInit, setNeedsInit] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'login' | 'init'>('login')

  // Login form
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Init form
  const [initUsername, setInitUsername] = useState('')
  const [initPassword, setInitPassword] = useState('')
  const [initName, setInitName] = useState('')
  const [initError, setInitError] = useState('')
  const [initLoading, setInitLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/init')
      .then((r) => r.json())
      .then((data) => {
        setNeedsInit(data.needsInit)
        if (data.needsInit) setMode('init')
      })
      .catch(() => setNeedsInit(false))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInitError('')
    setInitLoading(true)

    try {
      const res = await fetch('/api/auth/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: initUsername, password: initPassword, name: initName }),
      })
      const data = await res.json()

      if (!res.ok) {
        setInitError(data.error || '初始化失败')
        return
      }

      // Switch to login mode after successful init
      setMode('login')
      setNeedsInit(false)
      setUsername(initUsername)
      setPassword('')
      setError('')
    } catch {
      setInitError('网络错误')
    } finally {
      setInitLoading(false)
    }
  }

  if (needsInit === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f8fb' }}>
        <div className="text-sm text-gray-400">加载中…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f8fb' }}>
      <div
        className="w-full max-w-sm mx-4 rounded-2xl border bg-white p-8"
        style={{ borderColor: '#e5eaf3', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🏭</div>
          <h1 className="text-xl font-bold text-gray-900">供采管家</h1>
          <p className="text-xs text-gray-400 mt-1">本地优先 · 供应商与采购管理</p>
        </div>

        {mode === 'init' ? (
          <>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">首次使用 — 创建管理员账号</h2>
            <form onSubmit={handleInit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">姓名</label>
                <input
                  type="text"
                  value={initName}
                  onChange={(e) => setInitName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ borderColor: '#e2e8f0' }}
                  placeholder="你的姓名"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">用户名</label>
                <input
                  type="text"
                  value={initUsername}
                  onChange={(e) => setInitUsername(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ borderColor: '#e2e8f0' }}
                  placeholder="用于登录"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">密码</label>
                <input
                  type="password"
                  value={initPassword}
                  onChange={(e) => setInitPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ borderColor: '#e2e8f0' }}
                  placeholder="至少 6 位"
                  minLength={6}
                  required
                />
              </div>
              {initError && <p className="text-sm text-red-600">{initError}</p>}
              <button
                type="submit"
                disabled={initLoading}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {initLoading ? '创建中…' : '创建管理员'}
              </button>
            </form>
          </>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ borderColor: '#e2e8f0' }}
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ borderColor: '#e2e8f0' }}
                  placeholder="请输入密码"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '登录中…' : '登录'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
