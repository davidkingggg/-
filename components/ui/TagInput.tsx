'use client'

import { useRef } from 'react'

interface TagInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: readonly string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * TagInput — 推荐标签点选 + 手动输入（完全受控组件）。
 * 标签点选快速填入；也可以直接在输入框输入任意内容。
 */
export default function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  disabled,
}: TagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleTagClick(tag: string) {
    onChange(tag)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      onChange('')
    }
  }

  function handleClear() {
    onChange('')
    inputRef.current?.focus()
  }

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'

  return (
    <div className={className}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass + (disabled ? ' bg-gray-50 text-gray-400' : '')}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map(tag => (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => handleTagClick(tag)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                value === tag
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
