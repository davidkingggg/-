import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { workbenchNavGroups, workbenchTabs } from '../components/workbench/workbench-nav'

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
assert(nav.length > 0, 'workbench-nav.ts must be readable')
assert.deepEqual(
  workbenchTabs.map((tab) => ({ label: tab.label, href: tab.href, aliases: tab.aliases })),
  [
    { label: '工作台', href: '/', aliases: ['/tasks'] },
    {
      label: '供应商管理',
      href: '/suppliers',
      aliases: ['/categories', '/scores', '/investigations', '/development-board'],
    },
    { label: '询价管理', href: '/quote-compare', aliases: ['/quotes'] },
    { label: '采购执行', href: '/purchase-board', aliases: undefined },
    { label: '合同台账', href: '/attachments', aliases: ['/archive'] },
    { label: '数据看板', href: '/boss-report', aliases: ['/data-quality', '/category-package'] },
  ],
  'top workspace tabs must match the workbench contract',
)
assert.deepEqual(
  workbenchNavGroups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      label: item.label,
      href: item.href,
      adminOnly: item.adminOnly,
    })),
  })),
  [
    {
      label: '核心工作',
      items: [
        { label: '工作台', href: '/', adminOnly: undefined },
        { label: '需求管理', href: '/tasks', adminOnly: undefined },
        { label: '采购计划', href: '/development-board', adminOnly: undefined },
        { label: '供应商库', href: '/suppliers', adminOnly: undefined },
        { label: '询价管理', href: '/quotes', adminOnly: undefined },
        { label: '报价对比', href: '/quote-compare', adminOnly: undefined },
        { label: '采购执行', href: '/purchase-board', adminOnly: undefined },
        { label: '合同管理', href: '/attachments', adminOnly: undefined },
      ],
    },
    {
      label: '经营与数据',
      items: [
        { label: '品类中心', href: '/categories', adminOnly: undefined },
        { label: '品类资料包', href: '/category-package', adminOnly: undefined },
        { label: '供应商评分', href: '/scores', adminOnly: undefined },
        { label: '数据看板', href: '/boss-report', adminOnly: undefined },
        { label: '销售商务资料', href: '/sales-materials', adminOnly: undefined },
        { label: '数据中心', href: '/data', adminOnly: undefined },
        { label: '风险与合规', href: '/data-quality', adminOnly: undefined },
      ],
    },
    {
      label: '协同与系统',
      items: [
        { label: '行政事项', href: '/admin-tasks', adminOnly: undefined },
        { label: '行政事项归档', href: '/admin-task-archive', adminOnly: undefined },
        { label: '人员管理', href: '/people', adminOnly: undefined },
        { label: '调研考察', href: '/investigations', adminOnly: undefined },
        { label: '本地备份恢复', href: '/backup', adminOnly: undefined },
        { label: '归档管理', href: '/archive', adminOnly: undefined },
        { label: '附件路径中心', href: '/attachments', adminOnly: undefined },
        { label: '系统管理', href: '/settings', adminOnly: undefined },
        { label: '用户管理', href: '/users', adminOnly: true },
        { label: 'Agent Token', href: '/agent-tokens', adminOnly: true },
      ],
    },
  ],
  'sidebar navigation groups must match the workbench contract',
)

const requiredLegacyRoutes = [
  '/',
  '/tasks',
  '/categories',
  '/category-package',
  '/suppliers',
  '/quotes',
  '/quote-compare',
  '/scores',
  '/investigations',
  '/development-board',
  '/purchase-board',
  '/boss-report',
  '/sales-materials',
  '/admin-tasks',
  '/admin-task-archive',
  '/people',
  '/data',
  '/data-quality',
  '/backup',
  '/archive',
  '/attachments',
  '/settings',
  '/users',
  '/agent-tokens',
]
const navRoutes = new Set(workbenchNavGroups.flatMap((group) => group.items.map((item) => item.href)))
for (const route of requiredLegacyRoutes) {
  assert(navRoutes.has(route), `workbench sidebar must keep legacy route ${route}`)
}

const packageJson = JSON.parse(read('package.json')) as { scripts?: { test?: string } }
assert(
  packageJson.scripts?.test?.includes('scripts/test-workbench-redesign.tsx'),
  'npm test must include workbench redesign contract checks',
)

console.log('workbench redesign contracts passed')
