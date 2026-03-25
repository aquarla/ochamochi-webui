import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MastodonClient } from '../services/mastodon'
import { EmojiPicker, emojiCache, emojiFetching } from './EmojiPicker'
import { UNICODE_EMOJI } from '../data/unicodeEmoji'
import type { Status, CustomEmoji } from '../types'

type EmojiSuggestion =
  | { kind: 'custom'; emoji: CustomEmoji }
  | { kind: 'unicode'; shortcode: string; char: string }

interface AttachmentItem {
  mediaId: string
  previewUrl: string
  isExisting?: boolean
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
  editStatus?: Status
  onEdited?: (updated: Status) => void
  defaultVisibility?: Visibility
}

const MAX_CHARS = 500
const VISIBILITY_KEY = 'mastodon_visibility'

function getMinDatetime(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDefaultSchedule(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatScheduledAt(dt: string): string {
  return new Date(dt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type Visibility = 'public' | 'unlisted' | 'private' | 'direct'

function visibilityStorageKey(accountKey?: string): string {
  return accountKey ? `${VISIBILITY_KEY}_${accountKey}` : VISIBILITY_KEY
}

function loadVisibility(accountKey?: string): Visibility {
  return (localStorage.getItem(visibilityStorageKey(accountKey)) as Visibility | null) ?? 'public'
}

export function ComposeForm({ instanceUrl, accessToken, accountKey, onComposed, inReplyToId, initialText, onCancel, inline, editStatus, onEdited, defaultVisibility }: ComposeFormProps) {
  const isEditMode = !!editStatus
  const noSaveVisibility = isEditMode || defaultVisibility !== undefined

  const [text, setText] = useState(initialText ?? '')
  const [visibility, setVisibility] = useState<Visibility>(() =>
    isEditMode ? (editStatus.visibility as Visibility) : (defaultVisibility ?? loadVisibility(accountKey))
  )
  const [cwEnabled, setCwEnabled] = useState(isEditMode ? !!editStatus.spoiler_text : false)
  const [cwText, setCwText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sourceLoading, setSourceLoading] = useState(isEditMode)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentItem[]>(() =>
    isEditMode
      ? editStatus.media_attachments.map((m) => ({ mediaId: m.id, previewUrl: m.preview_url, isExisting: true }))
      : []
  )
  const [uploading, setUploading] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [pendingSchedule, setPendingSchedule] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cwRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [emojiSuggestions, setEmojiSuggestions] = useState<EmojiSuggestion[]>([])
  const [emojiTriggerStart, setEmojiTriggerStart] = useState(-1)
  const [emojiSelectedIndex, setEmojiSelectedIndex] = useState(0)
  const [emojiDropdownPos, setEmojiDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([])
  const [hashtagTriggerStart, setHashtagTriggerStart] = useState(-1)
  const [hashtagSelectedIndex, setHashtagSelectedIndex] = useState(0)
  const [hashtagDropdownPos, setHashtagDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const hashtagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 編集モード: 投稿の本文ソースを取得して初期値に設定
  useEffect(() => {
    if (!isEditMode) return
    const client = new MastodonClient(instanceUrl, accessToken)
    client.getStatusSource(editStatus.id)
      .then((src) => {
        setText(src.text)
        if (src.spoiler_text) {
          setCwEnabled(true)
          setCwText(src.spoiler_text)
        }
      })
      .catch(() => {
        // フォールバック: content HTMLをそのまま使用（プレーンテキスト化）
        const tmp = document.createElement('div')
        tmp.innerHTML = editStatus.content
        setText(tmp.textContent ?? '')
        if (editStatus.spoiler_text) {
          setCwEnabled(true)
          setCwText(editStatus.spoiler_text)
        }
      })
      .finally(() => {
        setSourceLoading(false)
        textareaRef.current?.focus()
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEditMode && inReplyToId && textareaRef.current) {
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
    const urls = attachments.filter((a) => !a.isExisting).map((a) => a.previewUrl)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  // カスタム絵文字をキャッシュしておく（補完用）
  useEffect(() => {
    if (emojiCache[instanceUrl] || emojiFetching[instanceUrl]) return
    emojiFetching[instanceUrl] = true
    const client = new MastodonClient(instanceUrl, accessToken)
    client.getCustomEmojis()
      .then((data) => {
        emojiCache[instanceUrl] = data
          .filter((e) => e.visible_in_picker !== false)
          .sort((a, b) => a.shortcode.localeCompare(b.shortcode))
      })
      .catch(() => {})
      .finally(() => { emojiFetching[instanceUrl] = false })
  }, [instanceUrl, accessToken])

  const remaining = MAX_CHARS - text.length - (cwEnabled ? cwText.length : 0)
  const isOverLimit = remaining < 0
  const canSubmit = (text.trim().length > 0 || attachments.length > 0) && !isOverLimit && !loading && !uploading && !sourceLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      if (isEditMode) {
        const updated = await client.editStatus(editStatus.id, {
          status: text,
          spoiler_text: cwEnabled && cwText ? cwText : '',
          sensitive: cwEnabled,
          media_ids: attachments.map((a) => a.mediaId),
        })
        attachments.filter((a) => !a.isExisting).forEach((a) => URL.revokeObjectURL(a.previewUrl))
        onEdited?.(updated)
        onCancel?.()
      } else {
        await client.postStatus({
          status: text,
          visibility,
          in_reply_to_id: inReplyToId,
          spoiler_text: cwEnabled && cwText ? cwText : undefined,
          sensitive: cwEnabled,
          media_ids: attachments.length > 0 ? attachments.map((a) => a.mediaId) : undefined,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        })
        attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl))
        setText('')
        setCwEnabled(false)
        setCwText('')
        setAttachments([])
        setScheduledAt('')
        onComposed?.()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : isEditMode ? '編集に失敗しました' : '投稿に失敗しました')
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (emojiSuggestions.length > 0) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setEmojiSuggestions([])
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setEmojiSelectedIndex((i) => Math.min(i + 1, emojiSuggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setEmojiSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertEmojiSuggestion(emojiSuggestions[emojiSelectedIndex])
        return
      }
    }
    if (hashtagSuggestions.length > 0) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setHashtagSuggestions([])
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHashtagSelectedIndex((i) => Math.min(i + 1, hashtagSuggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHashtagSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertHashtagSuggestion(hashtagSuggestions[hashtagSelectedIndex])
        return
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleVisibilityChange = (v: Visibility) => {
    setVisibility(v)
    if (!noSaveVisibility) {
      localStorage.setItem(visibilityStorageKey(accountKey), v)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setText(value)
    const cursor = e.target.selectionStart ?? value.length
    const before = value.slice(0, cursor)
    const match = before.match(/:(\w{2,})$/)
    if (match) {
      const query = match[1].toLowerCase()
      const customMatches: EmojiSuggestion[] = (emojiCache[instanceUrl] ?? [])
        .filter((em) => em.shortcode.toLowerCase().includes(query))
        .slice(0, 8)
        .map((em) => ({ kind: 'custom', emoji: em }))
      const unicodeMatches: EmojiSuggestion[] = UNICODE_EMOJI
        .filter((em) => em.shortcode.toLowerCase().includes(query))
        .slice(0, 8 - customMatches.length)
        .map((em) => ({ kind: 'unicode', shortcode: em.shortcode, char: em.emoji }))
      const suggestions = [...customMatches, ...unicodeMatches].slice(0, 8)
      if (suggestions.length > 0) {
        setEmojiSuggestions(suggestions)
        setEmojiTriggerStart(cursor - match[1].length - 1)
        setEmojiSelectedIndex(0)
        const rect = e.target.getBoundingClientRect()
        setEmojiDropdownPos({ top: rect.top, left: rect.left, width: rect.width })
        return
      }
    }
    setEmojiSuggestions([])
    setEmojiTriggerStart(-1)
    setEmojiDropdownPos(null)

    // ハッシュタグ補完
    const hashMatch = before.match(/#(\S+)$/)
    if (hashMatch) {
      const query = hashMatch[1]
      const triggerStart = cursor - query.length - 1
      const rect = e.target.getBoundingClientRect()
      setHashtagTriggerStart(triggerStart)
      setHashtagSelectedIndex(0)
      setHashtagDropdownPos({ top: rect.top, left: rect.left, width: rect.width })
      if (hashtagDebounceRef.current) clearTimeout(hashtagDebounceRef.current)
      hashtagDebounceRef.current = setTimeout(async () => {
        try {
          const client = new MastodonClient(instanceUrl, accessToken)
          const result = await client.search(query, 'hashtags', { limit: 8 })
          setHashtagSuggestions(result.hashtags.map((t) => t.name))
        } catch {
          setHashtagSuggestions([])
        }
      }, 300)
      return
    }
    setHashtagSuggestions([])
    setHashtagTriggerStart(-1)
    setHashtagDropdownPos(null)
    if (hashtagDebounceRef.current) clearTimeout(hashtagDebounceRef.current)
  }

  const insertHashtagSuggestion = (tag: string) => {
    const el = textareaRef.current
    if (!el) return
    const cursor = el.selectionStart ?? text.length
    const inserted = `#${tag} `
    const next = text.slice(0, hashtagTriggerStart) + inserted + text.slice(cursor)
    setText(next)
    setHashtagSuggestions([])
    setHashtagTriggerStart(-1)
    setHashtagDropdownPos(null)
    const newCursor = hashtagTriggerStart + inserted.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
    })
  }

  const insertEmojiSuggestion = (suggestion: EmojiSuggestion) => {
    const el = textareaRef.current
    if (!el) return
    const cursor = el.selectionStart ?? text.length
    const shortcode = suggestion.kind === 'custom'
      ? `:${suggestion.emoji.shortcode}:`
      : suggestion.char
    const next = text.slice(0, emojiTriggerStart) + shortcode + text.slice(cursor)
    setText(next)
    setEmojiSuggestions([])
    setEmojiTriggerStart(-1)
    setEmojiDropdownPos(null)
    const newCursor = emojiTriggerStart + shortcode.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
    })
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)
    if (files.length === 0) return
    e.preventDefault()
    const slots = 4 - attachments.length
    const toUpload = files.slice(0, slots)
    if (toUpload.length === 0) return
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
      if (item && !item.isExisting) URL.revokeObjectURL(item.previewUrl)
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
          disabled={loading || sourceLoading}
        />
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={
          sourceLoading
            ? '読み込み中…'
            : isEditMode
            ? '本文を編集… (Ctrl+Enter で保存)'
            : inReplyToId
            ? '返信を入力… (Ctrl+Enter で投稿)'
            : '今どうしてる？ (Ctrl+Enter で投稿)'
        }
        autoFocus={!isEditMode}
        rows={inline ? 2 : 3}
        className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading || sourceLoading}
      />
      {emojiSuggestions.length > 0 && emojiDropdownPos && createPortal(
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-[9999] overflow-hidden"
          style={{
            bottom: window.innerHeight - emojiDropdownPos.top + 4,
            left: emojiDropdownPos.left,
            width: emojiDropdownPos.width,
          }}
        >
          {emojiSuggestions.map((s, i) => (
            <button
              key={s.kind === 'custom' ? `c:${s.emoji.shortcode}` : `u:${s.shortcode}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertEmojiSuggestion(s) }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${i === emojiSelectedIndex ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              {s.kind === 'custom' ? (
                <img src={s.emoji.static_url} alt={s.emoji.shortcode} className="w-5 h-5 object-contain flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center text-base leading-none flex-shrink-0">{s.char}</span>
              )}
              <span className="text-xs">:{s.kind === 'custom' ? s.emoji.shortcode : s.shortcode}:</span>
            </button>
          ))}
        </div>,
        document.body
      )}
      {hashtagSuggestions.length > 0 && hashtagDropdownPos && createPortal(
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-[9999] overflow-hidden"
          style={{
            bottom: window.innerHeight - hashtagDropdownPos.top + 4,
            left: hashtagDropdownPos.left,
            width: hashtagDropdownPos.width,
          }}
        >
          {hashtagSuggestions.map((tag, i) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertHashtagSuggestion(tag) }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${i === hashtagSelectedIndex ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="text-blue-400 flex-shrink-0">#</span>
              <span className="text-xs">{tag}</span>
            </button>
          ))}
        </div>,
        document.body
      )}

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {attachments.map((a) => (
            <div key={a.mediaId} className="relative w-32 h-32">
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

      {!isEditMode && scheduledAt && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-blue-400 text-xs">{formatScheduledAt(scheduledAt)} に予約投稿</span>
          <button
            type="button"
            onClick={() => setScheduledAt('')}
            className="text-gray-500 hover:text-gray-300 transition-colors ml-0.5"
            title="予約を解除"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 gap-x-2 gap-y-1 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed border rounded px-2 py-1 transition-colors"
            title="画像を添付"
            disabled={loading || uploading || attachments.length >= 4 || sourceLoading}
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
            disabled={loading || sourceLoading}
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
            disabled={loading || sourceLoading}
          >
            😀
          </button>

          {!isEditMode && (
            <button
              type="button"
              onClick={() => {
                setPendingSchedule(scheduledAt || getDefaultSchedule())
                setShowSchedulePicker(true)
              }}
              className={`px-2 py-1 rounded border transition-colors ${
                scheduledAt
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
              title="投稿日時を設定"
              disabled={loading}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          <select
            value={visibility}
            onChange={(e) => handleVisibilityChange(e.target.value as Visibility)}
            className="bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading || sourceLoading}
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
            {loading
              ? isEditMode ? '編集中...' : '投稿中...'
              : isEditMode ? '編集する'
              : scheduledAt ? '予約投稿'
              : inReplyToId ? '返信'
              : '投稿'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}

      {!isEditMode && showSchedulePicker && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowSchedulePicker(false)}
        >
          <div
            className="bg-gray-800 rounded-xl p-5 w-80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold mb-3">投稿日時を設定</h3>
            <input
              type="datetime-local"
              value={pendingSchedule}
              min={getMinDatetime()}
              onChange={(e) => setPendingSchedule(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-400 text-xs mt-1.5">※ 5分以上先の日時を指定してください</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowSchedulePicker(false)}
                className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  setScheduledAt(pendingSchedule)
                  setShowSchedulePicker(false)
                }}
                disabled={!pendingSchedule}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
              >
                設定
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
