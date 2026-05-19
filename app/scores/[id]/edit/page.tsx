'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export default function EditScorePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { showToast } = useToast()
  const { id } = use(params)

  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [people, setPeople] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    supplierId: '',
    categoryId: '',
    scorerId: '',
    scoreDate: '',
    qualityScore: 0,
    priceScore: 0,
    deliveryScore: 0,
    afterSalesScore: 0,
    cooperationScore: 0,
    paymentScore: 0,
    regionScore: 0,
    manualLevel: '',
    scoreReason: ''
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/people').then(r => r.json()),
      fetch(`/api/scores/${id}`).then(r => r.json())
    ]).then(([supps, cats, ppl, scoreData]) => {
      setSuppliers(supps)
      setCategories(cats)
      setPeople(ppl)

      if (scoreData.error) {
        showToast(scoreData.error, 'error')
        router.push('/scores')
        return
      }

      setFormData({
        supplierId: scoreData.supplierId || '',
        categoryId: scoreData.categoryId || '',
        scorerId: scoreData.scorerId || '',
        scoreDate: scoreData.scoreDate ? new Date(scoreData.scoreDate).toISOString().slice(0, 10) : '',
        qualityScore: Number(scoreData.qualityScore || 0),
        priceScore: Number(scoreData.priceScore || 0),
        deliveryScore: Number(scoreData.deliveryScore || 0),
        afterSalesScore: Number(scoreData.afterSalesScore || 0),
        cooperationScore: Number(scoreData.cooperationScore || 0),
        paymentScore: Number(scoreData.paymentScore || 0),
        regionScore: Number(scoreData.regionScore || 0),
        manualLevel: scoreData.manualLevel || '',
        scoreReason: scoreData.scoreReason || ''
      })
      setLoading(false)
    }).catch(() => {
      showToast('加载失败', 'error')
      router.push('/scores')
    })
  }, [id, router, showToast])

  // Auto calculate total and system level
  const totalScore =
    Number(formData.qualityScore || 0) +
    Number(formData.priceScore || 0) +
    Number(formData.deliveryScore || 0) +
    Number(formData.afterSalesScore || 0) +
    Number(formData.cooperationScore || 0) +
    Number(formData.paymentScore || 0) +
    Number(formData.regionScore || 0);

  let systemLevel = 'C暂不推荐'
  if (totalScore >= 85) systemLevel = 'A优先推荐'
  else if (totalScore >= 70) systemLevel = 'B备选'

  const finalLevel = formData.manualLevel ? formData.manualLevel : systemLevel

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/scores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')

      showToast('更新成功', 'success')
      router.push('/scores')
    } catch (err: unknown) {
      showToast((err as Error).message, 'error')
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-[22px] font-bold text-[#0f172a]">编辑供应商评分</h1>
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">返回</button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[20px] bg-white border border-[#e5eaf3] p-6 space-y-8" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">供应商 *</label>
            <select disabled required name="supplierId" value={formData.supplierId} className="w-full h-10 border border-[#e5eaf3] bg-gray-50 rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
              <option value="">请选择供应商</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">品类 *</label>
            <select required name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
              <option value="">请选择品类</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">评分人 *</label>
            <select required name="scorerId" value={formData.scorerId} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
              <option value="">请选择评分人</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">评分日期 *</label>
            <input required type="date" name="scoreDate" value={formData.scoreDate} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">打分明细</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">产品匹配度 / 质量 (25分)</label>
              <input type="number" min="0" max="25" step="0.1" name="qualityScore" value={formData.qualityScore} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">价格竞争力 (20分)</label>
              <input type="number" min="0" max="20" step="0.1" name="priceScore" value={formData.priceScore} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">交付能力 (15分)</label>
              <input type="number" min="0" max="15" step="0.1" name="deliveryScore" value={formData.deliveryScore} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">售后服务 (15分)</label>
              <input type="number" min="0" max="15" step="0.1" name="afterSalesScore" value={formData.afterSalesScore} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">平台合作意愿 (10分)</label>
              <input type="number" min="0" max="10" step="0.1" name="cooperationScore" value={formData.cooperationScore} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">账期/付款条件 (10分)</label>
              <input type="number" min="0" max="10" step="0.1" name="paymentScore" value={formData.paymentScore} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">区域覆盖能力 (5分)</label>
              <input type="number" min="0" max="5" step="0.1" name="regionScore" value={formData.regionScore} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between border border-gray-200">
          <div>
            <span className="text-sm text-gray-500">当前总分</span>
            <div className="text-2xl font-bold text-blue-600">{totalScore.toFixed(1)} <span className="text-sm font-normal text-gray-500">/ 100</span></div>
          </div>
          <div>
            <span className="text-sm text-gray-500">系统建议等级</span>
            <div className="text-xl font-bold text-gray-800">{systemLevel}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">最终采用等级</span>
            <div className="text-xl font-bold text-emerald-600">{finalLevel}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">手动调整等级（留空则采用系统等级）</label>
            <select name="manualLevel" value={formData.manualLevel} onChange={handleChange} className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
              <option value="">-- 不调整 --</option>
              <option value="A优先推荐">A优先推荐</option>
              <option value="B备选">B备选</option>
              <option value="C暂不推荐">C暂不推荐</option>
              <option value="未评级">未评级</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">评分说明 / 备注</label>
          <textarea name="scoreReason" value={formData.scoreReason} onChange={handleChange} rows={3} className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="填写评分的依据或额外说明..."></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => router.back()} className="h-10 px-5 text-[13px] text-[#475569] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium">取消</button>
          <button type="submit" className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors text-[13px] font-semibold shadow-sm">更新评分</button>
        </div>
      </form>
    </div>
  )
}
