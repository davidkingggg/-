'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { PURCHASE_STAGES, PURCHASE_STATUSES, PRIORITIES } from '@/lib/workflow-constants'
import PurchaseProcessForm from '@/components/workflow/PurchaseProcessForm'
import { useWorkflowLookups } from '@/components/workflow/useWorkflowLookups'
import { buildCSVContent, buildErrorReportRows } from '@/lib/csv-utils'
import {
  FilterPanel,
  KpiStrip,
  PageHeader,
  StatusBadge,
  workspaceControlClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/WorkspaceShell'
import { FileUp, Plus } from 'lucide-react'
import WorkspaceMotion from '@/components/ui/WorkspaceMotion'

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
  companyName?: string | null;
  supplier: { id: string; name: string };
  category: { id: string; name: string };
  owner: { id: string; name: string };
  requester?: { id: string; name: string };
  salesPerson?: { id: string; name: string };
}

interface ImportErrorItem {
  row: number
  field: string
  value?: string
  reason: string
  suggestion?: string
}

function PurchaseBoardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const { categories, people } = useWorkflowLookups()

  const [items, setItems] = useState<ProcessItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set())

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
  const [filterRequesterId, setFilterRequesterId] = useState(searchParams.get('requesterId') || '')
  const [filterSalesPersonId, setFilterSalesPersonId] = useState(searchParams.get('salesPersonId') || '')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '进行中')
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') || '')

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProcessItem | null>(null)
  const [archiveItem, setArchiveItem] = useState<ProcessItem | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<ImportErrorItem[]>([])
  const [importResult, setImportResult] = useState('')

  // Import form state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const [defaultOwnerId, setDefaultOwnerId] = useState('')
  const [defaultRequesterId, setDefaultRequesterId] = useState('')
  const [defaultSalesPersonId, setDefaultSalesPersonId] = useState('')
  const [defaultPriority, setDefaultPriority] = useState('中')

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
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load')
      setItems(await res.json())
    } catch {
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterOwnerId, filterRequesterId, filterSalesPersonId, filterStatus, filterPriority, router, showToast])

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
    } catch {
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
    } catch {
      showToast('归档失败', 'error')
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    if (!defaultOwnerId) {
      showToast('请选择默认负责人', 'error')
      return
    }

    setImporting(true)
    setImportErrors([])
    setImportResult('')
    try {
      // 以 ArrayBuffer 方式读取文件，保留原始字节
      const buffer = await importFile.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)

      // 检测是否需要 GBK 解码：如果 UTF-8 解码后中文很少，尝试 GBK
      const utf8Text = new TextDecoder('utf-8').decode(uint8Array)
      const utf8ChineseCount = (utf8Text.match(/[一-龥]/g) ?? []).length

      let csvText: string
      if (utf8ChineseCount > 10) {
        // UTF-8 解码正常
        csvText = utf8Text
      } else {
        // 尝试 GBK 解码
        try {
          const gbkDecoder = new TextDecoder('gbk')
          csvText = gbkDecoder.decode(uint8Array)
        } catch {
          csvText = utf8Text
        }
      }
      const res = await fetch('/api/purchase-processes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          defaultCategoryId,
          defaultOwnerId,
          defaultRequesterId,
          defaultSalesPersonId: defaultSalesPersonId || undefined,
          defaultPriority,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.success === false) {
        if (data.errors && data.errors.length > 0) {
          setImportErrors(data.errors)
          setImportResult(data.message || '导入失败')
          showToast(data.message || `导入失败：${data.errors.length} 条错误`, 'error')
        } else {
          showToast(data.error || data.message || '导入失败', 'error')
        }
        return
      }

      showToast(data.message, 'success')
      setImportModalOpen(false)
      setImportFile(null)
      setImportResult('')
      setImportErrors([])
      loadItems()
    } catch {
      showToast('导入请求失败', 'error')
    } finally {
      setImporting(false)
    }
  }

  function downloadImportErrorCSV() {
    const csv = buildCSVContent(buildErrorReportRows(importErrors))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'purchase_import_errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const groupedItems = PURCHASE_STAGES.reduce((acc, stage) => {
    acc[stage] = items.filter(item => item.currentStage === stage)
    return acc
  }, {} as Record<string, ProcessItem[]>)
  const activeFilterCount = [filterOwnerId, filterRequesterId, filterSalesPersonId, filterStatus, filterPriority].filter(Boolean).length
  const bossDecisionCount = items.filter(item => item.needBossDecision).length
  const issueCount = items.filter(item => item.status === '异常' || item.status === '暂停').length
  const amountTotal = items.reduce((sum, item) => sum + (item.purchaseAmount ?? 0), 0)

  return (
    <WorkspaceMotion>
    <div className="h-full flex flex-col">
      <PageHeader
        eyebrow="执行看板"
        title="采购执行看板"
        description="按采购阶段横向推进事项，聚焦负责人、优先级、异常和老板决策阻塞项。"
        meta={
          <>
            <StatusBadge tone="primary">事项 {items.length}</StatusBadge>
            <StatusBadge tone={bossDecisionCount ? 'warning' : 'success'}>需决策 {bossDecisionCount}</StatusBadge>
          </>
        }
        actions={
        <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setEditingItem(null); setFormOpen(true); }}
          className={workspacePrimaryButtonClass}
        >
          <Plus className="h-4 w-4" />
          新增采购事项
        </button>
        <button
          onClick={() => setImportModalOpen(true)}
          className={workspaceSecondaryButtonClass}
        >
          <FileUp className="h-4 w-4" />
          导入审批 CSV
        </button>
      </div>
        }
      />

      <KpiStrip
        columns={4}
        items={[
          { label: '采购事项', value: items.length, hint: '当前筛选结果', tone: 'primary' },
          { label: '需老板决策', value: bossDecisionCount, hint: '待拍板', tone: bossDecisionCount ? 'warning' : 'success' },
          { label: '异常/暂停', value: issueCount, hint: '需处理阻塞', tone: issueCount ? 'danger' : 'neutral' },
          { label: '采购金额', value: `¥${amountTotal.toLocaleString()}`, hint: '当前列表合计', tone: 'slate' },
        ]}
      />

      <FilterPanel className="shrink-0" summary={`当前启用 ${activeFilterCount} 个筛选条件`}>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">负责人</label>
          <select className={workspaceControlClass} value={filterOwnerId} onChange={e => setFilterOwnerId(e.target.value)}>
            <option value="">全部</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">需求提交人</label>
          <select className={workspaceControlClass} value={filterRequesterId} onChange={e => setFilterRequesterId(e.target.value)}>
            <option value="">全部</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">销售配合</label>
          <select className={workspaceControlClass} value={filterSalesPersonId} onChange={e => setFilterSalesPersonId(e.target.value)}>
            <option value="">全部</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">状态</label>
          <select className={workspaceControlClass} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部</option>
            {PURCHASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-slate-400 font-medium mb-1.5">优先级</label>
          <select className={workspaceControlClass} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">全部</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      </FilterPanel>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-2 h-full items-start" style={{ width: 'max-content' }}>
          {PURCHASE_STAGES.map(stage => {
            const isStageCollapsed = collapsedStages.has(stage)
            if (isStageCollapsed) {
              return (
                <button
                  type="button"
                  key={stage}
                  className="flex h-full max-h-full shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-100/50 px-2 py-4 text-left transition-colors hover:bg-gray-200/60"
                  onClick={() => toggleStage(stage)}
                  title={`展开「${stage}」`}
                >
                  <span className="text-sm font-semibold text-gray-600" style={{ writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>{stage}</span>
                  <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full shadow-sm">{groupedItems[stage]?.length || 0}</span>
                </button>
              )
            }
            return (
            <div key={stage} className="w-72 bg-gray-100/50 rounded-xl flex flex-col h-full max-h-full border border-gray-200 shrink-0">
              <button
                type="button"
                className="flex w-full shrink-0 cursor-pointer items-center justify-between rounded-t-xl border-b border-gray-200 bg-gray-100 p-2.5 text-left transition-colors hover:bg-gray-200/60"
                onClick={() => toggleStage(stage)}
              >
                <h3 className="font-semibold text-gray-700 text-sm">{stage}</h3>
                <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full shadow-sm">{groupedItems[stage]?.length || 0}</span>
              </button>

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
                        <h4 className="font-medium text-gray-800 text-xs truncate flex-1" title={item.title}>{item.title}</h4>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {item.needBossDecision && <span className="bg-red-100 text-red-700 text-[10px] px-1 py-0.5 rounded font-medium">需决策</span>}
                          <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">{item.supplier.name}</div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-2.5 pb-2.5 border-t border-gray-100">
                        {item.companyName && (
                          <div className="text-[11px] text-gray-400 mt-2 truncate" title={item.companyName}>🏢 {item.companyName}</div>
                        )}
                        {item.purchaseAmount !== null && (
                          <div className="text-[11px] font-medium text-blue-700 mt-1">金额: ¥{Number(item.purchaseAmount).toLocaleString()}</div>
                        )}
                        <div className="flex gap-1.5 text-[11px] flex-wrap mt-2 mb-2">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.requester?.name || '无需求提交人'}</span>
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
                            {PURCHASE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
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

      {/* Import CSV Modal */}
      <Modal open={importModalOpen} onClose={() => { setImportModalOpen(false); setImportFile(null); setImportErrors([]); setImportResult('') }} title="导入审批 CSV">
        <div className="w-full max-w-[480px] space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择 CSV 文件</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/csv-templates?type=purchase-processes')
                    if (!res.ok) throw new Error('下载失败')
                    const blob = await res.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'purchase_processes_template.csv'
                    a.click()
                    window.URL.revokeObjectURL(url)
                  } catch {
                    showToast('下载模板失败', 'error')
                  }
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                下载 CSV 模板
              </button>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">必填表头：所属项目、支付对象</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认品类</label>
              <select
                value={defaultCategoryId}
                onChange={(e) => setDefaultCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              >
                <option value="">无（默认未分类）</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认负责人 *</label>
              <select
                value={defaultOwnerId}
                onChange={(e) => setDefaultOwnerId(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              >
                <option value="">请选择负责人</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认需求提交人</label>
              <select
                value={defaultRequesterId}
                onChange={(e) => setDefaultRequesterId(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              >
                <option value="">无（默认提交人）</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认销售配合人</label>
              <select
                value={defaultSalesPersonId}
                onChange={(e) => setDefaultSalesPersonId(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              >
                <option value="">无（可选）</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认优先级</label>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {importResult || '导入失败'}
              </div>
              <div className="max-h-52 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-2 py-2 font-medium">行号</th>
                      <th className="px-2 py-2 font-medium">字段</th>
                      <th className="px-2 py-2 font-medium">原始值</th>
                      <th className="px-2 py-2 font-medium">错误原因</th>
                      <th className="px-2 py-2 font-medium">修改建议</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importErrors.map((err, index) => (
                      <tr key={`${err.row}-${err.field}-${index}`}>
                        <td className="px-2 py-2">{err.row}</td>
                        <td className="px-2 py-2">{err.field}</td>
                        <td className="max-w-28 truncate px-2 py-2 text-gray-500" title={err.value || ''}>{err.value || ''}</td>
                        <td className="px-2 py-2 text-red-600">{err.reason}</td>
                        <td className="px-2 py-2 text-gray-500">{err.suggestion || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={downloadImportErrorCSV}
                className="text-xs text-red-700 hover:underline"
              >
                下载错误报告 CSV
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => { setImportModalOpen(false); setImportFile(null); }}
              className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !importFile || !defaultOwnerId}
              className="h-10 px-6 text-[13px] text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? '导入中...' : '开始导入'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
    </WorkspaceMotion>
  )
}

export default function PurchaseBoardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <PurchaseBoardContent />
    </Suspense>
  )
}
