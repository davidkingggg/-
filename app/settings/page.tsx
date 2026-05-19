'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'

interface Setting {
  id: string
  key: string
  value: string
  notes: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [editedSettings, setEditedSettings] = useState<Record<string, { value: string; notes: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    async function load() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setSettings(data)
        const edits: Record<string, { value: string; notes: string }> = {}
        data.forEach((s: Setting) => {
          edits[s.id] = { value: s.value, notes: s.notes || '' }
        })
        setEditedSettings(edits)
      } catch {
        showToast('获取系统设置失败', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showToast])

  function handleChange(id: string, field: 'value' | 'notes', val: string) {
    setEditedSettings((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: val },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const items = settings.map((s) => ({
        id: s.id,
        value: editedSettings[s.id]?.value ?? s.value,
        notes: editedSettings[s.id]?.notes ?? s.notes ?? '',
      }))
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '保存失败')
      }
      const data = await res.json()
      setSettings(data)
      showToast('系统设置保存成功', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存系统设置失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-[22px] font-bold text-[#0f172a] mb-2">系统设置</h1>
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">系统设置</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">管理系统级全局配置参数</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-[13px] font-semibold shadow-sm"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      <div className="rounded-[20px] bg-white border border-[#e5eaf3] overflow-hidden" style={{ boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e5eaf3]">
              <th className="text-left px-6 h-[52px] text-[13px] font-bold text-[#475569] w-48">配置键</th>
              <th className="text-left px-6 h-[52px] text-[13px] font-bold text-[#475569]">配置值</th>
              <th className="text-left px-6 h-[52px] text-[13px] font-bold text-[#475569] w-64">备注说明</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.id} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc] transition-colors">
                <td className="px-6 h-[58px] text-[14px]">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700">
                    {s.key}
                  </code>
                </td>
                <td className="px-6 h-[58px] text-[14px]">
                  <input
                    type="text"
                    value={editedSettings[s.id]?.value ?? ''}
                    onChange={(e) => handleChange(s.id, 'value', e.target.value)}
                    className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </td>
                <td className="px-6 h-[58px] text-[14px]">
                  <input
                    type="text"
                    value={editedSettings[s.id]?.notes ?? ''}
                    onChange={(e) => handleChange(s.id, 'notes', e.target.value)}
                    className="w-full h-10 border border-[#e5eaf3] rounded-xl px-3 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    placeholder="备注说明"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {settings.length === 0 && (
          <div className="text-center text-gray-400 py-12">暂无设置项</div>
        )}
      </div>
    </div>
  )
}
