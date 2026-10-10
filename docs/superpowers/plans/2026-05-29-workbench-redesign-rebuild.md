# Workbench Redesign Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current conservative UI refresh into a sketch-aligned procurement workbench with a strong global shell, dense operational dashboard, right-side attention rail, and reusable business page surfaces.

**Architecture:** Create a small workbench UI system under `components/workbench/` and migrate pages into it incrementally. Keep data fetching in existing Server Components and API utilities; keep browser-only interactions, GSAP motion, and shell controls in small Client Components. No Prisma schema changes are planned.

**Tech Stack:** Next.js 16 App Router, React 19 Server/Client Components, Tailwind CSS v4 utilities, lucide-react icons, GSAP with `@gsap/react`, existing Prisma-backed API/data helpers.

---

## Context And Constraints

- The current implementation is too shallow: `components/ui/WorkspaceShell.tsx` provides cards and headers, but it does not create the sketch's product shell, top command bar, tabbed procurement workspace, right attention rail, or dense table-first layout.
- The target sketch shows a SaaS-like procurement console: dark left navigation, white sticky top bar, horizontal business tabs, filter command strip, KPI row, main quote/purchase table, right rail with today's focus and risk reminders, and toast feedback.
- Preserve the local-first operational product. Do not add a marketing landing page, decorative hero, cloud features, or unrelated data model changes.
- Chinese UI copy must remain Chinese. Existing terminal output may show mojibake, but code should preserve file encoding and use proper Chinese strings when editing.
- `PRODUCT_SPEC.md` and `DEVELOPMENT_PLAN.md` are referenced by project rules but are absent in this checkout. `docs/CODING_RULES.md`, `docs/TEST_PLAN.md`, `docs/DATA_MODEL.md`, and `docs/DEPLOYMENT.md` have been reviewed.
- Before code execution, set up isolation with `superpowers:using-git-worktrees` if the user approves or the execution environment provides one.

## File Structure

Create:

- `components/workbench/WorkbenchShell.tsx`: shared shell composition types and page frame primitives.
- `components/workbench/WorkbenchSidebar.tsx`: sketch-aligned dark navigation with compact badges, collapse affordance, user block.
- `components/workbench/WorkbenchTopbar.tsx`: sticky top command bar with scope selector, global search, create button, status shortcuts, language/help controls.
- `components/workbench/WorkbenchTabs.tsx`: route-aware horizontal business tabs.
- `components/workbench/WorkbenchKpis.tsx`: compact KPI cards with trend markers and icon slots.
- `components/workbench/WorkbenchFilterBar.tsx`: dense filter toolbar, action buttons, saved-view affordance.
- `components/workbench/AttentionRail.tsx`: right rail for today's focus, risk reminders, and optional activity/toast slot.
- `components/workbench/WorkbenchMotion.tsx`: GSAP client-only scoped entry/rail/table animations.
- `components/workbench/WorkbenchTable.tsx`: dense table shell with toolbar, scroll wrapper, empty/loading/error states.
- `components/workbench/workbench-nav.ts`: route metadata for sidebar and top tabs.
- `components/workbench/workbench-types.ts`: shared TypeScript types for nav, KPIs, attention items, risk items.
- `scripts/test-workbench-redesign.tsx`: static/render contract tests for new workbench components.

Modify:

- `components/layout/AppLayout.tsx`: replace current layout composition with `WorkbenchShell`.
- `components/layout/Header.tsx`: remove or slim into compatibility export after `WorkbenchTopbar` takes over.
- `components/layout/Sidebar.tsx`: remove or slim into compatibility export after `WorkbenchSidebar` takes over.
- `components/layout/LayoutGate.tsx`: keep login exclusion, wrap app pages in the new shell.
- `app/globals.css`: add only truly global tokens and workbench utility classes; keep most styling in component class names.
- `app/page.tsx`: rebuild homepage as the sketch-level procurement workbench sample.
- `app/quote-compare/page.tsx`: migrate to shared filter/KPI/table shell.
- `components/quote-compare/QuoteCompareTable.tsx`: make table visually match dense workbench table.
- `app/suppliers/page.tsx`: migrate to shared filter/KPI/table shell.
- `app/quotes/page.tsx`: migrate to shared filter/KPI/table shell.
- `app/purchase-board/page.tsx`: migrate to shared filter/KPI/table shell.
- `components/ui/WorkspaceShell.tsx`: either deprecate with small wrappers around new components or leave only compatibility exports during migration.
- `components/ui/WorkspaceMotion.tsx`: replace with or re-export `WorkbenchMotion`.
- `package.json`: include `scripts/test-workbench-redesign.tsx` in `npm test`.

