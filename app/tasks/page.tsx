'use client'

import { useEffect, useMemo, useState } from 'react'
import TaskFilters from '@/components/tasks/TaskFilters'
import TaskSection from '@/components/tasks/TaskSection'
import TaskSummaryCards from '@/components/tasks/TaskSummaryCards'
import type { LookupOption, TaskFiltersValue, TaskResponse } from '@/components/tasks/task-types'

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

export default function TasksPage() {
  const [filters, setFilters] = useState<TaskFiltersValue>(emptyFilters)
  const [data, setData] = useState<TaskResponse>(emptyResponse)
  const [categories, setCategories] = useState<LookupOption[]>([])
  const [people, setPeople] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">待办中心</h1>
        <p className="mt-1 text-sm text-gray-600">数据来自开发流程、采购流程和行政事项聚合，仅用于只读查看与来源跳转。</p>
      </div>

      <TaskSummaryCards summary={data.summary} />

      <TaskFilters
        value={filters}
        categories={categories}
        people={people}
        onChange={setFilters}
        onReset={() => setFilters(emptyFilters)}
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">待办数据加载中...</div>
      ) : (
        <div className="space-y-8">
          <TaskSection title="本周待办" items={data.sections.week} />
          <TaskSection title="超期待办" items={data.sections.overdue} />
          <TaskSection title="老板决策事项" items={data.sections.bossDecision} />
          <TaskSection title="销售配合事项" items={data.sections.salesSupport} />
          <TaskSection title="行政事项" items={data.sections.admin} />
        </div>
      )}
    </div>
  )
}
