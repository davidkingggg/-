'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { PURCHASE_STAGES, PURCHASE_STATUSES, PRIORITIES } from '@/lib/workflow-constants'
import PurchaseProcessForm from '@/components/workflow/PurchaseProcessForm'
import { useWorkflowLookups } from '@/components/workflow/useWorkflowLookups'

interface ProcessItem {
  id: string;
  title: string;
  currentStage: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  currentProblem: string | null;
  nextAction: string | null;
  needBossDecision: boolean;
  purchaseAmount: number | null;
  supplier: { id: string; name: string };
  category: { id: string; name: string };
  owner: { id: string; name: string };
  requester?: { id: string; name: string };
  salesPerson?: { id: string; name: string };
}

function PurchaseBoardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const { people } = useWorkflowLookups()

  const [items, setItems] = useState<ProcessItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterOwnerId, setFilterOwnerId] = useState(searchParams.get('ownerId') || '')
  const [filterRequesterId, setFilterRequesterId] = useState(searchParams.get('requesterId') || '')
  const [filterSalesPersonId, setFilterSalesPersonId] = useState(searchParams.get('salesPersonId') || '')
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
      router.replace('/purchase-board', undefined)
    }
  }, [autoOpen, router])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterOwnerId) params.append('ownerId', filterOwnerId)
      if (filterRequesterId) params.append('requesterId', filterRequesterId)
      if (filterSalesPersonId) params.append('salesPersonId', filterSalesPersonId)
      if (filterStatus) params.append('status', filterStatus)
      if (filterPriority) params.append('priority', filterPriority)

      const res = await fetch(`/api/purchase-processes?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load')
      setItems(await res.json())
    } catch (e) {
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterOwnerId, filterRequesterId, filterSalesPersonId, filterStatus, filterPriority, showToast])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleQuickUpdate = async (id: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/purchase-processes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      if (!res.ok) throw new Error('更新失败')
      showToast('状态更新成功', 'success')
      loadItems()
    } catch (e) {
      showToast('状态更新失败', 'error')
    }
  }

  const handleArchive = async () => {
    if (!archiveItem) return
    try {
      const res = await fetch(`/api/purchase-processes/${archiveItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })
      if (!res.ok) throw new Error('归档失败')
      showToast('归档成功', 'success')
      setArchiveItem(null)
      loadItems()
    } catch (e) {
      showToast('归档失败', 'error')
    }
  }

  const groupedItems = PURCHASE_STAGES.reduce((acc, stage) => {
    acc[stage] = items.filter(item => item.currentStage === stage)
    return acc
  }, {} as Record<string, ProcessItem[]>)

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">采购执行看板</h1>
          <p className="text-sm text-gray-500 mt-1">跟踪日常采购事项进度</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setFormOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + 新增采购事项
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 shrink-0 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">负责人</label>
          <select className="border border-gray-200 rounded px-2 py-1 text-sm min-w-32" value={filterOwnerId} onChange={e => setFilterOwnerId(e.target.value)}>
            <option value="">全部</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">需求提交人</label>
          <select className="border border-gray-200 rounded px-2 py-1 text-sm min-w-32" value={filterRequesterId} onChange={e => setFilterRequesterId(e.target.value)}>
            <option value="">全部</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">销售配合</label>
          <select className="border border-gray-200 rounded px-2 py-1 text-sm min-w-32" value={filterSalesPersonId} onChange={e => setFilterSalesPersonId(e.target.value)}>
            <option value="">全部</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">状态</label>
          <select className="border border-gray-200 rounded px-2 py-1 text-sm min-w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部</option>
            {PURCHASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">优先级</label>
          <select className="border border-gray-200 rounded px-2 py-1 text-sm min-w-32" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">全部</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 h-full items-start" style={{ width: 'max-content' }}>
          {PURCHASE_STAGES.map(stage => (
            <div key={stage} className="w-80 bg-gray-100/50 rounded-xl flex flex-col h-full max-h-full border border-gray-200 shrink-0">
              <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-xl flex justify-between items-center shrink-0">
                <h3 className="font-semibold text-gray-700">{stage}</h3>
                <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full shadow-sm">{groupedItems[stage]?.length || 0}</span>
              </div>

              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                {loading ? <div className="text-center text-sm text-gray-400 py-4">加载中...</div> :                  groupedItems[stage]?.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800 text-sm truncate" title={item.title}>{item.title}</h4>
                      {item.needBossDecision && <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2">需决策</span>}
                    </div>
                    <div className="text-xs text-gray-500 mb-2 truncate" title={item.supplier.name}>{item.supplier.name}</div>
                    {item.purchaseAmount !== null && (
                      <div className="text-xs font-medium text-blue-700 mb-2">金额: ¥{Number(item.purchaseAmount).toLocaleString()}</div>
                    )}

                    <div className="flex gap-2 text-xs mb-3 flex-wrap">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.owner?.name || '无负责人'}</span>
                      <span className={`px-1.5 py-0.5 rounded ${item.priority === '高' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{item.priority || '中'}</span>
                      {item.dueDate && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{new Date(item.dueDate).toLocaleDateString().slice(5)} 截止</span>}
                    </div>

                    {(item.currentProblem || item.nextAction) && (
                      <div className="text-xs bg-gray-50 p-2 rounded mb-3 space-y-1">
                        {item.currentProblem && <div className="text-gray-700 truncate" title={item.currentProblem}><span className="text-gray-400">问题:</span> {item.currentProblem}</div>}
                        {item.nextAction && <div className="text-gray-700 truncate" title={item.nextAction}><span className="text-gray-400">动作:</span> {item.nextAction}</div>}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <select
                        className="text-xs border border-gray-200 rounded px-1 py-1 bg-gray-50 text-gray-600 hover:bg-white w-24"
                        value={item.currentStage}
                        onChange={(e) => handleQuickUpdate(item.id, 'currentStage', e.target.value)}
                      >
                        {PURCHASE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>

                      <div className="flex gap-2">
                        <button onClick={() => { setEditingItem(item); setFormOpen(true); }} className="text-xs text-blue-600 hover:underline">编辑</button>
                        <button onClick={() => setArchiveItem(item)} className="text-xs text-gray-400 hover:text-red-600">归档</button>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && groupedItems[stage]?.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    暂无流程
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingItem ? '编辑采购事项' : '新增采购事项'}>
        <PurchaseProcessForm
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
        message={`确定要归档采购事项「${archiveItem?.title}」吗？归档后将在看板中隐藏。`}
        confirmText="确认归档"
      />
    </div>
  )
}

export default function PurchaseBoardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <PurchaseBoardContent />
    </Suspense>
  )
}
