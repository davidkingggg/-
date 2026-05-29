import type { ReactNode } from 'react'
import { WorkbenchShell } from '@/components/workbench/WorkbenchShell'

export default function AppLayout({ children }: { children: ReactNode }) {
  return <WorkbenchShell>{children}</WorkbenchShell>
}
