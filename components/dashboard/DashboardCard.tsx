import React from 'react'
import {
  Factory,
  Award,
  Layers,
  FileSpreadsheet,
  ShieldAlert,
  Zap,
  Clock,
  Edit3
} from 'lucide-react'

interface DashboardCardProps {
  label: string
  value: number | string
  description?: string
  tone?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'violet' | 'orange'
  icon?: string
  compact?: boolean
}

const toneStyles = {
  blue: {
    iconBg: 'bg-blue-50/60 ring-1 ring-blue-500/10',
    iconText: 'text-blue-600',
    glowColor: 'rgba(59, 130, 246, 0.06)',
    glowHover: 'rgba(59, 130, 246, 0.12)',
  },
  emerald: {
    iconBg: 'bg-emerald-50/60 ring-1 ring-emerald-500/10',
    iconText: 'text-emerald-600',
    glowColor: 'rgba(16, 185, 129, 0.06)',
    glowHover: 'rgba(16, 185, 129, 0.12)',
  },
  amber: {
    iconBg: 'bg-amber-50/60 ring-1 ring-amber-500/10',
    iconText: 'text-amber-600',
    glowColor: 'rgba(245, 158, 11, 0.06)',
    glowHover: 'rgba(245, 158, 11, 0.12)',
  },
  red: {
    iconBg: 'bg-rose-50/60 ring-1 ring-rose-500/10',
    iconText: 'text-rose-600',
    glowColor: 'rgba(244, 63, 94, 0.06)',
    glowHover: 'rgba(244, 63, 94, 0.12)',
  },
  slate: {
    iconBg: 'bg-slate-100/80 ring-1 ring-slate-500/10',
    iconText: 'text-slate-600',
    glowColor: 'rgba(100, 116, 139, 0.06)',
    glowHover: 'rgba(100, 116, 139, 0.12)',
  },
  violet: {
    iconBg: 'bg-violet-50/60 ring-1 ring-violet-500/10',
    iconText: 'text-violet-600',
    glowColor: 'rgba(139, 92, 246, 0.06)',
    glowHover: 'rgba(139, 92, 246, 0.12)',
  },
  orange: {
    iconBg: 'bg-orange-50/60 ring-1 ring-orange-500/10',
    iconText: 'text-orange-600',
    glowColor: 'rgba(249, 115, 22, 0.06)',
    glowHover: 'rgba(249, 115, 22, 0.12)',
  },
}

// 鑷姩杞崲鑰佹棫 HTML 瀹炰綋鍥炬爣涓虹簿缇庣殑绾挎鐭㈤噺鍥炬爣
function renderSemanticIcon(iconStr?: string, toneClass?: string) {
  if (!iconStr) return null;

  const cl = `w-4 h-4 ${toneClass}`;

  if (iconStr.includes('9670') || iconStr === '鈼?) {
    return <Factory className={cl} />
  }
  if (iconStr.includes('9733') || iconStr === '鈽?) {
    return <Award className={cl} />
  }
  if (iconStr.includes('9830') || iconStr === '鈾?) {
    return <Layers className={cl} />
  }
  if (iconStr.includes('9998') || iconStr === '鉁?) {
    return <FileSpreadsheet className={cl} />
  }
  if (iconStr.includes('9888') || iconStr === '鈿?) {
    return <ShieldAlert className={cl} />
  }
  if (iconStr.includes('9889') || iconStr === '鈿?) {
    return <Zap className={cl} />
  }
  if (iconStr.includes('9200') || iconStr === '鈴?) {
    return <Clock className={cl} />
  }
  if (iconStr.includes('9997') || iconStr === '鉁?) {
    return <Edit3 className={cl} />
  }

  // Fallback as normal text (emoji)
  return <span className="text-sm">{iconStr}</span>;
}

export default function DashboardCard({ label, value, description, tone = 'slate', icon, compact }: DashboardCardProps) {
  const s = toneStyles[tone]

  return (
    <div
      className={`group relative overflow-hidden rounded-[20px] bg-white border border-slate-200/50 premium-transition hover:-translate-y-0.5 shadow-sm active-shrink-sm ${
        compact ? 'min-h-[88px] p-4' : 'min-h-[112px] p-5'
      }`}
      style={{
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.02)'
      }}
    >
      {/* Corner Ambient Glow Backlight */}
      <div
        className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl premium-transition opacity-70 group-hover:opacity-100"
        style={{
          background: s.glowColor,
          backgroundImage: `radial-gradient(circle, ${s.glowColor} 0%, transparent 70%)`
        }}
      />

      <div className="relative flex items-start justify-between gap-3 h-full">
        <div className="min-w-0 pl-1">
          <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
          <div className={`mt-2 font-display font-extrabold leading-none tracking-tight text-slate-800 ${
            compact ? 'text-2xl' : 'text-3xl'
          }`}>
            {value}
          </div>
          {description ? (
            <div className="mt-2 text-[10px] leading-snug text-slate-400/90 font-medium">
              {description}
            </div>
          ) : null}
        </div>

        {icon && (
          <div className={`shrink-0 w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center premium-transition group-hover:scale-105`}>
            {renderSemanticIcon(icon, s.iconText)}
          </div>
        )}
      </div>
    </div>
  )
}
