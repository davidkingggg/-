'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface ImportError {
  row: number
  field: string
  value: string
  reason: string
  suggestion: string
}

const templateLinks = [
  {
    title: '报价明细导入模板',
    description: '正式支持导入，包含示例行、必填字段和报价合并规则。',
    href: '/api/csv-templates?type=quote-items',
    status: '可导入',
  },
  {
    title: '供应商导入模板',
    description: '正式支持导入，包含供应商和联系人字段。',
    href: '/api/csv-templates?type=suppliers',
    status: '可导入',
  },
  {
    title: '采购审批导入模板',
    description: '正式支持导入，包含所属项目、支付对象和审批金额等字段。',
    href: '/api/csv-templates?type=purchase-processes',
    status: '可导入',
  },
]

const importEntries = [
  {
    title: '供应商 CSV 导入',
    description: '导入供应商基本信息与联系人，支持 UTF-8 和 GBK 编码。',
    target: 'supplier' as const,
  },
  {
    title: '报价 CSV 导入',
    description: '导入报价单与报价明细，前往报价管理页操作。',
    href: '/quotes',
  },
  {
    title: '采购 CSV 导入',
    description: '导入采购审批流程，前往采购执行看板操作。',
    href: '/purchase-board',
  },
]

const exportLinks = [
  { title: '报价数据 CSV', href: '/api/quotes/export', description: '导出报价单与报价明细。' },
  { title: '报价对比 CSV', href: '/quote-compare', description: '进入报价对比页后按筛选条件导出。' },
  { title: '老板汇报 CSV', href: '/boss-report', description: '进入老板汇报页后按周期导出。' },
  { title: '销售/商务资料', href: '/sales-materials', description: '支持 CSV 和 Markdown 导出。' },
]