Do not modify:

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `lib/db.ts`
- deployment scripts, unless a later task discovers a non-UI blocker.

---

## Task 1: Establish Workbench Component Contracts

**Files:**
- Create: `components/workbench/workbench-types.ts`
- Create: `components/workbench/workbench-nav.ts`
- Create: `scripts/test-workbench-redesign.tsx`
- Modify: `package.json`

- [ ] **Step 1: Write the failing component contract test**

Create `scripts/test-workbench-redesign.tsx` with static checks that fail until the new workbench files exist.

```ts
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const requiredFiles = [
  'components/workbench/WorkbenchShell.tsx',
  'components/workbench/WorkbenchSidebar.tsx',
  'components/workbench/WorkbenchTopbar.tsx',
  'components/workbench/WorkbenchTabs.tsx',
  'components/workbench/WorkbenchKpis.tsx',
  'components/workbench/WorkbenchFilterBar.tsx',
  'components/workbench/AttentionRail.tsx',
  'components/workbench/WorkbenchMotion.tsx',
  'components/workbench/WorkbenchTable.tsx',
  'components/workbench/workbench-nav.ts',
  'components/workbench/workbench-types.ts',
]

for (const relativePath of requiredFiles) {
  assert(existsSync(join(process.cwd(), relativePath)), `${relativePath} must exist`)
}

const shell = read('components/workbench/WorkbenchShell.tsx')
assert(shell.includes('WorkbenchShell'), 'WorkbenchShell export is required')
assert(shell.includes('WorkbenchSidebar'), 'WorkbenchShell must compose WorkbenchSidebar')
assert(shell.includes('WorkbenchTopbar'), 'WorkbenchShell must compose WorkbenchTopbar')

const nav = read('components/workbench/workbench-nav.ts')
for (const label of ['工作台', '供应商管理', '询价管理', '采购执行', '合同台账', '数据看板']) {
  assert(nav.includes(label), `top workspace tab "${label}" must be defined`)
}

const packageJson = read('package.json')
assert(packageJson.includes('scripts/test-workbench-redesign.tsx'), 'npm test must include workbench redesign contract checks')

console.log('workbench redesign contracts passed')
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx tsx scripts/test-workbench-redesign.tsx
```

Expected: FAIL because `components/workbench/WorkbenchShell.tsx` and sibling files do not exist yet.

- [ ] **Step 3: Add shared workbench types**

Create `components/workbench/workbench-types.ts`.

```ts
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
```

- [ ] **Step 4: Add route metadata**

Create `components/workbench/workbench-nav.ts`.

```ts
import {
  Archive,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Database,
  Factory,
  FileSpreadsheet,
  FolderArchive,
  GitFork,
  KeyRound,
  LayoutDashboard,
  Paperclip,
  SearchCode,
  Settings,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react'
import type { WorkbenchNavGroup, WorkbenchTab } from './workbench-types'

export const workbenchTabs: WorkbenchTab[] = [
  { label: '工作台', href: '/', aliases: ['/tasks'] },
  { label: '供应商管理', href: '/suppliers', aliases: ['/categories', '/scores', '/investigations', '/development-board'] },
  { label: '询价管理', href: '/quote-compare', aliases: ['/quotes'] },
  { label: '采购执行', href: '/purchase-board' },
  { label: '合同台账', href: '/attachments', aliases: ['/archive'] },
  { label: '数据看板', href: '/boss-report', aliases: ['/data-quality', '/category-package'] },
]

export const workbenchNavGroups: WorkbenchNavGroup[] = [
  {
    label: '核心工作',
    items: [
      { label: '工作台', href: '/', icon: LayoutDashboard },
      { label: '需求管理', href: '/tasks', icon: ClipboardList },
      { label: '采购计划', href: '/development-board', icon: GitFork },
      { label: '供应商库', href: '/suppliers', icon: Factory },
      { label: '询价管理', href: '/quotes', icon: FileSpreadsheet },
      { label: '报价对比', href: '/quote-compare', icon: Award },
      { label: '采购执行', href: '/purchase-board', icon: ShoppingCart },
      { label: '合同管理', href: '/attachments', icon: WalletCards },
    ],
  },
  {
    label: '经营与数据',
    items: [
      { label: '品类中心', href: '/categories', icon: FolderArchive },
      { label: '数据看板', href: '/boss-report', icon: BarChart3 },
      { label: '销售商务资料', href: '/sales-materials', icon: BookOpen },
      { label: '数据中心', href: '/data', icon: Database },
      { label: '风险与合规', href: '/data-quality', icon: ShieldAlert },
    ],
  },
  {
    label: '协同与系统',
    items: [
      { label: '行政事项', href: '/admin-tasks', icon: CalendarClock },
      { label: '人员管理', href: '/people', icon: Users },
      { label: '调研考察', href: '/investigations', icon: SearchCode },
      { label: '归档管理', href: '/archive', icon: Archive },
      { label: '附件路径中心', href: '/attachments', icon: Paperclip },
      { label: '系统管理', href: '/settings', icon: Settings },
      { label: '用户管理', href: '/users', icon: Users, adminOnly: true },
      { label: 'Agent Token', href: '/agent-tokens', icon: KeyRound, adminOnly: true },
    ],
  },
]
```

