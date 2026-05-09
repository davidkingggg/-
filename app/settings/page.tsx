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
        <h1 className="text-2xl font-bold mb-4">系统设置</h1>
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">系统设置</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统级全局配置参数</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3.5 font-semibold text-gray-600 w-48">配置键</th>
              <th className="text-left px-6 py-3.5 font-semibold text-gray-600">配置值</th>
              <th className="text-left px-6 py-3.5 font-semibold text-gray-600 w-64">备注说明</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700">
                    {s.key}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={editedSettings[s.id]?.value ?? ''}
                    onChange={(e) => handleChange(s.id, 'value', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={editedSettings[s.id]?.notes ?? ''}
                    onChange={(e) => handleChange(s.id, 'notes', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
