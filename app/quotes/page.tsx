'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import { buildCSVContent, buildErrorReportRows } from '@/lib/csv-utils'
import {
  DataSurface,
  FilterPanel,
  KpiStrip,
  PageHeader,
  StatusBadge,
  workspaceControlClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/WorkspaceShell'
import { Download, FileUp, Plus, Search } from 'lucide-react'
import { normalizeListResponse } from '@/lib/list-response'
import WorkspaceMotion from '@/components/ui/WorkspaceMotion'

interface QuoteSheet {
  id: string
  quoteNumber: string | null
  title: string | null
  supplierId: string
  supplier: { id: string; name: string }
  categoryId: string
  category: { id: string; name: string }
  quoteDate: string
  sourceType: string | null
  quoteStage: string | null
  items: { id: string }[]
  createdAt: string
}

interface CategoryOption { id: string; name: string }
interface SupplierOption { id: string; name: string }
interface ImportError {
  row: number
  field: string
  value?: string
  reason?: string
  suggestion?: string
  message?: string
}

const QUOTE_STAGES = ['初次报价', '二次议价', '最终确认价', '量大优惠价']

export default function QuotesPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [quotes, setQuotes] = useState<QuoteSheet[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  // 筛选
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterStage, setFilterStage] = useState('')

  // 归档
  const [archiveTarget, setArchiveTarget] = useState<QuoteSheet | null>(null)

  // 导入
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])
  const [importResult, setImportResult] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchQuotes() {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (filterCategory) params.set('categoryId', filterCategory)
        if (filterSupplier) params.set('supplierId', filterSupplier)
        if (filterStage) params.set('quoteStage', filterStage)

        const res = await fetch(`/api/quotes?${params}`)
        if (res.status === 401 && !cancelled) {
          router.push('/login')
          return
        }
        if (res.ok && !cancelled) {
          setQuotes(normalizeListResponse<QuoteSheet>(await res.json()))
        } else if (!res.ok) {
          throw new Error()
        }
      } catch {
        if (!cancelled) showToast('获取报价单列表失败', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchQuotes()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterCategory, filterSupplier, filterStage, reloadKey])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then((data) => setCategories(normalizeListResponse<CategoryOption>(data))).catch(() => {})
    fetch('/api/suppliers').then(r => r.json()).then((data) => setSuppliers(normalizeListResponse<SupplierOption>(data))).catch(() => {})
  }, [])

  // 搜索防抖
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function doArchive() {
    if (!archiveTarget) return
    try {
      const res = await fetch(`/api/quotes/${archiveTarget.id}`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      showToast('报价单已归档', 'success')
      setArchiveTarget(null)
      setReloadKey(k => k + 1)
    } catch {
      showToast('归档失败', 'error')
    }
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/quotes/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotes_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('导出成功', 'success')
    } catch {
      showToast('导出失败', 'error')
    }
  }

  function downloadBlob(content: BlobPart, fileName: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch('/api/csv-templates?type=quote-items')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quote_items_template.csv'
      a.click()
      URL.revokeObjectURL(url)
      showToast('模板下载成功', 'success')
    } catch {
      showToast('模板下载失败', 'error')
    }
  }

  function handleDownloadErrorReport() {
    if (!importErrors.length) return
    const content = buildCSVContent(buildErrorReportRows(importErrors))
    downloadBlob(content, `quote_import_errors_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
  }

  async function readCSVFileText(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const utf8Text = new TextDecoder('utf-8').decode(bytes)
    const utf8ChineseCount = (utf8Text.match(/[\u4E00-\u9FA5]/g) ?? []).length

    if (utf8ChineseCount >= 10 && !utf8Text.includes('\uFFFD')) return utf8Text

    try {
      const gbkText = new TextDecoder('gbk').decode(bytes)
      const gbkChineseCount = (gbkText.match(/[\u4E00-\u9FA5]/g) ?? []).length
      return gbkChineseCount > utf8ChineseCount ? gbkText : utf8Text
    } catch {
      return utf8Text
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportErrors([])
    setImportResult(null)

    try {
      const text = await readCSVFileText(file)
      const res = await fetch('/api/quotes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: text }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.errors) {
          setImportErrors(data.errors)
        }
        setImportResult(data.error || '导入失败')
      } else {
        setImportResult(data.message)
        showToast(data.message, 'success')
        setImportModalOpen(false)
        setReloadKey(k => k + 1)
      }
    } catch {
      setImportResult('导入失败：文件读取错误')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const activeFilterCount = [search, filterCategory, filterSupplier, filterStage].filter(Boolean).length
  const quoteItemCount = quotes.reduce((sum, quote) => sum + quote.items.length, 0)
  const finalQuoteCount = quotes.filter((quote) => quote.quoteStage === '最终确认价').length

  return (
    <WorkspaceMotion>
    <div className="space-y-5">
      <PageHeader
        eyebrow="报价资产"
        title="报价管理"
        description="集中维护供应商报价单、报价阶段和导入校验结果，支撑后续横向对比。"
        meta={
          <>
            <StatusBadge tone="primary">报价单 {quotes.length}</StatusBadge>
            <StatusBadge tone="success">明细 {quoteItemCount}</StatusBadge>
          </>
        }
        actions={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className={workspaceSecondaryButtonClass}
          >
            <FileUp className="h-4 w-4" />
            CSV 导入
          </button>
          <button
            onClick={handleExport}
            className={workspaceSecondaryButtonClass}
          >
            <Download className="h-4 w-4" />
            CSV 导出
          </button>
          <button
            onClick={() => router.push('/quotes/new')}
            className={workspacePrimaryButtonClass}
          >
            <Plus className="h-4 w-4" />
            新增报价单
          </button>
        </div>
        }
      />

      <KpiStrip
        columns={4}
        items={[
          { label: '报价单', value: quotes.length, hint: '当前列表', tone: 'primary' },
          { label: '报价明细', value: quoteItemCount, hint: '可参与对比', tone: 'success' },
          { label: '最终确认价', value: finalQuoteCount, hint: '已进入确认阶段', tone: 'warning' },
          { label: '筛选条件', value: activeFilterCount, hint: '当前启用数量', tone: activeFilterCount ? 'warning' : 'neutral' },
        ]}
      />

      {/* 筛选栏 */}
      <FilterPanel summary={`当前启用 ${activeFilterCount} 个筛选条件`} actions={<span className="text-[12px] font-semibold text-slate-400">导入失败会生成可下载错误报告</span>}>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative w-80 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="搜索报价单编号、名称或供应商..."
            className={`${workspaceControlClass} w-full pl-9`}
          />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className={workspaceControlClass}
          >
            <option value="">全部品类</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterSupplier}
            onChange={e => setFilterSupplier(e.target.value)}
            className={workspaceControlClass}
          >
            <option value="">全部供应商</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            className={workspaceControlClass}
          >
            <option value="">全部阶段</option>
            {QUOTE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(search || filterCategory || filterSupplier || filterStage) && (
            <button
              onClick={() => { setSearchInput(''); setFilterCategory(''); setFilterSupplier(''); setFilterStage('') }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              清除筛选
            </button>
          )}
        </div>
      </FilterPanel>

      {/* 列表 */}
      <DataSurface>
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            暂无报价单数据
            <br />
            <button
              onClick={() => router.push('/quotes/new')}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
            >
              + 创建第一张报价单
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[12px] font-extrabold text-slate-500">编号</th>
                <th className="text-left px-4 py-3 text-[12px] font-extrabold text-slate-500">名称</th>
                <th className="text-left px-4 py-3 text-[12px] font-extrabold text-slate-500">供应商</th>
                <th className="text-left px-4 py-3 text-[12px] font-extrabold text-slate-500">品类</th>
                <th className="text-left px-4 py-3 text-[12px] font-extrabold text-slate-500">报价日期</th>
                <th className="text-left px-4 py-3 text-[12px] font-extrabold text-slate-500">阶段</th>
                <th className="text-center px-4 py-3 text-[12px] font-extrabold text-slate-500">明细数</th>
                <th className="text-right px-4 py-3 text-[12px] font-extrabold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/quotes/${q.id}`)}
                >
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{q.quoteNumber || '-'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{q.title || q.supplier.name + ' 报价'}</td>
                  <td className="px-4 py-3 text-gray-600">{q.supplier.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{q.category.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{new Date(q.quoteDate).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    {q.quoteStage ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                        q.quoteStage === '最终确认价' ? 'bg-green-50 text-green-700' :
                        q.quoteStage === '二次议价' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {q.quoteStage}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{q.items.length}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/quotes/${q.id}`)}
                      className="text-[13px] font-semibold text-[#2563eb] hover:text-blue-800 mr-4"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => setArchiveTarget(q)}
                      className="text-[13px] font-semibold text-[#ef4444] hover:text-red-700"
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
      </DataSurface>

      {/* 归档确认 */}
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={doArchive}
        title="确认归档报价单"
        message={`确定要归档报价单「${archiveTarget?.title || archiveTarget?.quoteNumber || archiveTarget?.supplier?.name + ' 报价'}」吗？归档后可从归档列表恢复。`}
        confirmText="确认归档"
      />

      {/* CSV 导入弹窗 */}
      <Modal open={importModalOpen} onClose={() => { setImportModalOpen(false); setImportErrors([]); setImportResult(null) }} title="CSV 导入报价明细">
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1">请选择符合模板格式的 CSV 文件进行导入。</p>
                <p className="text-xs text-gray-500">
                  必需列：供应商名称、品类、报价日期、对比规格标识、产品名称、报价。
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                type="button"
                className="shrink-0 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                下载模板
              </button>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
              导入采用严格事务模式：任何一行有错误，本次导入全部取消，不会写入部分数据。
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleImportFile}
            disabled={importing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />

          {importing && <p className="text-sm text-blue-600">导入中，请稍候...</p>}

          {importResult && !importErrors.length && (
            <div className={`text-sm p-3 rounded-lg ${importErrors.length ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {importResult}
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-red-700">
                    {importResult || '导入校验失败'}（共 {importErrors.length} 个错误）
                  </p>
                  <p className="text-xs text-red-600 mt-1">本次导入未写入任何数据，请修正 CSV 后重新导入。</p>
                </div>
                <button
                  onClick={handleDownloadErrorReport}
                  type="button"
                  className="shrink-0 px-3 py-1.5 text-xs text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  下载错误报告
                </button>
              </div>
              <div className="max-h-72 overflow-auto border border-red-100 rounded-lg bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-red-700">行号</th>
                      <th className="text-left px-3 py-2 font-semibold text-red-700">字段</th>
                      <th className="text-left px-3 py-2 font-semibold text-red-700">原始值</th>
                      <th className="text-left px-3 py-2 font-semibold text-red-700">错误原因</th>
                      <th className="text-left px-3 py-2 font-semibold text-red-700">修改建议</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importErrors.map((err, i) => (
                      <tr key={i} className="border-t border-red-50">
                        <td className="px-3 py-2 font-mono text-red-700">第{err.row}行</td>
                        <td className="px-3 py-2 text-gray-700">{err.field}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-32 truncate" title={err.value || ''}>{err.value || '-'}</td>
                        <td className="px-3 py-2 text-red-700">{err.reason || err.message}</td>
                        <td className="px-3 py-2 text-gray-600">{err.suggestion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
    </WorkspaceMotion>
  )
}