- [ ] **Step 5: Wire the new test into `npm test`**

Modify the `test` script in `package.json` so it starts with the new check:

```json
"test": "tsx scripts/test-workbench-redesign.tsx && tsx scripts/test-workspace-ui.tsx && tsx scripts/test-hardening.ts && tsx scripts/test-agent-api-token.ts && tsx scripts/test-admin-calendar-archive.ts"
```

- [ ] **Step 6: Run the test and verify it still fails on missing UI components**

Run:

```bash
npx tsx scripts/test-workbench-redesign.tsx
```

Expected: FAIL on the first missing component file, proving the contract test catches the incomplete rebuild.

---

## Task 2: Build The Global Workbench Shell

**Files:**
- Create: `components/workbench/WorkbenchSidebar.tsx`
- Create: `components/workbench/WorkbenchTopbar.tsx`
- Create: `components/workbench/WorkbenchTabs.tsx`
- Create: `components/workbench/WorkbenchShell.tsx`
- Modify: `components/layout/AppLayout.tsx`
- Modify: `components/layout/Header.tsx`
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/LayoutGate.tsx`

- [ ] **Step 1: Implement `WorkbenchSidebar`**

Use a Client Component because it reads route and auth state.

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronsLeft, PackageCheck } from 'lucide-react'
import { useAuth } from '@/components/layout/ClientProviders'
import { workbenchNavGroups } from './workbench-nav'

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function WorkbenchSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside className="hidden h-screen w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#101928] text-slate-300 shadow-[8px_0_28px_rgba(15,23,42,0.18)] md:flex">
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
            <div className="mb-1 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500">{group.label}</div>
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
                          : 'text-slate-300 hover:bg-white/7 hover:text-white',
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
        <button className="mb-3 flex h-9 w-full items-center gap-2 rounded-md border border-white/10 px-3 text-[12px] font-bold text-slate-400 transition hover:bg-white/5 hover:text-white">
          <ChevronsLeft className="h-4 w-4" />
          收起菜单
        </button>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-extrabold text-white">{user?.name ?? '张三'}</div>
              <div className="truncate text-[11px] font-semibold text-slate-400">{user?.person?.role ?? '采购专员'}</div>
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
  )
}
```

- [ ] **Step 2: Implement `WorkbenchTopbar`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Bell, CircleHelp, Globe2, Inbox, Plus, Search, Settings2 } from 'lucide-react'
import { useAuth } from '@/components/layout/ClientProviders'

