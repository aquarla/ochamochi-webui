import { useState, useRef, useEffect } from 'react'
import { MastodonClient } from '../services/mastodon'
import { EmojiPicker } from './EmojiPicker'

interface AttachmentItem {
  mediaId: string
  previewUrl: string
}

interface ComposeFormProps {
  instanceUrl: string
  accessToken: string
  accountKey?: string
  onComposed?: () => void
  inReplyToId?: string
  initialText?: string
  onCancel?: () => void
  inline?: boolean
}

const MAX_CHARS = 500
const VISIBILITY_KEY = 'mastodon_visibility'

type Visibility = 'public' | 'unlisted' | 'private' | 'direct'

function visibilityStorageKey(accountKey?: string): string {
  return accountKey ? `${VISIBILITY_KEY}_${accountKey}` : VISIBILITY_KEY
}

function loadVisibility(accountKey?: string): Visibility {
  return (localStorage.getItem(visibilityStorageKey(accountKey)) as Visibility | null) ?? 'public'
}

export function ComposeForm({ instanceUrl, accessToken, accountKey, onComposed, inReplyToId, initialText, onCancel, inline }: ComposeFormProps) {
  const [text, setText] = useState(initialText ?? '')
  const [visibility, setVisibility] = useState<Visibility>(() => loadVisibility(accountKey))
  const [cwEnabled, setCwEnabled] = useState(false)
  const [cwText, setCwText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cwRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inReplyToId && textareaRef.current) {
      const el = textareaRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [])

  useEffect(() => {
    if (cwEnabled) {
      cwRef.current?.focus()
    }
  }, [cwEnabled])

  useEffect(() => {
    const urls = attachments.map((a) => a.previewUrl)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const remaining = MAX_CHARS - text.length - (cwEnabled ? cwText.length : 0)
  const isOverLimit = remaining < 0
  const canSubmit = (text.trim().length > 0 || attachments.length > 0) && !isOverLimit && !loading && !uploading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      await client.postStatus({
        status: text,
        visibility,
        in_reply_to_id: inReplyToId,
        spoiler_text: cwEnabled && cwText ? cwText : undefined,
        sensitive: cwEnabled,
        media_ids: attachments.length > 0 ? attachments.map((a) => a.mediaId) : undefined,
      })
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl))
      setText('')
      setCwEnabled(false)
      setCwText('')
      setAttachments([])
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

  const handleVisibilityChange = (v: Visibility) => {
    setVisibility(v)
    localStorage.setItem(visibilityStorageKey(accountKey), v)
  }

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const next = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    const cursor = start + emoji.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
    setShowEmojiPicker(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const slots = 4 - attachments.length
    const toUpload = files.slice(0, slots)
    setUploading(true)
    setError(null)
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      const results = await Promise.all(
        toUpload.map(async (file) => {
          const previewUrl = URL.createObjectURL(file)
          const media = await client.uploadMedia(file)
          return { mediaId: media.id, previewUrl }
        }),
      )
      setAttachments((prev) => [...prev, ...results])
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = (mediaId: string) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.mediaId === mediaId)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((a) => a.mediaId !== mediaId)
    })
  }

  return (
    <form onSubmit={handleSubmit} className={inline ? 'pt-2' : 'p-3 border-b border-gray-700'}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      {cwEnabled && (
        <input
          ref={cwRef}
          type="text"
          value={cwText}
          onChange={(e) => setCwText(e.target.value)}
          placeholder="警告文（省略可）"
          className="w-full bg-gray-700 text-yellow-300 placeholder-yellow-700 border border-yellow-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent mb-2"
          disabled={loading}
        />
      )}

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

      {attachments.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {attachments.map((a) => (
            <div key={a.mediaId} className="relative aspect-square">
              <img
                src={a.previewUrl}
                alt=""
                className="w-full h-full object-cover rounded"
              />
              <button
                type="button"
                onClick={() => removeAttachment(a.mediaId)}
                className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-black/70 hover:bg-black/90 text-white rounded-full text-xs leading-none"
                title="削除"
              >
                ×
              </button>
            </div>
          ))}
          {uploading && (
            <div className="aspect-square flex items-center justify-center bg-gray-700 rounded">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      )}

      {showEmojiPicker && (
        <EmojiPicker instanceUrl={instanceUrl} accessToken={accessToken} onSelect={insertEmoji} />
      )}

      <div className="flex items-center justify-between mt-2 gap-x-2 gap-y-1 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed border rounded px-2 py-1 transition-colors"
            title="画像を添付"
            disabled={loading || uploading || attachments.length >= 4}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setCwEnabled((v) => !v)}
            className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${
              cwEnabled
                ? 'bg-yellow-600 border-yellow-500 text-white'
                : 'border-gray-600 text-gray-400 hover:border-yellow-600 hover:text-yellow-400'
            }`}
            title="Content Warning"
            disabled={loading}
          >
            CW
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              showEmojiPicker
                ? 'bg-gray-600 border-gray-500 text-white'
                : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
            title="絵文字"
            disabled={loading}
          >
            😀
          </button>

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
        </div>

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
