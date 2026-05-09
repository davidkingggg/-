'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Score {
  id: string
  supplierId: string
  supplier: { name: string }
  category: { name: string }
  scorer: { name: string }
  scoreDate: string
  totalScore: number
  systemLevel: string
  manualLevel: string | null
  finalLevel: string
  scoreReason: string | null
}

const LEVEL_OPTIONS = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']

export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([])
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [archiveTarget, setArchiveTarget] = useState<Score | null>(null)

  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFinalLevel, setFilterFinalLevel] = useState('')

  const { showToast } = useToast()
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers).catch(() => {})
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (filterSupplier) params.set('supplierId', filterSupplier)
        if (filterCategory) params.set('categoryId', filterCategory)
        if (filterFinalLevel) params.set('finalLevel', filterFinalLevel)
        
        const res = await fetch(`/api/scores?${params.toString()}`)
        if (!res.ok) throw new Error()
        setScores(await res.json())
      } catch {
        showToast('获取评分列表失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filterSupplier, filterCategory, filterFinalLevel, reloadKey, showToast])

  async function handleArchive() {
    if (!archiveTarget) return
    try {
      const res = await fetch(`/api/scores/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('评分已归档', 'success')
      setReloadKey(k => k + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '归档失败', 'error')
    }
  }

  const recColors: Record<string, string> = {
    'A优先推荐': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'B备选': 'bg-blue-50 text-blue-700 border border-blue-200',
    'C暂不推荐': 'bg-orange-50 text-orange-700 border border-orange-200',
    '未评级': 'bg-gray-50 text-gray-500 border border-gray-200',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">供应商评分</h1>
          <p className="text-sm text-gray-500 mt-1">自动计算得分与推荐等级，提供客观决策依据</p>
        </div>
        <Link
          href="/scores/new"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm inline-block"
        >
          + 新增评分
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部供应商</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部品类</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterFinalLevel}
          onChange={(e) => setFilterFinalLevel(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">全部评级</option>
          {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : scores.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无评分记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">日期</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">供应商</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">品类</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">总分</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">系统等级</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">最终等级</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600">评分人</th>
                  <th className="text-right px-6 py-3.5 font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{new Date(s.scoreDate).toLocaleDateString()}</td>
                    <td className="px-4 py-4 font-medium text-gray-800">
                      <Link href={`/suppliers/${s.supplierId}`} className="hover:text-blue-600 transition-colors">
                        {s.supplier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{s.category.name}</td>
                    <td className="px-4 py-4 font-medium text-gray-800">{Number(s.totalScore).toFixed(1)}</td>
                    <td className="px-4 py-4 text-gray-600">{s.systemLevel}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${recColors[s.finalLevel] || ''}`}>
                        {s.finalLevel}
                      </span>
                      {s.manualLevel && <span className="ml-2 text-xs text-orange-500">(手动调整)</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{s.scorer.name}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/scores/${s.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-medium"
                      >
                        编辑
                      </Link>
                      <button
                        onClick={() => setArchiveTarget(s)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        归档
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="确认归档评分"
        message={`确定要归档此评分吗？归档后将不再显示，供应商的评级将回退到上一个未归档的记录。`}
        confirmText="确认归档"
      />
    </div>
  )
}
