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
      const csvText = await file.text()
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
      // 重置 input 以允许重新选择同一文件
      e.target.value = ''
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">数据导入导出</h1>
        <p className="text-sm text-gray-500 mt-1">
          管理 CSV 模板下载、报价导入入口、供应商导入入口和各类数据导出。数据库备份恢复请使用本地备份恢复页面。
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">CSV 模板下载</h2>
            <p className="text-sm text-gray-500 mt-1">模板使用 UTF-8 BOM，适合用 Excel 打开并保留中文表头。</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/quotes"
              className="px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              前往报价导入
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templateLinks.map((item) => (
            <div key={item.href} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                </div>
                <span className="shrink-0 px-2 py-1 text-xs rounded bg-green-100 text-green-700">{item.status}</span>
              </div>
              <a
                href={item.href}
                className="inline-block mt-4 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                下载 CSV
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 供应商 CSV 导入 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">供应商 CSV 导入</h2>
        <p className="text-sm text-gray-500 mb-4">
          选择本地 CSV 文件导入供应商。每行创建 1 家供应商和 0/1 个联系人。导入前会完整校验，任意错误整文件失败。
        </p>

        <div className="flex items-center gap-3 mb-4">
          <label className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            {importing ? '导入中…' : '选择 CSV 文件'}
            <input
              type="file"
              accept=".csv"
              onChange={handleSupplierImport}
              className="hidden"
              disabled={importing}
            />
          </label>
          {selectedFileName && (
            <span className="text-sm text-gray-500">{selectedFileName}</span>
          )}
        </div>

        {/* 成功结果 */}
        {importResult?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">{importResult.message}</p>
            {importResult.suppliers && importResult.suppliers.length > 0 && (
              <ul className="mt-2 text-sm text-green-700 space-y-1">
                {importResult.suppliers.map((s) => (
                  <li key={s.supplierId}>
                    供应商「{s.supplierName}」{s.contactId ? '（含联系人）' : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 错误报告 */}
        {importErrors.length > 0 && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">{importResult?.message || '导入失败'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border border-gray-200 rounded-lg">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">行号</th>
                    <th className="px-3 py-2 font-medium">字段</th>
                    <th className="px-3 py-2 font-medium">原始值</th>
                    <th className="px-3 py-2 font-medium">错误原因</th>
                    <th className="px-3 py-2 font-medium">修改建议</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importErrors.map((err, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{err.row}</td>
                      <td className="px-3 py-2 text-gray-700">{err.field}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate" title={err.value}>{err.value}</td>
                      <td className="px-3 py-2 text-red-600">{err.reason}</td>
                      <td className="px-3 py-2 text-gray-500">{err.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => downloadErrorCSV(importErrors)}
              className="px-4 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              下载错误报告 CSV
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">导出入口</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportLinks.map((item) => (
            <div key={item.title} className="border border-gray-100 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              <Link
                href={item.href}
                className="inline-block mt-4 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                打开
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">导入规则</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">严格校验</div>
            <p>导入前完整检查所有行，任意错误都会整文件失败。不会写入部分数据。</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">错误报告</div>
            <p>失败时显示行号、字段、原始值、错误原因和修改建议，并可下载错误报告 CSV。</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">格式统一</div>
            <p>导出 CSV 统一使用中文表头、UTF-8 BOM 和标准 CSV 转义。</p>
          </div>
        </div>
      </section>
    </div>
  )
}
