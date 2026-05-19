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
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-500',
    accent: 'bg-blue-500',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-500',
    accent: 'bg-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-500',
    accent: 'bg-amber-500',
  },
  red: {
    iconBg: 'bg-red-50',
    iconText: 'text-red-500',
    accent: 'bg-red-500',
  },
  slate: {
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-500',
    accent: 'bg-slate-400',
  },
  violet: {
    iconBg: 'bg-violet-50',
    iconText: 'text-violet-500',
    accent: 'bg-violet-500',
  },
  orange: {
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-500',
    accent: 'bg-orange-500',
  },
}

export default function DashboardCard({ label, value, description, tone = 'slate', icon, compact }: DashboardCardProps) {
  const s = toneStyles[tone]
  return (
    <div className={`relative overflow-hidden rounded-[18px] bg-white border border-[#e5eaf3] transition-shadow hover:shadow-md ${compact ? 'min-h-[88px] p-4' : 'min-h-[112px] p-5'}`}
      style={{ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.accent} rounded-l-[18px]`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pl-2">
          <div className="text-[13px] font-medium text-[#64748b]">{label}</div>
          <div className={`mt-2.5 font-extrabold leading-none tracking-tight text-[#0f172a] ${compact ? 'text-[26px]' : 'text-[32px]'}`}>{value}</div>
          {description ? <div className="mt-2 text-[11px] leading-snug text-slate-400">{description}</div> : null}
        </div>
        {icon && (
          <div className={`shrink-0 w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
            <span className={`text-lg ${s.iconText}`}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}
