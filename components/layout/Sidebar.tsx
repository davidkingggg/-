'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { name: '首页仪表盘', path: '/' },
  { name: '待办中心', path: '/tasks' },
  { name: '品类中心', path: '/categories' },
  { name: '供应商库', path: '/suppliers' },
  { name: '报价管理', path: '/quotes' },
  { name: '报价对比', path: '/quote-compare' },
  { name: '供应商评分', path: '/scores' },
  { name: '调研/考察记录', path: '/investigations' },
  { name: '供应商开发看板', path: '/development-board' },
  { name: '采购执行看板', path: '/purchase-board' },
  { name: '老板汇报', path: '/boss-report' },
  { name: '销售/商务资料', path: '/sales-materials' },
  { name: '行政事项', path: '/admin-tasks' },
  { name: '人员管理', path: '/people' },
  { name: '数据导入导出', path: '/data' },
  { name: '数据质量', path: '/data-quality' },
  { name: '本地备份恢复', path: '/backup' },
  { name: '归档管理', path: '/archive' },
  { name: '附件路径中心', path: '/attachments' },
  { name: '品类资料包', path: '/category-package' },
  { name: '系统设置', path: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="p-4 bg-slate-950">
        <h2 className="text-xl font-bold text-white tracking-wide">集成采购平台</h2>
        <p className="text-xs text-slate-500 mt-1">本地工作库</p>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800">
        v0.9.2 (本地优先)
      </div>
    </aside>
  );
}
