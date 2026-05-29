'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, LogOut, Plus, Search, Settings, Settings2 } from 'lucide-react'
import { useAuth } from '@/components/layout/ClientProviders'

export function WorkbenchTopbar() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function goToSearch() {
    const query = searchQuery.trim()
    if (!query) return
    router.push(`/suppliers?search=${encodeURIComponent(query)}`)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    goToSearch()
  }

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center gap-3 border-b border-slate-200 bg-white/[0.92] px-4 backdrop-blur-xl md:px-6">
      <div className="hidden h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 shadow-sm md:inline-flex">
        <Settings2 className="h-4 w-4 text-slate-500" />
        长沙市本级
      </div>

      <form
        onSubmit={handleSearch}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-500 shadow-inner"
        role="search"
      >
        <Search className="h-4 w-4 shrink-0" />
        <input
          aria-label="搜索供应商"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-slate-700 outline-none placeholder:text-slate-500"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="搜索供应商名称，回车进入供应商库"
          type="search"
          value={searchQuery}
        />
        <Link
          href={searchQuery.trim() ? `/suppliers?search=${encodeURIComponent(searchQuery.trim())}` : '/suppliers'}
          className="hidden h-7 shrink-0 items-center rounded bg-white px-2 text-[12px] font-bold text-blue-600 ring-1 ring-slate-200 transition hover:bg-blue-50 sm:inline-flex"
          aria-label="进入供应商搜索结果"
        >
          搜索
        </Link>
      </form>

      <Link
        href="/quotes/new"
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-blue-600 px-3 text-[13px] font-extrabold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 sm:px-4"
      >
        <Plus className="h-4 w-4" />
        新建
      </Link>

      <div className="hidden items-center gap-2 lg:flex">
        <Link
          href="/tasks"
          className="relative inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
        >
          <Inbox className="h-4 w-4" />
          待办
        </Link>
        <Link
          href="/settings"
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
        >
          <Settings className="h-4 w-4" />
          设置
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 xl:hidden"
        aria-label="退出登录"
        title="退出登录"
      >
        <LogOut className="h-4 w-4" />
      </button>

      <button
        onClick={handleLogout}
        className="hidden h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-bold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 xl:inline-flex"
        title={user?.name ? `${user.name} / 退出` : '退出登录'}
      >
        <LogOut className="h-4 w-4" />
        <span>{user?.name ? `${user.name} / 退出` : '退出'}</span>
      </button>
    </header>
  )
}