export function WorkbenchTopbar() {
  const router = useRouter()
  const { user } = useAuth()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center gap-4 border-b border-slate-200 bg-white/92 px-4 backdrop-blur-xl md:px-6">
      <button className="hidden h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 shadow-sm md:inline-flex">
        <Settings2 className="h-4 w-4 text-slate-500" />
        长沙市本级
      </button>
      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-500 shadow-inner">
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate text-[13px] font-semibold">全局搜索：供应商 / 物料 / 订单 / 合同</span>
        <kbd className="ml-auto hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-400 sm:block">⌘ K</kbd>
      </div>
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-[13px] font-extrabold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700">
        <Plus className="h-4 w-4" />
        新建
      </button>
      <div className="hidden items-center gap-2 lg:flex">
        <button className="relative inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-slate-700 hover:bg-slate-100">
          <Inbox className="h-4 w-4" />
          待办
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">12</span>
        </button>
        <button className="relative inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-slate-700 hover:bg-slate-100">
          <Bell className="h-4 w-4" />
          消息
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">5</span>
        </button>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-slate-700 hover:bg-slate-100">
          <CircleHelp className="h-4 w-4" />
          帮助
        </button>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-slate-700 hover:bg-slate-100">
          <Globe2 className="h-4 w-4" />
          简体
        </button>
      </div>
      <button onClick={handleLogout} className="hidden text-[12px] font-bold text-slate-400 hover:text-rose-600 xl:block">
        {user?.name ? `${user.name} / 退出` : '退出'}
      </button>
    </header>
  )
}
```

- [ ] **Step 3: Implement route-aware top tabs**

Create `components/workbench/WorkbenchTabs.tsx`.

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { workbenchTabs } from './workbench-nav'

function tabActive(pathname: string, href: string, aliases: string[] = []) {
  const candidates = [href, ...aliases]
  return candidates.some((candidate) => candidate === '/' ? pathname === '/' : pathname === candidate || pathname.startsWith(`${candidate}/`))
}

export function WorkbenchTabs() {
  const pathname = usePathname()

  return (
    <div className="sticky top-[64px] z-20 border-b border-slate-200 bg-white">
      <div className="flex h-12 items-end gap-2 overflow-x-auto px-4 md:px-6">
        {workbenchTabs.map((tab) => {
          const active = tabActive(pathname, tab.href, tab.aliases)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'relative flex h-12 shrink-0 items-center px-4 text-[14px] font-extrabold transition',
                active ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600',
              ].join(' ')}
            >
              {tab.label}
              {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Compose `WorkbenchShell`**

Create `components/workbench/WorkbenchShell.tsx`.

```tsx
import type { ReactNode } from 'react'
import { WorkbenchSidebar } from './WorkbenchSidebar'
import { WorkbenchTopbar } from './WorkbenchTopbar'
import { WorkbenchTabs } from './WorkbenchTabs'

export function WorkbenchShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <WorkbenchSidebar />
        <div className="min-w-0 flex-1">
          <WorkbenchTopbar />
          <WorkbenchTabs />
          <main className="min-w-0 px-4 py-4 md:px-6">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Replace legacy layout composition**

Modify `components/layout/AppLayout.tsx`.

```tsx
import { WorkbenchShell } from '@/components/workbench/WorkbenchShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <WorkbenchShell>{children}</WorkbenchShell>
}
```

Keep `Header.tsx` and `Sidebar.tsx` as compatibility wrappers for one iteration:

```tsx
export default function Header() {
  return null
}
```

```tsx
export default function Sidebar() {
  return null
}
```

- [ ] **Step 6: Run contract test**

Run:

```bash
npx tsx scripts/test-workbench-redesign.tsx
```

Expected: PASS after all required files exist and shell composition is present.

---

## Task 3: Build Shared Workbench Surfaces

**Files:**
- Create: `components/workbench/WorkbenchKpis.tsx`
- Create: `components/workbench/WorkbenchFilterBar.tsx`
- Create: `components/workbench/AttentionRail.tsx`
- Create: `components/workbench/WorkbenchTable.tsx`
- Create: `components/workbench/WorkbenchMotion.tsx`
- Modify: `components/ui/WorkspaceShell.tsx`
- Modify: `components/ui/WorkspaceMotion.tsx`

- [ ] **Step 1: Implement KPI strip**

Create `components/workbench/WorkbenchKpis.tsx`.

