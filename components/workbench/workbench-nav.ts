import {
  Archive,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Database,
  Download,
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
  Users,
  WalletCards,
} from 'lucide-react'
import type { WorkbenchNavGroup, WorkbenchTab } from './workbench-types'

export const workbenchTabs: WorkbenchTab[] = [
  { label: '工作台', href: '/', aliases: ['/tasks'] },
  {
    label: '供应商管理',
    href: '/suppliers',
    aliases: ['/categories', '/scores', '/investigations', '/development-board'],
  },
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
      { label: '品类资料包', href: '/category-package', icon: FolderArchive },
      { label: '供应商评分', href: '/scores', icon: Award },
      { label: '数据看板', href: '/boss-report', icon: BarChart3 },
      { label: '销售商务资料', href: '/sales-materials', icon: BookOpen },
      { label: '数据中心', href: '/data', icon: Download },
      { label: '风险与合规', href: '/data-quality', icon: ShieldAlert },
    ],
  },
  {
    label: '协同与系统',
    items: [
      { label: '行政事项', href: '/admin-tasks', icon: CalendarClock },
      { label: '行政事项归档', href: '/admin-task-archive', icon: Archive },
      { label: '人员管理', href: '/people', icon: Users },
      { label: '调研考察', href: '/investigations', icon: SearchCode },
      { label: '本地备份恢复', href: '/backup', icon: Database },
      { label: '归档管理', href: '/archive', icon: Archive },
      { label: '附件路径中心', href: '/attachments', icon: Paperclip },
      { label: '系统管理', href: '/settings', icon: Settings },
      { label: '用户管理', href: '/users', icon: Users, adminOnly: true },
      { label: 'Agent Token', href: '/agent-tokens', icon: KeyRound, adminOnly: true },
    ],
  },
]
