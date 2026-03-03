import { useState, useRef } from 'react'
import { MastodonClient } from '../services/mastodon'

interface ComposeFormProps {
  instanceUrl: string
  accessToken: string
  onComposed?: () => void
  inReplyToId?: string
  initialText?: string
  onCancel?: () => void
  inline?: boolean
}

const MAX_CHARS = 500
const VISIBILITY_KEY = 'mastodon_visibility'

type Visibility = 'public' | 'unlisted' | 'private' | 'direct'

function loadVisibility(): Visibility {
  return (localStorage.getItem(VISIBILITY_KEY) as Visibility | null) ?? 'public'
}

export function ComposeForm({ instanceUrl, accessToken, onComposed, inReplyToId, initialText, onCancel, inline }: ComposeFormProps) {
  const [text, setText] = useState(initialText ?? '')
  const [visibility, setVisibility] = useState<Visibility>(loadVisibility)

  const handleVisibilityChange = (v: Visibility) => {
    setVisibility(v)
    localStorage.setItem(VISIBILITY_KEY, v)
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = MAX_CHARS - text.length
  const isOverLimit = remaining < 0
  const canSubmit = text.trim().length > 0 && !isOverLimit && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      await client.postStatus({ status: text, visibility, in_reply_to_id: inReplyToId })
      setText('')
      onComposed?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '投稿に失敗しました')
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={inline ? 'pt-2' : 'p-3 border-b border-gray-700'}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={inReplyToId ? '返信を入力… (Ctrl+Enter で投稿)' : '今どうしてる？ (Ctrl+Enter で投稿)'}
        autoFocus={!!inReplyToId}
        rows={inline ? 2 : 3}
        className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      />

      <div className="flex items-center justify-between mt-2 gap-2">
        <select
          value={visibility}
          onChange={(e) => handleVisibilityChange(e.target.value as Visibility)}
          className="bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="public">公開</option>
          <option value="unlisted">未収載</option>
          <option value="private">フォロワー限定</option>
          <option value="direct">ダイレクト</option>
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <span className={`text-xs ${isOverLimit ? 'text-red-400' : remaining < 50 ? 'text-yellow-400' : 'text-gray-500'}`}>
            {remaining}
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-white text-xs font-medium rounded px-3 py-1.5 transition-colors"
            >
              キャンセル
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-medium rounded px-3 py-1.5 transition-colors"
          >
            {loading ? '投稿中...' : inReplyToId ? '返信' : '投稿'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </form>
  )
}
