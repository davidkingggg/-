import type { ReactNode } from 'react'
import { WorkbenchSidebar } from './WorkbenchSidebar'
import { WorkbenchTabs } from './WorkbenchTabs'
import { WorkbenchTopbar } from './WorkbenchTopbar'

export function WorkbenchShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f4f7fb] text-slate-900">
      <WorkbenchSidebar />
      <div className="min-w-0 flex-1 md:pl-[232px]">
        <WorkbenchTopbar />
        <WorkbenchTabs />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1480px] px-4 py-5 pb-24 md:px-6 md:pb-10 2xl:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
