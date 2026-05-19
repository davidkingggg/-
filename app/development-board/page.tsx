'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { DEVELOPMENT_STAGES, DEVELOPMENT_STATUSES, PRIORITIES } from '@/lib/workflow-constants'
import DevelopmentProcessForm from '@/components/workflow/DevelopmentProcessForm'
import { useWorkflowLookups } from '@/components/workflow/useWorkflowLookups'

interface ProcessItem {
  id: string;
  currentStage: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  currentProblem: string | null;
  nextAction: string | null;
  needBossDecision: boolean;
  supplier: { id: string; name: string };
  category: { id: string; name: string };
  owner: { id: string; name: string };
}

function DevelopmentBoardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const { people } = useWorkflowLookups()

  const [items, setItems] = useState<ProcessItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set(DEVELOPMENT_STAGES))

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleStage = (stage: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }

  // Filters
  const [filterOwnerId, setFilterOwnerId] = useState(searchParams.get('ownerId') || '')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '进行中')
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') || '')

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProcessItem | null>(null)
  const [archiveItem, setArchiveItem] = useState<ProcessItem | null>(null)

  const initialSupplierId = searchParams.get('supplierId') || ''
  const initialCategoryId = searchParams.get('categoryId') || ''
  const autoOpen = searchParams.get('autoOpen') === 'true'

  useEffect(() => {
    if (autoOpen) {
      setFormOpen(true)
      // Clean up URL to avoid reopening on refresh
      router.replace('/development-board', undefined)
    }
  }, [autoOpen, router])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterOwnerId) params.append('ownerId', filterOwnerId)
      if (filterStatus) params.append('status', filterStatus)
      if (filterPriority) params.append('priority', filterPriority)

      const res = await fetch(`/api/development-processes?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load')
      setItems(await res.json())
    } catch {
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterOwnerId, filterStatus, filterPriority, showToast])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleQuickUpdate = async (id: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/development-processes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      if (!res.ok) throw new Error('更新失败')
      showToast('状态更新成功', 'success')
      loadItems()
    } catch {
      showToast('状态更新失败', 'error')
    }
  }

  const handleArchive = async () => {
    if (!archiveItem) return
    try {
      const res = await fetch(`/api/development-processes/${archiveItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })
      if (!res.ok) throw new Error('归档失败')
      showToast('归档成功', 'success')
      setArchiveItem(null)
      loadItems()
    } catch {
      showToast('归档失败', 'error')
    }
  }

  const groupedItems = DEVELOPMENT_STAGES.reduce((acc, stage) => {
    acc[stage] = items.filter(item => item.currentStage === stage)
    return acc
  }, {} as Record<string, ProcessItem[]>)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">供应商开发看板</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">管理新供应商开发阶段与进度</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setFormOpen(true); }}
          className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm shrink-0"
        >
          + 新增开发流程
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-[#e5eaf3] p-4 mb-6 shrink-0 flex gap-4" style={{ boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)' }}>
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">负责人</label>
          <select className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={filterOwnerId} onChange={e => setFilterOwnerId(e.target.value)}>
            <option value="">全部</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">状态</label>
          <select className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部</option>
            {DEVELOPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">优先级</label>
          <select className="h-9 px-3 rounded-xl border border-[#e5eaf3] bg-white text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">全部</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-2 h-full items-start" style={{ width: 'max-content' }}>
          {DEVELOPMENT_STAGES.map(stage => {
            const isStageCollapsed = collapsedStages.has(stage)
            if (isStageCollapsed) {
              return (
                <div
                  key={stage}
                  className="bg-gray-100/50 rounded-lg border border-gray-200 shrink-0 cursor-pointer hover:bg-gray-200/60 transition-colors flex flex-col items-center py-4 px-2 h-full max-h-full justify-center gap-2"
                  onClick={() => toggleStage(stage)}
                  title={`展开「${stage}」`}
                >
                  <span className="text-sm font-semibold text-gray-600" style={{ writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>{stage}</span>
                  <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full shadow-sm">{groupedItems[stage]?.length || 0}</span>
                </div>
              )
            }
            return (
            <div key={stage} className="w-72 bg-gray-100/50 rounded-xl flex flex-col h-full max-h-full border border-gray-200 shrink-0">
              <div className="p-2.5 border-b border-gray-200 bg-gray-100 rounded-t-xl flex justify-between items-center shrink-0 cursor-pointer hover:bg-gray-200/60 transition-colors" onClick={() => toggleStage(stage)}>
                <h3 className="font-semibold text-gray-700 text-sm">{stage}</h3>
                <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full shadow-sm">{groupedItems[stage]?.length || 0}</span>
              </div>

              <div className="p-2.5 overflow-y-auto flex-1 space-y-2">
                {loading ? <div className="text-center text-sm text-gray-400 py-4">加载中...</div> :                  groupedItems[stage]?.map(item => {
                  const isExpanded = expandedCards.has(item.id)
                  return (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow">
                    {/* Collapsed summary - always visible */}
                    <div
                      className="p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCard(item.id)}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="font-medium text-gray-800 text-xs truncate flex-1">{item.supplier.name}</h4>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {item.needBossDecision && <span className="bg-red-100 text-red-700 text-[10px] px-1 py-0.5 rounded font-medium">需决策</span>}
                          <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">{item.category.name}</div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-2.5 pb-2.5 border-t border-gray-100">
                        <div className="flex gap-1.5 text-[11px] flex-wrap mt-2 mb-2">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.owner?.name || '无负责人'}</span>
                          <span className={`px-1.5 py-0.5 rounded ${item.priority === '高' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{item.priority || '中'}</span>
                          {item.dueDate && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{new Date(item.dueDate).toLocaleDateString().slice(5)} 截止</span>}
                        </div>

                        {(item.currentProblem || item.nextAction) && (
                          <div className="text-[11px] bg-gray-50 p-2 rounded mb-2 space-y-1">
                            {item.currentProblem && <div className="text-gray-700"><span className="text-gray-400">问题:</span> {item.currentProblem}</div>}
                            {item.nextAction && <div className="text-gray-700"><span className="text-gray-400">动作:</span> {item.nextAction}</div>}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <select
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-gray-50 text-gray-600 hover:bg-white w-24"
                            value={item.currentStage}
                            onChange={(e) => handleQuickUpdate(item.id, 'currentStage', e.target.value)}
                          >
                            {DEVELOPMENT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>

                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setFormOpen(true); }} className="text-xs text-blue-600 hover:underline">编辑</button>
                            <button onClick={(e) => { e.stopPropagation(); setArchiveItem(item); }} className="text-xs text-gray-400 hover:text-red-600">归档</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })}
                {!loading && groupedItems[stage]?.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    暂无流程
                  </div>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingItem ? '编辑开发流程' : '新增开发流程'}>
        <DevelopmentProcessForm
          initialData={editingItem}
          initialSupplierId={initialSupplierId}
          initialCategoryId={initialCategoryId}
          onSaved={() => { setFormOpen(false); loadItems(); }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!archiveItem}
        onClose={() => setArchiveItem(null)}
        onConfirm={handleArchive}
        title="确认归档"
        message={`确定要归档供应商「${archiveItem?.supplier.name}」的开发流程吗？归档后将在看板中隐藏。`}
        confirmText="确认归档"
      />
    </div>
  )
}

export default function DevelopmentBoardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <DevelopmentBoardContent />
    </Suspense>
  )
}
