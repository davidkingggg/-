'use client'

import React, { useState } from 'react'

interface DeleteConfirmDialogProps {
  open: boolean
  count: number
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmDialog({
  open,
  count,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleConfirm = () => {
    if (input.trim() !== '确认删除') {
      setError('请输入"确认删除"以继续')
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
        <h3 className="text-lg font-semibold text-red-700 mb-2">彻底删除</h3>
        <p className="text-sm text-gray-700 mb-1">
          确定要<span className="font-semibold text-red-600">永久删除</span>已选的 {count} 条归档记录吗？
        </p>
        <p className="text-sm text-red-600 mb-1 font-medium">
          此操作不可撤销，数据将从数据库中彻底移除。
        </p>
        <div className="mt-4">
          <label className="block text-sm text-gray-700 mb-1">
            请输入 &quot;确认删除&quot; 以继续：
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError('') }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="确认删除"
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
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            彻底删除
          </button>
        </div>
      </div>
    </div>
  )
}
