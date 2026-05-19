'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './ClientProviders';
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
  Settings
} from 'lucide-react';

const menuGroups = [
  {
    label: '宸ヤ綔鍙?,
    items: [
      { name: '棣栭〉浠〃鐩?, path: '/', icon: LayoutDashboard },
      { name: '寰呭姙涓績', path: '/tasks', icon: CheckCircle2 },
    ],
  },
  {
    label: '閲囪喘绠＄悊',
    items: [
      { name: '鍝佺被涓績', path: '/categories', icon: Layers },
      { name: '鍝佺被璧勬枡鍖?, path: '/category-package', icon: FolderArchive },
      { name: '渚涘簲鍟嗗簱', path: '/suppliers', icon: Factory },
      { name: '鎶ヤ环绠＄悊', path: '/quotes', icon: FileSpreadsheet },
      { name: '鎶ヤ环瀵规瘮', path: '/quote-compare', icon: Scale },
      { name: '渚涘簲鍟嗚瘎鍒?, path: '/scores', icon: Award },
      { name: '璋冪爺/鑰冨療璁板綍', path: '/investigations', icon: SearchCode },
    ],
  },
  {
    label: '鎵ц鐪嬫澘',
    items: [
      { name: '渚涘簲鍟嗗紑鍙戠湅鏉?, path: '/development-board', icon: GitFork },
      { name: '閲囪喘鎵ц鐪嬫澘', path: '/purchase-board', icon: ShoppingCart },
      { name: '缁忚惀椹鹃┒鑸?, path: '/boss-report', icon: TrendingUp },
      { name: '閿€鍞?鍟嗗姟璧勬枡', path: '/sales-materials', icon: BookOpen },
      { name: '琛屾斂浜嬮」', path: '/admin-tasks', icon: CalendarClock },
    ],
  },
  {
    label: '绯荤粺宸ュ叿',
    items: [
      { name: '浜哄憳绠＄悊', path: '/people', icon: Users },
      { name: '鏁版嵁瀵煎叆瀵煎嚭', path: '/data', icon: Download },
      { name: '鏁版嵁璐ㄩ噺', path: '/data-quality', icon: ShieldAlert },
      { name: '鏈湴澶囦唤鎭㈠', path: '/backup', icon: Database },
      { name: '褰掓。绠＄悊', path: '/archive', icon: Archive },
      { name: '闄勪欢璺緞涓績', path: '/attachments', icon: Paperclip },
      { name: '绯荤粺璁剧疆', path: '/settings', icon: Settings },
      { name: '鐢ㄦ埛绠＄悊', path: '/users', icon: Users, adminOnly: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="w-[220px] bg-[#0b0f19] text-slate-400 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto border-r border-white/5 premium-transition">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
            <Factory className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-display font-extrabold text-white tracking-wide leading-none">渚涢噰绠″</h2>
            <p className="text-[10px] text-slate-500 mt-1 font-medium leading-none">鏈湴浼樺厛 路 閲囪喘绯荤粺</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500/90">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items
                .filter((item) => !('adminOnly' in item) || (user?.isAdmin))
                .map((item) => {
                  const isActive = pathname === item.path;
                  const IconComponent = item.icon;
                  return (
                    <li key={item.path} className="relative group/item">
                      {/* Active indicator bar */}
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
                        <IconComponent className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover/item:translate-x-0.5 group-hover/item:text-slate-200'
                        }`} />
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
      <div className="px-6 py-3.5 text-[10px] font-bold text-slate-600/80 border-t border-white/5 bg-slate-950/10">
        v0.9.4 路 PRIVATE LOCAL
      </div>
    </aside>
  );
}
