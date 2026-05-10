'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import type { CategoryPackageData } from '@/lib/category-package-utils'

interface CategoryOption {
  id: string
  name: string
}

const LEVEL_ORDER = ['A优先推荐', 'B备选', 'C暂不推荐', '未评级']

export default function CategoryPackagePage() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [quoteStartDate, setQuoteStartDate] = useState('')
  const [quoteEndDate, setQuoteEndDate] = useState('')
  const [includeNotes, setIncludeNotes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CategoryPackageData | null>(null)
  const [markdown, setMarkdown] = useState('')
  const [showMarkdownSource, setShowMarkdownSource] = useState(false)

  const loadCategories = async () => {
    if (categoriesLoaded) return
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) return
      const list = await res.json()
      const active = list.filter((c: { isArchived?: boolean }) => !c.isArchived)
      setCategories(active)
      setCategoriesLoaded(true)
    } catch { /* ignore */ }
  }

  const handleGenerate = async () => {
    if (!categoryId) {
      showToast('请先选择品类', 'error')
      return
    }
    setLoading(true)
    setData(null)
    setMarkdown('')
    try {
      const params = new URLSearchParams()
      params.set('categoryId', categoryId)
      if (quoteStartDate) params.set('quoteStartDate', quoteStartDate)
      if (quoteEndDate) params.set('quoteEndDate', quoteEndDate)
      if (includeNotes) params.set('includeNotes', 'true')

      const [res, mdRes] = await Promise.all([
        fetch(`/api/category-package?${params}`),
        fetch(`/api/category-package/export?format=markdown&${params}`),
      ])

      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || '生成失败', 'error')
        return
      }

      const json = await res.json()
      setData(json)
      if (mdRes.ok) {
        const md = await mdRes.text()
        setMarkdown(md)
      }
    } catch {
      showToast('生成资料包失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyMarkdown = async () => {
    if (!markdown) return
    try {
      await navigator.clipboard.writeText(markdown)
      showToast('已复制 Markdown 到剪贴板', 'success')
    } catch {
      showToast('复制失败', 'error')
    }
  }

  const handleExport = (format: string) => {
    if (!categoryId) return
    const params = new URLSearchParams()
    params.set('categoryId', categoryId)
    params.set('format', format)
    if (quoteStartDate) params.set('quoteStartDate', quoteStartDate)
    if (quoteEndDate) params.set('quoteEndDate', quoteEndDate)
    if (includeNotes) params.set('includeNotes', 'true')
    window.open(`/api/category-package/export?${params}`, '_blank')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">品类商务支持资料包</h1>
        <p className="text-sm text-gray-500">
          按单个品类汇总供应商、报价、评分、风险、销售资料和老板决策事项，生成可预览、可复制、可导出的 Markdown/CSV 资料包。默认仅使用未归档数据。
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">品类：</label>
            <select
              value={categoryId}
              onFocus={loadCategories}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
            >
              <option value="">请选择品类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">报价日期：</label>
            <input
              type="date"
              value={quoteStartDate}
              onChange={(e) => setQuoteStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={quoteEndDate}
              onChange={(e) => setQuoteEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="rounded"
            />
            包含内部备注
          </label>
          <button
            onClick={handleGenerate}
            disabled={loading || !categoryId}
            className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '生成中…' : '生成资料包'}
          </button>
        </div>
      </div>

      {/* 导出栏 */}
      {data && (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleCopyMarkdown} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            复制 Markdown
          </button>
          <button onClick={() => handleExport('markdown')} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            导出 Markdown
          </button>
          <button onClick={() => handleExport('csv')} className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
            导出 CSV
          </button>
          <button
            onClick={() => setShowMarkdownSource(!showMarkdownSource)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showMarkdownSource ? '预览渲染效果' : '查看 Markdown 源码'}
          </button>
        </div>
      )}

      {/* Markdown 源码 */}
      {data && showMarkdownSource && (
        <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto max-h-96 whitespace-pre-wrap">
          {markdown}
        </pre>
      )}

      {/* 预览区 */}
      {data && !showMarkdownSource && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6 text-sm">
          <p className="text-xs text-gray-400">
            生成时间：{new Date(data.generatedAt).toLocaleString('zh-CN', { hour12: false })}　|　数据范围：仅未归档数据
            {includeNotes ? '　|　含内部备注' : ''}
          </p>

          {/* 一、品类概况 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">一、品类概况</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {[
                ['品类名称', data.category.name],
                ['品类类型', data.category.type],
                ['标准化程度', data.category.standardLevel],
                ['售后风险', data.category.afterSalesRisk],
                ['采购频率', data.category.purchaseFrequency],
                ['供应商数量', String(data.stats.supplierCount)],
                ['报价单数量', String(data.stats.quoteCount)],
                ['评分记录数量', String(data.stats.scoreCount)],
                ['销售资料数量', String(data.stats.materialCount)],
                ...(includeNotes && data.category.notes ? [['品类备注', data.category.notes]] as const : []),
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded p-2">
                  <span className="text-gray-500">{k}：</span>
                  <span className="text-gray-800">{v || '-'}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 二、推荐供应商 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">二、推荐供应商</h2>
            {LEVEL_ORDER.map((level) => {
              const group = data.suppliers.filter((s) => (s.recommendedLevel || '未评级') === level)
              if (group.length === 0) return null
              return (
                <div key={level} className="mb-4">
                  <h3 className="font-medium text-gray-700 mb-2">
                    {level}
                    <span className="text-gray-400 font-normal ml-2">({group.length})</span>
                  </h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">供应商</th>
                        <th className="px-3 py-2 text-left font-medium">地区</th>
                        <th className="px-3 py-2 text-left font-medium">公司性质</th>
                        <th className="px-3 py-2 text-left font-medium">合作意愿</th>
                        <th className="px-3 py-2 text-left font-medium">价格水平</th>
                        <th className="px-3 py-2 text-center font-medium">已报价</th>
                        <th className="px-3 py-2 text-center font-medium">已考察</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.map((s) => (
                        <tr key={s.id}>
                          <td className="px-3 py-2 text-gray-800">{s.name}</td>
                          <td className="px-3 py-2 text-gray-500">{s.region || '-'}</td>
                          <td className="px-3 py-2 text-gray-500">{s.companyType || '-'}</td>
                          <td className="px-3 py-2 text-gray-500">{s.cooperationWillingness || '-'}</td>
                          <td className="px-3 py-2 text-gray-500">{s.priceLevel || '-'}</td>
                          <td className="px-3 py-2 text-center">{s.hasQuoted ? '✓' : '-'}</td>
                          <td className="px-3 py-2 text-center">{s.hasVisited ? '✓' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </section>

          {/* 三、报价概览 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">三、报价概览</h2>
            {data.quotes.length === 0 ? (
              <p className="text-gray-400">暂无报价记录。</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">编号</th>
                      <th className="px-3 py-2 text-left font-medium">供应商</th>
                      <th className="px-3 py-2 text-left font-medium">日期</th>
                      <th className="px-3 py-2 text-left font-medium">阶段</th>
                      <th className="px-3 py-2 text-left font-medium">来源</th>
                      <th className="px-3 py-2 text-center font-medium">明细</th>
                      <th className="px-3 py-2 text-right font-medium">最低价</th>
                      <th className="px-3 py-2 text-center font-medium">附件</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.quotes.map((q) => (
                      <tr key={q.id}>
                        <td className="px-3 py-2 text-gray-800">{q.quoteNumber || '-'}</td>
                        <td className="px-3 py-2 text-gray-800">{q.supplierName}</td>
                        <td className="px-3 py-2 text-gray-500">{q.quoteDate}</td>
                        <td className="px-3 py-2 text-gray-500">{q.quoteStage || '-'}</td>
                        <td className="px-3 py-2 text-gray-500">{q.sourceType || '-'}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{q.itemCount}</td>
                        <td className="px-3 py-2 text-right text-gray-800">{q.minPrice != null ? q.minPrice.toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{q.attachmentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-2">附件路径仅为系统记录路径，不代表文件一定存在。</p>
              </>
            )}
          </section>

          {/* 四、供应商评分与风险 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">四、供应商评分与风险</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">供应商</th>
                  <th className="px-3 py-2 text-right font-medium">总分</th>
                  <th className="px-3 py-2 text-left font-medium">等级</th>
                  <th className="px-3 py-2 text-left font-medium">评分日期</th>
                  <th className="px-3 py-2 text-left font-medium">评分人</th>
                  <th className="px-3 py-2 text-left font-medium">风险标签</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.suppliers.map((s) => {
                  const sc = data.scores.find((x) => x.supplierId === s.id)
                  return (
                    <tr key={s.id}>
                      <td className="px-3 py-2 text-gray-800">{s.name}</td>
                      <td className="px-3 py-2 text-right text-gray-800">{sc?.totalScore != null ? sc.totalScore.toFixed(1) : '-'}</td>
                      <td className="px-3 py-2 text-gray-800">{sc?.finalLevel || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{sc?.scoreDate || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{sc?.scorerName || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{s.riskTags.join('；') || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {includeNotes && data.suppliers.some((s) => s.riskSummary) && (
              <div className="mt-3 space-y-1">
                {data.suppliers.filter((s) => s.riskSummary).map((s) => (
                  <p key={s.id} className="text-xs text-gray-600"><strong>{s.name}</strong> 风险摘要：{s.riskSummary}</p>
                ))}
              </div>
            )}
          </section>

          {/* 五、销售/商务资料 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">五、销售/商务资料</h2>
            {data.materials.length === 0 ? (
              <p className="text-gray-400">暂无销售/商务资料。</p>
            ) : (
              <div className="space-y-4">
                {data.materials.map((m, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800">{m.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">目标对象：{m.targetAudience || '-'}</p>
                    {includeNotes && (
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        {m.coreSellingPoints && <p>核心卖点：{m.coreSellingPoints}</p>}
                        {m.priceAdvantage && <p>价格优势：{m.priceAdvantage}</p>}
                        {m.supplierAdvantage && <p>供应商优势：{m.supplierAdvantage}</p>}
                        {m.qualificationSupport && <p>资质背书：{m.qualificationSupport}</p>}
                        {m.deliveryAdvantage && <p>交付优势：{m.deliveryAdvantage}</p>}
                        {m.afterSalesAdvantage && <p>售后优势：{m.afterSalesAdvantage}</p>}
                        {m.riskNotice && <p>风险提示：{m.riskNotice}</p>}
                        {m.formalText && <p className="bg-gray-50 p-2 rounded mt-1">正式正文：{m.formalText}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 六、老板决策与下一步建议 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">六、老板决策与下一步建议</h2>
            {data.decisions.length === 0 ? (
              <p className="text-gray-400">暂无需要老板决策的事项。</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">类型</th>
                    <th className="px-3 py-2 text-left font-medium">事项</th>
                    <th className="px-3 py-2 text-left font-medium">供应商</th>
                    <th className="px-3 py-2 text-left font-medium">负责人</th>
                    <th className="px-3 py-2 text-left font-medium">优先级</th>
                    <th className="px-3 py-2 text-left font-medium">状态</th>
                    <th className="px-3 py-2 text-left font-medium">截止日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.decisions.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2 text-gray-500">{d.sourceLabel}</td>
                      <td className="px-3 py-2 text-gray-800">{d.title}</td>
                      <td className="px-3 py-2 text-gray-800">{d.supplierName}</td>
                      <td className="px-3 py-2 text-gray-500">{d.ownerName}</td>
                      <td className="px-3 py-2 text-gray-500">{d.priority || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{d.status}</td>
                      <td className="px-3 py-2 text-gray-500">{d.dueDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
