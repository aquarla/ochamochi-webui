import { useState } from 'react'
import type { ColumnType } from '../types'

interface AddColumnModalProps {
  onAdd: (type: ColumnType, tag?: string) => void
  onClose: () => void
}

export function AddColumnModal({ onAdd, onClose }: AddColumnModalProps) {
  const [type, setType] = useState<ColumnType>('tag')
  const [tag, setTag] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'tag' && !tag.trim()) return
    onAdd(type, type === 'tag' ? tag.trim().replace(/^#/, '') : undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">カラムを追加</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['home', 'notifications', 'local', 'public', 'tag'] as ColumnType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {t === 'home' ? 'ホーム' : t === 'notifications' ? '通知' : t === 'local' ? 'ローカル' : t === 'public' ? '連合' : 'タグ'}
              </button>
            ))}
          </div>

          {type === 'tag' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">タグ名</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="mastodon (# 不要)"
                className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            disabled={type === 'tag' && !tag.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            追加
          </button>
        </form>
      </div>
    </div>
  )
}
