'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './ClientProviders'
import {
  LayoutDashboard,
  CheckCircle2,
  Layers,
  FolderArchive,
  Factory,
  FileSpreadsheet,
  Scale,
  Award,
  SearchCode,
  GitFork,
  ShoppingCart,
  TrendingUp,
  BookOpen,
  CalendarClock,
  Users,
  Download,
  ShieldAlert,
  Database,
  Archive,
  Paperclip,
  Settings,
} from 'lucide-react'

const menuGroups = [
  {
    label: '工作台',
    items: [
      { name: '首页仪表盘', path: '/', icon: LayoutDashboard },
      { name: '待办中心', path: '/tasks', icon: CheckCircle2 },
    ],
  },
  {
    label: '采购管理',
    items: [
      { name: '品类中心', path: '/categories', icon: Layers },
      { name: '品类资料包', path: '/category-package', icon: FolderArchive },
      { name: '供应商库', path: '/suppliers', icon: Factory },
      { name: '报价管理', path: '/quotes', icon: FileSpreadsheet },
      { name: '报价对比', path: '/quote-compare', icon: Scale },
      { name: '供应商评分', path: '/scores', icon: Award },
      { name: '调研/考察记录', path: '/investigations', icon: SearchCode },
    ],
  },
  {
    label: '执行看板',
    items: [
      { name: '供应商开发看板', path: '/development-board', icon: GitFork },
      { name: '采购执行看板', path: '/purchase-board', icon: ShoppingCart },
      { name: '经营驾驶舱', path: '/boss-report', icon: TrendingUp },
      { name: '销售/商务资料', path: '/sales-materials', icon: BookOpen },
      { name: '行政事项', path: '/admin-tasks', icon: CalendarClock },
    ],
  },
  {
    label: '系统工具',
    items: [
      { name: '人员管理', path: '/people', icon: Users },
      { name: '数据导入导出', path: '/data', icon: Download },
      { name: '数据质量', path: '/data-quality', icon: ShieldAlert },
      { name: '本地备份恢复', path: '/backup', icon: Database },
      { name: '归档管理', path: '/archive', icon: Archive },
      { name: '附件路径中心', path: '/attachments', icon: Paperclip },
      { name: '系统设置', path: '/settings', icon: Settings },
      { name: '用户管理', path: '/users', icon: Users, adminOnly: true },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside className="w-[220px] bg-[#0b0f19] text-slate-400 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto border-r border-white/5 premium-transition">
      <div className="px-5 py-5 border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
            <Factory className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-display font-extrabold text-white tracking-wide leading-none">供采管家</h2>
            <p className="text-[10px] text-slate-500 mt-1 font-medium leading-none">本地优先 · 采购系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500/90">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items
                .filter((item) => !('adminOnly' in item) || user?.isAdmin)
                .map((item) => {
                  const isActive = pathname === item.path
                  const IconComponent = item.icon
                  return (
                    <li key={item.path} className="relative group/item">
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-blue-400 rounded-full" />
                      )}

                      <Link
                        href={item.path}
                        className={`flex items-center gap-2.5 h-[36px] px-3.5 rounded-lg text-[13px] font-medium transition-all duration-200 active-shrink-sm ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600/90 to-blue-500/90 text-white shadow-sm shadow-blue-500/10 font-semibold'
                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                        }`}
                      >
                        <IconComponent
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 group-hover/item:translate-x-0.5 group-hover/item:text-slate-200'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-6 py-3.5 text-[10px] font-bold text-slate-600/80 border-t border-white/5 bg-slate-950/10">
        v0.9.4 · PRIVATE LOCAL
      </div>
    </aside>
  )
}