```tsx
import type { WorkbenchKpi, WorkbenchTone } from './workbench-types'

const toneClass: Record<WorkbenchTone, string> = {
  blue: 'border-blue-100 bg-blue-50/40 text-blue-700',
  emerald: 'border-emerald-100 bg-emerald-50/40 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50/50 text-amber-700',
  rose: 'border-rose-100 bg-rose-50/50 text-rose-700',
  slate: 'border-slate-200 bg-white text-slate-800',
  violet: 'border-violet-100 bg-violet-50/50 text-violet-700',
}

export function WorkbenchKpis({ items }: { items: WorkbenchKpi[] }) {
  return (
    <section data-workbench-motion="kpis" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className={`min-h-[108px] rounded-lg border p-4 shadow-sm ${toneClass[item.tone ?? 'slate']}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-[12px] font-bold text-slate-500">{item.label}</div>
              {Icon && <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 shadow-sm"><Icon className="h-5 w-5" /></span>}
            </div>
            <div className="mt-2 text-[25px] font-extrabold tracking-tight tabular-nums">{item.value}</div>
            {(item.helper || item.trend) && (
              <div className="mt-1 flex items-center gap-2 text-[12px] font-bold">
                {item.helper && <span className="text-slate-500">{item.helper}</span>}
                {item.trend && <span>{item.trend}</span>}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 2: Implement filter command bar**

Create `components/workbench/WorkbenchFilterBar.tsx`.

```tsx
import type { ReactNode } from 'react'
import { Save, SlidersHorizontal } from 'lucide-react'

export function WorkbenchFilterBar({
  children,
  actions,
}: {
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section data-workbench-motion="filters" className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-[13px] font-extrabold text-blue-700">
            <SlidersHorizontal className="h-4 w-4" />
            筛选
          </button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-extrabold text-slate-600">
            重置
          </button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-extrabold text-slate-600">
            <Save className="h-4 w-4" />
            保存视图
          </button>
        </div>
      </div>
    </section>
  )
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-500">
      <span>{label}</span>
      {children}
    </label>
  )
}

export const workbenchInputClass =
  'h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15'
```

- [ ] **Step 3: Implement right attention rail**

Create `components/workbench/AttentionRail.tsx`.

```tsx
import Link from 'next/link'
import { AlertTriangle, ChevronRight, CircleAlert } from 'lucide-react'
import type { AttentionItem, RiskItem } from './workbench-types'

const dotTone = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
  violet: 'bg-violet-500',
}

export function AttentionRail({
  items,
  risks,
}: {
  items: AttentionItem[]
  risks: RiskItem[]
}) {
  return (
    <aside data-workbench-motion="rail" className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-slate-900">今日重点</h2>
          <Link href="/tasks" className="text-[12px] font-extrabold text-blue-600">全部待办</Link>
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const content = (
              <div className="flex items-start gap-3 rounded-md px-2 py-2 transition hover:bg-slate-50">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dotTone[item.tone ?? 'emerald']}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-extrabold text-slate-800">{item.title}</div>
                  {item.meta && <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{item.meta}</div>}
                </div>
                {item.time && <div className="text-[11px] font-bold text-slate-400">{item.time}</div>}
              </div>
            )
            return item.href ? <Link key={item.title} href={item.href}>{content}</Link> : <div key={item.title}>{content}</div>
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-slate-900">风险提醒</h2>
          <Link href="/data-quality" className="text-[12px] font-extrabold text-blue-600">全部风险</Link>
        </div>
        <div className="space-y-2">
          {risks.map((risk) => (
            <Link key={risk.title} href={risk.href ?? '/data-quality'} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/30">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                {risk.tone === 'rose' ? <CircleAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-slate-800">{risk.title}{risk.count ? `（${risk.count}）` : ''}</span>
                <span className="block truncate text-[11px] font-semibold text-slate-400">{risk.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>
    </aside>
  )
}
```

- [ ] **Step 4: Implement table surface**

Create `components/workbench/WorkbenchTable.tsx`.

```tsx
import type { ReactNode } from 'react'

export function WorkbenchTable({
  title,
  subtitle,
  toolbar,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section data-workbench-motion="table" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-extrabold text-slate-900">{title}</h2>
          {subtitle && <div className="mt-1 text-[12px] font-semibold text-slate-500">{subtitle}</div>}
        </div>
        {toolbar && <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbar}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3">{footer}</div>}
    </section>
  )
}

export function WorkbenchEmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
      <div className="h-10 w-12 rounded-md bg-slate-100" />
      <div className="text-[13px] font-extrabold text-slate-500">{title}</div>
      {action}
    </div>
  )
}
```

- [ ] **Step 5: Implement GSAP motion wrapper**

Create `components/workbench/WorkbenchMotion.tsx`.

```tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export function WorkbenchMotion({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement | null>(null)

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) return

      gsap.from('[data-workbench-motion]', {
        autoAlpha: 0,
        y: 12,
        duration: 0.38,
        ease: 'power2.out',
        stagger: 0.045,
      })
    },
    { scope },
  )

  return <div ref={scope}>{children}</div>
}
```

- [ ] **Step 6: Add compatibility exports**

Modify `components/ui/WorkspaceMotion.tsx` to re-export the new motion wrapper:

```tsx
export { WorkbenchMotion as WorkspaceMotion } from '@/components/workbench/WorkbenchMotion'
```

Keep `components/ui/WorkspaceShell.tsx` temporarily, but plan subsequent page migrations to use `components/workbench/*` directly.

- [ ] **Step 7: Run checks**

Run:

```bash
npx tsx scripts/test-workbench-redesign.tsx
npx tsc --noEmit
```

Expected: both pass.

---

## Task 4: Rebuild Homepage As Sketch-Level Workbench

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Preserve server data fetching**

Keep the existing server-side entry shape:

```ts
export const dynamic = 'force-dynamic'

export default async function Home() {
  const user = await getCurrentUser()
  const data = await buildDashboardData(user?.personId)
  const session = await getSession()
}
```

- [ ] **Step 2: Replace current homepage layout with sketch structure**

Implement this page structure in `app/page.tsx`.

```tsx
return (
  <WorkbenchMotion>
    <div className="space-y-4">
      <WorkbenchFilterBar>
        <FilterField label="时间范围">
          <select className={workbenchInputClass} defaultValue="week">
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
        </FilterField>
        <FilterField label="组织">
          <select className={workbenchInputClass} defaultValue="all">
            <option value="all">全部</option>
          </select>
        </FilterField>
        <FilterField label="采购类别">
          <select className={workbenchInputClass} defaultValue="all">
            <option value="all">全部</option>
          </select>
        </FilterField>
        <FilterField label="状态">
          <select className={workbenchInputClass} defaultValue="all">
            <option value="all">全部</option>
          </select>
        </FilterField>
      </WorkbenchFilterBar>

      <WorkbenchKpis items={homeKpis} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <WorkbenchTable title="报价对比" subtitle="项目：本地采购重点事项" toolbar={tableToolbar} footer={tableFooter}>
            {homeComparisonTable}
          </WorkbenchTable>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <WorkbenchEmptyState title="暂无符合条件的项目" action={<Link href="/quote-compare">清空筛选条件</Link>} />
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-[13px] font-bold text-slate-400">数据加载中...</div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-[13px] font-bold text-rose-500">数据加载失败，请重试</div>
          </div>
        </div>
        <AttentionRail items={attentionItems} risks={riskItems} />
      </div>
    </div>
  </WorkbenchMotion>
)
```

- [ ] **Step 3: Build homepage KPI data from existing dashboard data**

Use existing fields:

```ts
const homeKpis = [
  { label: '询价中项目', value: data.summary.quoteSheetCount, helper: '较上周', trend: '↑ 20%', tone: 'blue', icon: ClipboardList },
  { label: '待报价项目', value: data.summary.weekTodoCount, helper: '较上周', trend: '↓ 10%', tone: 'amber', icon: FileSpreadsheet },
  { label: '已超期项目', value: data.summary.overdueTodoCount, helper: '较上周', trend: data.summary.overdueTodoCount > 0 ? '↑ 50%' : '0', tone: 'rose', icon: Siren },
  { label: '采购执行中', value: data.mainline.purchaseInProgressCount, helper: '主线流程', trend: '持续跟进', tone: 'emerald', icon: ShoppingCart },
  { label: '风险提醒', value: data.summary.bossDecisionCount + data.mainline.purchaseIssueCount, helper: '需处理', trend: '老板决策/异常', tone: 'violet', icon: TrendingUp },
]
```

- [ ] **Step 4: Build attention rail items from existing todo arrays**

```ts
const attentionItems = [
  ...data.todos.overdueItems,
  ...data.todos.weekItems,
  ...data.mainline.purchaseIssueItems,
].slice(0, 5).map((item) => ({
  title: item.title,
  meta: [item.sourceLabel, item.categoryName].filter(Boolean).join('：'),
  time: item.dueDate ? formatDate(item.dueDate) : undefined,
  tone: item.isOverdue ? 'rose' : item.priority === '高' ? 'amber' : 'emerald',
  href: item.href,
}))
```

- [ ] **Step 5: Add sketch-like demo table backed by real summary links**

Use a compact table that links to real modules rather than inventing database records. Include rows such as supplier development, quote comparison, purchase execution, and admin tasks, populated by real counts.

- [ ] **Step 6: Browser verify homepage**

Run dev server:

```bash
npm run dev -- --port 3000
```

Open `http://localhost:3000/` in Browser. Verify:

- dark left navigation is visible on desktop
- top command bar is visible
- business tabs are visible
- filter bar, KPI strip, main table, right rail are all visible in the first viewport
- no text overlaps at 1440px width
- at 390px width, sidebar hides, content remains scrollable, no horizontal page overflow except table scroll

---

## Task 5: Migrate Quote Compare To The Workbench Pattern

**Files:**
- Modify: `app/quote-compare/page.tsx`
- Modify: `components/quote-compare/QuoteCompareTable.tsx`

- [ ] **Step 1: Keep current API/data behavior unchanged**

Do not modify:

- `app/api/quote-compare/route.ts`
- `app/api/quote-compare/options/route.ts`
- `lib/quote-compare.ts`
- `lib/quote-compare-sort.ts`

- [ ] **Step 2: Wrap page controls in `WorkbenchFilterBar`**

Replace the existing filter wrapper with:

```tsx
<WorkbenchFilterBar actions={exportActions}>
  <FilterField label="品类">
    <select className={workbenchInputClass} value={categoryId} onChange={handleCategoryChange}>
      <option value="">全部</option>
      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select>
  </FilterField>
  <FilterField label="规格">
    <select className={workbenchInputClass} value={compareKey} onChange={handleCompareKeyChange}>
      <option value="">全部</option>
      {compareKeys.map((key) => <option key={key} value={key}>{key}</option>)}
    </select>
  </FilterField>
</WorkbenchFilterBar>
```

- [ ] **Step 3: Wrap comparison table in `WorkbenchTable`**

Use:

```tsx
<WorkbenchTable
  title="报价对比"
  subtitle={`共 ${items.length} 条报价明细`}
  toolbar={viewAndExportToolbar}
  footer={decisionActions}
>
  <QuoteCompareTable ... />
</WorkbenchTable>
```

- [ ] **Step 4: Update table visual density**

In `QuoteCompareTable.tsx`, ensure:

- header cells use `bg-slate-50`, `text-[12px]`, `font-extrabold`
- supplier price columns highlight lowest price with emerald text and a small `最低价` badge
- table is inside `min-w-[980px]` so desktop matches sketch and mobile scrolls horizontally
- row height remains stable and text wraps only inside product information cells

- [ ] **Step 5: Verify quote compare**

Run:

```bash
npx tsc --noEmit
npm test
```

Browser verify `/quote-compare` desktop and 390px mobile.

---

## Task 6: Migrate Suppliers, Quotes, And Purchase Board

**Files:**
- Modify: `app/suppliers/page.tsx`
- Modify: `app/quotes/page.tsx`
- Modify: `app/purchase-board/page.tsx`

- [ ] **Step 1: Suppliers page**

Use `WorkbenchFilterBar`, `WorkbenchKpis`, and `WorkbenchTable`:

```tsx
<WorkbenchKpis
  items={[
    { label: '供应商总数', value: suppliers.length, tone: 'blue', icon: Factory },
    { label: 'A级推荐', value: suppliers.filter((item) => item.recommendedLevel?.startsWith('A')).length, tone: 'emerald', icon: Award },
    { label: '待跟进', value: suppliers.filter((item) => item.nextFollowUpDate).length, tone: 'amber', icon: CalendarClock },
    { label: '风险摘要', value: suppliers.filter((item) => item.riskSummary).length, tone: 'rose', icon: ShieldAlert },
  ]}
/>
```

- [ ] **Step 2: Quotes page**

Use `WorkbenchFilterBar` for supplier/category/date filters, `WorkbenchKpis` for quote sheet count, quote item count, recent quote count, archived-visible count, and `WorkbenchTable` for quote list.

- [ ] **Step 3: Purchase board page**

Use `WorkbenchFilterBar` for owner/status/priority/stage filters, `WorkbenchKpis` for in-progress, boss decision, payment request, overdue/issue items, and `WorkbenchTable` or existing cards inside a table-like surface.

- [ ] **Step 4: Keep page business actions working**

For each page, verify existing actions remain reachable:

- `/suppliers`: add supplier, edit/archive supplier, filter/search.
- `/quotes`: new quote, import/export, view detail.
- `/purchase-board`: create process, update stage/status, mark decision/payment states.

- [ ] **Step 5: Run checks**

Run:

```bash
npx tsc --noEmit
npm test
```

Browser verify `/suppliers`, `/quotes`, `/purchase-board`.

---

## Task 7: Responsive, Motion, And Visual QA Pass

**Files:**
- Modify: `app/globals.css`
- Modify: `components/workbench/WorkbenchShell.tsx`
- Modify: `components/workbench/WorkbenchSidebar.tsx`
- Modify: `components/workbench/WorkbenchTopbar.tsx`
- Modify: `components/workbench/WorkbenchTable.tsx`
- Modify: `components/workbench/WorkbenchMotion.tsx`

- [ ] **Step 1: Add global workbench tokens only**

Append to `app/globals.css`:

```css
:root {
  --workbench-sidebar: #101928;
  --workbench-blue: #2563eb;
  --workbench-surface: #ffffff;
  --workbench-border: #dbe3ef;
}

.workbench-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
```

- [ ] **Step 2: Enforce stable dimensions**

Check all fixed UI elements:

- sidebar width: `232px`
- topbar height: `64px`
- tabs height: `48px`
- KPI cards: min height `108px`
- icon buttons: at least `36px` square
- table rows: stable padding and line-height

- [ ] **Step 3: Respect reduced motion**

Confirm `WorkbenchMotion` exits early when:

```ts
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

- [ ] **Step 4: Desktop browser QA**

With dev server running, capture or inspect:

- `http://localhost:3000/`
- `http://localhost:3000/quote-compare`
- `http://localhost:3000/suppliers`
- `http://localhost:3000/quotes`
- `http://localhost:3000/purchase-board`

At desktop width, verify:

- first viewport clearly resembles the provided sketch
- right rail appears where expected on homepage
- top tabs stay aligned below topbar
- no card-inside-card nesting
- table controls do not overlap
- text stays inside buttons/cards

- [ ] **Step 5: Mobile browser QA**

At approximately `390px` width, verify:

- sidebar hidden
- topbar search remains usable or gracefully compact
- tabs horizontally scroll
- filter controls wrap
- tables scroll horizontally inside their own surface
- no body-level horizontal overflow from layout chrome

---

## Task 8: Final Regression And Handoff

**Files:**
- Modify: `docs/TEST_PLAN.md`
- Modify: `CHANGELOG.md` if present

- [ ] **Step 1: Update manual test plan**

Add a new section to `docs/TEST_PLAN.md`:

```md
## 17. 工作台视觉重构回归测试
- [ ] 首页首屏是否包含左侧深色导航、顶部工具栏、业务页签、筛选条、KPI、主表格和右侧重点栏
- [ ] `/quote-compare` 是否使用统一筛选条、KPI 和表格容器
- [ ] `/suppliers` 是否使用统一筛选条、KPI 和表格容器
- [ ] `/quotes` 是否使用统一筛选条、KPI 和表格容器
- [ ] `/purchase-board` 是否使用统一筛选条、KPI 和数据容器
- [ ] 390px 宽度下是否不存在正文级横向溢出
- [ ] GSAP 动效是否只做轻量入场，且尊重 reduced motion
```

- [ ] **Step 2: Update changelog if file exists**

If `CHANGELOG.md` exists, add:

```md
## Unreleased
- 重构全局工作台视觉骨架，对齐采购工作台草图：左侧深色导航、顶部工具栏、业务页签、筛选条、KPI、主数据区与右侧重点栏。
- 将首页、报价对比、供应商、报价、采购执行页面迁移到统一工作台组件体系。
```

- [ ] **Step 3: Full verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Expected:

- `npm test`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS; existing Turbopack/NFT backup route warning may remain if unchanged
- `git diff --check`: no whitespace errors

- [ ] **Step 4: Browser verification**

Run dev server and verify all affected routes:

```bash
npm run dev -- --port 3000
```

Routes:

- `/`
- `/quote-compare`
- `/suppliers`
- `/quotes`
- `/purchase-board`

Capture desktop and mobile screenshots for the final handoff.

- [ ] **Step 5: Commit**

Stage only related files:

```bash
git add app/page.tsx app/quote-compare/page.tsx app/suppliers/page.tsx app/quotes/page.tsx app/purchase-board/page.tsx app/globals.css components/layout/AppLayout.tsx components/layout/Header.tsx components/layout/Sidebar.tsx components/layout/LayoutGate.tsx components/quote-compare/QuoteCompareTable.tsx components/ui/WorkspaceMotion.tsx components/ui/WorkspaceShell.tsx components/workbench scripts/test-workbench-redesign.tsx docs/TEST_PLAN.md package.json package-lock.json
git commit -m "feat: rebuild procurement workbench UI"
```

Do not stage:

- local `.env`
- SQLite files or backups
- local logs
- unrelated `.claude`, `.vscode`, scratch files

---

## Execution Recommendation

Use Subagent-Driven execution for Tasks 1-8 only if the user explicitly approves subagents. Otherwise execute inline with checkpoints:

1. Checkpoint after Task 2: shell visible.
2. Checkpoint after Task 4: homepage resembles sketch.
3. Checkpoint after Task 6: key pages migrated.
4. Checkpoint after Task 8: verified and ready for commit.

The highest-risk phase is Task 4 because it sets the visual standard. Do not continue migrating other pages until the homepage first viewport is approved against the sketch.
