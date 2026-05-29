'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronsLeft, PackageCheck } from 'lucide-react'
import { useAuth } from '@/components/layout/ClientProviders'
import { workbenchNavGroups } from './workbench-nav'

const mobileRouteLabels: Record<string, string> = {
  '/': '工作台',
  '/suppliers': '供应商',
  '/quote-compare': '报价',
  '/purchase-board': '采购',
}

const mobileRouteOrder = Object.keys(mobileRouteLabels)

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function WorkbenchSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const allNavItems = workbenchNavGroups.flatMap((group) => group.items)
  const mobileNavItems = mobileRouteOrder
    .map((href) => allNavItems.find((item) => item.href === href))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => !item.adminOnly || user?.isAdmin)

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#101928] text-slate-300 shadow-[8px_0_28px_rgba(15,23,42,0.18)] md:flex">
        <div className="flex h-[74px] items-center gap-3 border-b border-white/10 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-950/30">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold text-white">本地采购管理</div>
            <div className="mt-0.5 text-[11px] font-semibold text-slate-400">区域版 v2.6.0</div>
          </div>
          <ChevronDown className="ml-auto h-4 w-4 text-slate-500" />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {workbenchNavGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="mb-1 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items
                  .filter((item) => !item.adminOnly || user?.isAdmin)
                  .map((item) => {
                    const active = isActivePath(pathname, item.href)
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          'group flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-bold transition',
                          active
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-950/25'
                            : 'text-slate-300 hover:bg-white/[0.07] hover:text-white',
                        ].join(' ')}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge}
                      </Link>
                    )
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div
            className="mb-3 flex h-9 w-full items-center gap-2 rounded-md border border-white/10 px-3 text-[12px] font-bold text-slate-500"
            aria-hidden="true"
          >
            <ChevronsLeft className="h-4 w-4" />
            收起菜单
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[12px] font-extrabold text-slate-700">
                {(user?.name ?? '用户').slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-extrabold text-white">{user?.name ?? '本地用户'}</div>
                <div className="truncate text-[11px] font-semibold text-slate-400">
                  {user?.person?.role ?? '采购专员'}
                </div>
              </div>
            </div>
            <div className="mt-3 flex h-8 items-center justify-between rounded-md border border-white/10 px-2 text-[12px] font-bold text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                在线
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </div>
      </aside>

      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid h-16 grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/[0.96] p-1 shadow-[0_16px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl md:hidden"
        aria-label="移动端主导航"
      >
        {mobileNavItems.map((item) => {
          const active = isActivePath(pathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-extrabold transition',
                active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate">{mobileRouteLabels[item.href]}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
