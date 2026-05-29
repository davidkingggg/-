'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { workbenchTabs } from './workbench-nav'

function tabActive(pathname: string, href: string, aliases: string[] = []) {
  const candidates = [href, ...aliases]
  return candidates.some((candidate) => {
    if (candidate === '/') return pathname === '/'
    return pathname === candidate || pathname.startsWith(`${candidate}/`)
  })
}

export function WorkbenchTabs() {
  const pathname = usePathname()

  return (
    <div className="sticky top-[64px] z-20 border-b border-slate-200 bg-white">
      <nav className="flex h-12 items-end gap-1 overflow-x-auto px-4 md:px-6" aria-label="业务工作区">
        {workbenchTabs.map((tab) => {
          const active = tabActive(pathname, tab.href, tab.aliases)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'relative flex h-12 shrink-0 items-center px-3 text-[13px] font-extrabold transition',
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900',
              ].join(' ')}
            >
              {tab.label}
              {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
