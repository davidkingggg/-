interface DashboardCardProps {
  label: string
  value: number | string
  description?: string
  tone?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'violet'
}

const toneClasses = {
  blue: 'border-blue-100 bg-blue-50/70 text-blue-700',
  emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
  red: 'border-red-100 bg-red-50/70 text-red-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  violet: 'border-violet-100 bg-violet-50/70 text-violet-700',
}

export default function DashboardCard({ label, value, description, tone = 'slate' }: DashboardCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-2 text-3xl font-bold leading-none">{value}</div>
      {description ? <div className="mt-2 text-xs leading-5 opacity-80">{description}</div> : null}
    </div>
  )
}
