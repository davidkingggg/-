'use client'

import React, { useState } from 'react'

interface RestoreArchiveDialogProps {
  open: boolean
  recordName: string
  recordType: string
  extraWarning?: string
  onClose: () => void
  onConfirm: () => void
}

export default function RestoreArchiveDialog({
  open,
  recordName,
  recordType,
  extraWarning,
  onClose,
  onConfirm,
}: RestoreArchiveDialogProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleConfirm = () => {
    if (input.trim() !== '确认恢复') {
      setError('请输入“确认恢复”以继续')
      return
    }
    setError('')
    setInput('')
    onConfirm()
  }

  const handleClose = () => {
    setInput('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">确认恢复归档记录</h3>
        <p className="text-sm text-gray-600 mb-1">
          确定要恢复{recordType}「{recordName}」吗？
        </p>
        <p className="text-sm text-gray-500 mb-1">
          恢复后该记录将重新在列表中显示。
        </p>
        <p className="text-sm text-amber-600 mb-1">
          注意：恢复归档只恢复数据库记录，不恢复被外部删除的附件物理文件。
        </p>
        {extraWarning && (
          <p className="text-sm text-amber-600 mb-1">{extraWarning}</p>
        )}
        <div className="mt-4">
          <label className="block text-sm text-gray-700 mb-1">
            请输入 &quot;确认恢复&quot; 以继续：
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError('') }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="确认恢复"
          />
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            确认恢复
          </button>
        </div>
      </div>
    </div>
  )
}