function downloadErrorCSV(errors: ImportError[]) {
  const BOM = '﻿'
  const headers = ['行号', '字段', '原始值', '错误原因', '修改建议']
  const rows = errors.map((e) => [e.row, e.field, e.value, e.reason, e.suggestion].map((v) => {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }).join(','))
  const content = BOM + [headers.join(','), ...rows].join('\n') + '\n'
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'supplier_import_errors.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Page() {
  const { showToast } = useToast()
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; count?: number; suppliers?: Array<{ supplierId: string; supplierName: string; contactId?: string }> } | null>(null)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])
  const [selectedFileName, setSelectedFileName] = useState('')

  const handleSupplierImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)
    setImporting(true)
    setImportResult(null)
    setImportErrors([])

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const utf8Text = new TextDecoder('utf-8').decode(bytes)
      const utf8ChineseCount = (utf8Text.match(/[一-龥]/g) ?? []).length
      let csvText = utf8Text
      if (utf8ChineseCount < 10 || utf8Text.includes('�')) {
        try {
          const decoded = new TextDecoder('gbk').decode(bytes)
          if ((decoded.match(/[一-龥]/g) ?? []).length > utf8ChineseCount) {
            csvText = decoded
          }
        } catch {}
      }
      const res = await fetch('/api/suppliers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      })
      const data = await res.json()

      if (!res.ok && data.errors) {
        setImportResult({ success: false, message: data.message || '导入失败' })
        setImportErrors(data.errors)
        showToast(data.message || '导入失败', 'error')
      } else if (!res.ok) {
        showToast(data.error || '导入失败', 'error')
      } else {
        setImportResult(data)
        showToast(data.message || '导入成功', 'success')
      }
    } catch {
      showToast('读取文件失败', 'error')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[#0f172a]">数据导入导出</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">
          管理 CSV 模板下载、各类数据导入和导出。数据库备份恢复请使用本地备份恢复页面。
        </p>
      </div>

      <div className="space-y-5">
        {/* CSV 模板下载 */}
        <section className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
          <div className="mb-4">
            <h2 className="text-[16px] font-bold text-[#0f172a]">CSV 模板下载</h2>
            <p className="text-[13px] text-slate-400 mt-0.5">模板使用 UTF-8 BOM，适合用 Excel 打开并保留中文表头。</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {templateLinks.map((item) => (
              <div key={item.href} className="border border-[#e5eaf3] rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-[14px] font-bold text-[#0f172a]">{item.title}</h3>
                  <span className="shrink-0 inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">{item.status}</span>
                </div>
                <p className="text-[13px] text-slate-400 mb-4 flex-1">{item.description}</p>
                <a
                  href={item.href}
                  className="inline-flex items-center justify-center h-9 px-4 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  下载 CSV
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* 导入入口 */}
        <section className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
          <div className="mb-4">
            <h2 className="text-[16px] font-bold text-[#0f172a]">导入入口</h2>
            <p className="text-[13px] text-slate-400 mt-0.5">选择要导入的数据类型。</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {importEntries.map((item) => (
              <div key={item.title} className="border border-[#e5eaf3] rounded-xl p-4 flex flex-col">
                <h3 className="text-[14px] font-bold text-[#0f172a]">{item.title}</h3>
                <p className="text-[13px] text-slate-400 mt-0.5 mb-4 flex-1">{item.description}</p>
                {'href' in item && item.href ? (
                  <Link
                    href={item.href}
                    className="inline-flex items-center justify-center h-9 px-4 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold"
                  >
                    前往导入
                  </Link>
                ) : (
                  <label className="inline-flex items-center justify-center h-9 px-4 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold cursor-pointer">
                    {importing ? '导入中...' : '选择文件导入'}
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleSupplierImport}
                      className="hidden"
                      disabled={importing}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 供应商导入结果 */}
        {(importResult || importErrors.length > 0) && (
          <section className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
            <h2 className="text-[16px] font-bold text-[#0f172a] mb-3">供应商导入结果</h2>

            {selectedFileName && (
              <p className="text-[13px] text-slate-400 mb-3">文件: {selectedFileName}</p>
            )}

            {importResult?.success && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-[13px] font-semibold text-emerald-800">{importResult.message}</p>
                {importResult.suppliers && importResult.suppliers.length > 0 && (
                  <ul className="mt-2 text-[13px] text-emerald-700 space-y-1">
                    {importResult.suppliers.map((s) => (
                      <li key={s.supplierId}>
                        供应商「{s.supplierName}」{s.contactId ? '（含联系人）' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="text-[13px] font-semibold text-red-800">{importResult?.message || '导入失败'}</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-[#e5eaf3]">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e5eaf3]">
                        <th className="text-left px-4 h-[44px] font-bold text-[#475569]">行号</th>
                        <th className="text-left px-4 h-[44px] font-bold text-[#475569]">字段</th>
                        <th className="text-left px-4 h-[44px] font-bold text-[#475569]">原始值</th>
                        <th className="text-left px-4 h-[44px] font-bold text-[#475569]">错误原因</th>
                        <th className="text-left px-4 h-[44px] font-bold text-[#475569]">修改建议</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importErrors.map((err, i) => (
                        <tr key={i} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                          <td className="px-4 h-[44px] text-[#475569]">{err.row}</td>
                          <td className="px-4 h-[44px] text-[#475569]">{err.field}</td>
                          <td className="px-4 h-[44px] text-slate-500 max-w-[150px] truncate" title={err.value}>{err.value}</td>
                          <td className="px-4 h-[44px] text-red-600">{err.reason}</td>
                          <td className="px-4 h-[44px] text-[#475569]">{err.suggestion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => downloadErrorCSV(importErrors)}
                  className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold"
                >
                  下载错误报告 CSV
                </button>
              </div>
            )}
          </section>
        )}

        {/* 导出入口 */}
        <section className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
          <div className="mb-4">
            <h2 className="text-[16px] font-bold text-[#0f172a]">导出入口</h2>
            <p className="text-[13px] text-slate-400 mt-0.5">选择要导出的数据类型。</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {exportLinks.map((item) => (
              <div key={item.title} className="border border-[#e5eaf3] rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[14px] font-bold text-[#0f172a]">{item.title}</h3>
                  <p className="text-[13px] text-slate-400 mt-0.5">{item.description}</p>
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 inline-flex items-center justify-center h-9 px-4 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  打开
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 导入规则 */}
        <section className="rounded-[20px] bg-white border border-[#e5eaf3] p-5" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
          <h2 className="text-[16px] font-bold text-[#0f172a] mb-4">导入规则</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { title: '严格校验', desc: '导入前完整检查所有行，任意错误都会整文件失败。不会写入部分数据。' },
              { title: '错误报告', desc: '失败时显示行号、字段、原始值、错误原因和修改建议，并可下载错误报告 CSV。' },
              { title: '格式统一', desc: '导出 CSV 统一使用中文表头、UTF-8 BOM 和标准 CSV 转义。' },
            ].map((rule) => (
              <div key={rule.title} className="rounded-xl bg-[#f8fafc] border border-[#e5eaf3] p-4">
                <div className="text-[14px] font-bold text-[#0f172a] mb-1.5">{rule.title}</div>
                <p className="text-[13px] text-[#475569] leading-relaxed">{rule.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
