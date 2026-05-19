'use client'

import { useAuth } from './ClientProviders'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'

export default function Header() {
  const { user } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-8 sticky top-0 z-20 premium-transition">
      <div>
        <h1 className="text-lg font-display font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">供采管家</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100/50">Local DB</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-sm shadow-slate-100">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>{user.name}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 hover:bg-rose-50/50 px-3.5 py-1.5 rounded-full premium-transition active-shrink"
          title="退出登录"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>退出</span>
        </button>
      </div>
    </header>
  )
}
