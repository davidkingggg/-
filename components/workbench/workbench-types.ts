import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type WorkbenchTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet'

export interface WorkbenchNavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: ReactNode
  adminOnly?: boolean
}

export interface WorkbenchNavGroup {
  label: string
  items: WorkbenchNavItem[]
}

export interface WorkbenchTab {
  label: string
  href: string
  aliases?: string[]
}

export interface WorkbenchKpi {
  label: string
  value: ReactNode
  helper?: ReactNode
  trend?: ReactNode
  tone?: WorkbenchTone
  icon?: LucideIcon
}

export interface AttentionItem {
  title: string
  meta?: string
  time?: string
  tone?: WorkbenchTone
  href?: string
}

export interface RiskItem {
  title: string
  description: string
  count?: number
  tone?: WorkbenchTone
  href?: string
}
