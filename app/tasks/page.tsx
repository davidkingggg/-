'use client'

import { useEffect, useMemo, useState } from 'react'
import TaskFilters from '@/components/tasks/TaskFilters'
import TaskItemCard from '@/components/tasks/TaskItemCard'
import TaskSummaryCards from '@/components/tasks/TaskSummaryCards'
import type { LookupOption, TaskFiltersValue, TaskItem, TaskResponse } from '@/components/tasks/task-types'

const emptyFilters: TaskFiltersValue = {
  source: '',
  scope: '',
  priority: '',
  categoryId: '',
  ownerId: '',
  status: '',
  from: '',
  to: '',
}

const emptyResponse: TaskResponse = {
  meta: {
    personBound: false,
  },
  summary: {
    weekCount: 0,
    overdueCount: 0,
    bossDecisionCount: 0,
    salesSupportCount: 0,
    adminCount: 0,
  },
  sections: {
    week: [],
    overdue: [],
    bossDecision: [],
    salesSupport: [],
    admin: [],
  },
}

const quickTabs = [
  { key: 'all', label: '全部' },
  { key: 'overdue', label: '超期' },
  { key: 'week', label: '本周' },
  { key: 'highPriority', label: '高优先级' },
  { key: 'bossDecision', label: '老板决策' },
  { key: 'admin', label: '我的行政' },
]

export default function TasksPage() {
  const [filters, setFilters] = useState<TaskFiltersValue>(emptyFilters)
  const [data, setData] = useState<TaskResponse>(emptyResponse)
  const [categories, setCategories] = useState<LookupOption[]>([])
  const [people, setPeople] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'scope') params.set(key, value)
    })
    return params.toString()
  }, [filters])

  useEffect(() => {
    let ignore = false

    async function loadLookups() {
      try {
        const [categoryRes, peopleRes] = await Promise.all([fetch('/api/categories'), fetch('/api/people')])
        if (!categoryRes.ok || !peopleRes.ok) return

        const [categoryData, peopleData] = await Promise.all([categoryRes.json(), peopleRes.json()])
        if (!ignore) {
          setCategories(categoryData)
          setPeople(peopleData)
        }
      } catch {
        if (!ignore) {
          setCategories([])
          setPeople([])
        }
      }
    }

    loadLookups()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadTasks() {
      setLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/tasks${queryString ? `?${queryString}` : ''}`)
        const payload = await res.json()

        if (!res.ok) {
          throw new Error(payload.error || '获取待办数据失败')
        }

        if (!ignore) setData(payload)
      } catch (err) {
        if (!ignore) {
          setData(emptyResponse)
          setError(err instanceof Error ? err.message : '获取待办数据失败')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadTasks()
    return () => {
      ignore = true
    }
  }, [queryString])

  // Merge all sections into one list for client-side tab filtering
  const allTasks = useMemo(() => {
    const seen = new Set<string>()
    const result: TaskItem[] = []
    for (const section of Object.values(data.sections)) {
      for (const item of section) {
        const key = `${item.source}-${item.id}`
        if (!seen.has(key)) {
          seen.add(key)
          result.push(item)
        }
      }
    }
    return result
  }, [data])

  // Quick tab counts
  const tabCounts = useMemo(() => ({
    all: allTasks.length,
    overdue: data.summary.overdueCount,
    week: data.summary.weekCount,
    highPriority: allTasks.filter((t) => t.priority === '高').length,
    bossDecision: data.summary.bossDecisionCount,
    admin: data.summary.adminCount,
  }), [allTasks, data.summary])

  // Filtered tasks by active tab
  const filteredTasks = useMemo(() => {
    switch (activeTab) {
      case 'overdue':
        return allTasks.filter((t) => t.isOverdue)
      case 'week':
        return allTasks.filter((t) => t.isThisWeek)
      case 'highPriority':
        return allTasks.filter((t) => t.priority === '高')
      case 'bossDecision':
        return allTasks.filter((t) => t.needBossDecision)
      case 'admin':
        return allTasks.filter((t) => t.source === 'admin')
      default:
        return allTasks
    }
  }, [allTasks, activeTab])

  const publicTasks = useMemo(
    () => filteredTasks.filter((task) => task.source !== 'admin'),
    [filteredTasks],
  )
  const personalAdminTasks = useMemo(
    () => filteredTasks.filter((task) => task.source === 'admin'),
    [filteredTasks],
  )

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Clear scope filter since we do client-side tab filtering
    if (filters.scope) {
      setFilters((prev) => ({ ...prev, scope: '' }))
    }
  }

  return (
    <div style={{ background: '#f6f8fb', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px 48px' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
            待办中心
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: '#64748b' }}>
            公共采购待办与我的行政事项分开展示，既保留公共盘面，也保留个人视角。
          </p>
        </div>

        {/* 统计卡 */}
        <TaskSummaryCards summary={data.summary} activeTab={activeTab} onTabChange={handleTabChange} />

        {/* 快捷 Tab */}
        <div className="flex flex-wrap items-center gap-2" style={{ margin: '20px 0 16px' }}>
          {quickTabs.map((tab) => {
            const isActive = activeTab === tab.key
            const count = tabCounts[tab.key as keyof typeof tabCounts] ?? 0
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all"
                style={{
                  background: isActive ? '#2563eb' : '#fff',
                  color: isActive ? '#fff' : '#475569',
                  borderColor: isActive ? '#2563eb' : '#e2e8f0',
                }}
              >
                {tab.label}{' '}
                <span
                  className="ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                    color: isActive ? '#fff' : '#64748b',
                    minWidth: 20,
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* 筛选区 */}
        <TaskFilters
          value={filters}
          categories={categories}
          people={people}
          onChange={setFilters}
          onReset={() => setFilters(emptyFilters)}
        />

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && !data.meta.personBound && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            当前账号未绑定人员，待办中心仅显示公共采购待办；绑定人员后会自动显示“我的行政事项”。
          </div>
        )}

        {/* 任务列表 */}
        <div className="mt-5">
          {loading ? (
            <div
              className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500"
              style={{ borderColor: '#e5eaf3', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}
            >
              待办数据加载中...
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-6">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">公共采购待办</h2>
                    <p className="text-xs text-slate-400 mt-1">供应商开发、采购执行和老板决策等公共协同事项。</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {publicTasks.length} 项
                  </span>
                </div>
                {publicTasks.length > 0 ? (
                  <div className="space-y-3">
                    {publicTasks.map((item) => (
                      <TaskItemCard key={`${item.source}-${item.id}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-400"
                    style={{ borderColor: '#e5eaf3', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}
                  >
                    当前筛选条件下暂无公共采购待办
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">我的行政事项</h2>
                    <p className="text-xs text-slate-400 mt-1">仅展示当前登录账号绑定人员名下的个人行政事项。</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    {personalAdminTasks.length} 项
                  </span>
                </div>
                {personalAdminTasks.length > 0 ? (
                  <div className="space-y-3">
                    {personalAdminTasks.map((item) => (
                      <TaskItemCard key={`${item.source}-${item.id}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-400"
                    style={{ borderColor: '#e5eaf3', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}
                  >
                    {data.meta.personBound ? '当前筛选条件下暂无我的行政事项' : '绑定人员后，这里会显示你的个人行政事项'}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-400"
              style={{ borderColor: '#e5eaf3', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}
            >
              暂无待办事项
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
