'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuGroups = [
  {
    label: '工作台',
    items: [
      { name: '首页仪表盘', path: '/', icon: '📊' },
      { name: '待办中心', path: '/tasks', icon: '✅' },
    ],
  },
  {
    label: '采购管理',
    items: [
      { name: '品类中心', path: '/categories', icon: '📦' },
      { name: '品类资料包', path: '/category-package', icon: '📁' },
      { name: '供应商库', path: '/suppliers', icon: '🏭' },
      { name: '报价管理', path: '/quotes', icon: '📋' },
      { name: '报价对比', path: '/quote-compare', icon: '⚖️' },
      { name: '供应商评分', path: '/scores', icon: '⭐' },
      { name: '调研/考察记录', path: '/investigations', icon: '🔍' },
    ],
  },
  {
    label: '执行看板',
    items: [
      { name: '供应商开发看板', path: '/development-board', icon: '🚀' },
      { name: '采购执行看板', path: '/purchase-board', icon: '🛒' },
      { name: '经营驾驶舱', path: '/boss-report', icon: '📈' },
      { name: '销售/商务资料', path: '/sales-materials', icon: '📑' },
      { name: '行政事项', path: '/admin-tasks', icon: '📝' },
    ],
  },
  {
    label: '系统工具',
    items: [
      { name: '人员管理', path: '/people', icon: '👥' },
      { name: '数据导入导出', path: '/data', icon: '📥' },
      { name: '数据质量', path: '/data-quality', icon: '🔍' },
      { name: '本地备份恢复', path: '/backup', icon: '💾' },
      { name: '归档管理', path: '/archive', icon: '🗂️' },
      { name: '附件路径中心', path: '/attachments', icon: '📎' },
      { name: '系统设置', path: '/settings', icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] bg-[#0f172a] text-slate-300 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🏭</span>
          <div>
            <h2 className="text-[15px] font-bold text-white tracking-wide">供采管家</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">本地优先 · 供应商与采购管理</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <div className="px-5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </div>
            <ul className="space-y-0.5 px-3">
              {group.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`flex items-center gap-2.5 h-[38px] px-3.5 rounded-[10px] text-[14px] transition-colors ${
                        isActive
                          ? 'bg-[#2563eb] text-white font-medium'
                          : 'hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 text-[11px] text-slate-600 border-t border-white/5">
        v0.9.4 · 本地优先
      </div>
    </aside>
  );
}
