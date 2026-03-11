import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Status, Account } from '../types'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { EditStatusModal } from './EditStatusModal'
import { ReplyModal } from './ReplyModal'
import { MediaGrid } from './MediaGrid'
import type { StoredAccountEntry } from '../services/auth'
import { loadSettings } from '../hooks/useSettings'

interface PostProps {
  status: Status
  instanceUrl: string
  accessToken: string
  accountKey?: string
  onUpdate: (status: Status) => void
  onDelete?: (id: string) => void
  onOpenDetail?: (status: Status) => void
  onOpenProfile?: (account: Account) => void
  onAddTagColumn?: (tag: string) => void
  onMuteAccount?: (accountId: string) => void
  currentAccountId?: string
  pinned?: boolean
  accounts?: StoredAccountEntry[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 10) return '今'
  if (diffSec < 60) return `${diffSec}秒前`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}分前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}時間前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}日前`
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export function Post({ status, instanceUrl, accessToken, accountKey, onUpdate, onDelete, onOpenDetail, onOpenProfile, onAddTagColumn, onMuteAccount, currentAccountId, pinned, accounts }: PostProps) {
  const [actionLoading, setActionLoading] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [expandedSection, setExpandedSection] = useState<'import' | 'fav' | 'boost' | null>(null)
  // keys: "${accountKey}:import" | "${accountKey}:fav" | "${accountKey}:boost"
  const [importStates, setImportStates] = useState<Record<string, 'idle' | 'loading' | 'ok' | 'error'>>({})
  const [showMuteDialog, setShowMuteDialog] = useState(false)
  const [muteDuration, setMuteDuration] = useState('0')
  const [muteNotifications, setMuteNotifications] = useState(true)
  const [muteLoading, setMuteLoading] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showFavDialog, setShowFavDialog] = useState(false)
  const [showBoostDialog, setShowBoostDialog] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // Accounts eligible for "import to another server" (exclude the current viewing account)
  const importableAccounts = (accounts ?? []).filter(
    (a) => !(a.instanceUrl === instanceUrl && a.accessToken === accessToken)
      && loadSettings(a.accountKey).allowCrossAccountAction
  )

  const displayStatus = status.reblog ?? status
  const isReblog = !!status.reblog
  const hasCw = !!displayStatus.spoiler_text
  const [cwOpen, setCwOpen] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const truncateUrl = loadSettings(accountKey).truncateUrl

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        menuButtonRef.current && !menuButtonRef.current.contains(target)
      ) {
        setShowMenu(false)
        setExpandedSection(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
      if (!link) return

      // ハッシュタグリンク
      const tagMatch = link.href.match(/\/tags\/([^/?#]+)/)
      if (tagMatch && onAddTagColumn) {
        e.preventDefault()
        onAddTagColumn(decodeURIComponent(tagMatch[1]))
        return
      }

      // メンションリンク
      if (onOpenProfile) {
        const mention = displayStatus.mentions.find((m) => link.href === m.url)
        if (mention) {
          e.preventDefault()
          const client = new MastodonClient(instanceUrl, accessToken)
          client.getAccountById(mention.id).then(onOpenProfile).catch(() => {})
        }
      }
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [onAddTagColumn, onOpenProfile, displayStatus.mentions, instanceUrl, accessToken])

  // Truncate plain URL link text (Mastodon's invisible/ellipsis spans are handled via CSS classes)
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const URL_MAX = 40
    el.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      if (link.querySelector('.invisible, .ellipsis')) return
      const saved = link.getAttribute('data-orig-url')
      const text = saved ?? link.textContent ?? ''
      if (!text.startsWith('http://') && !text.startsWith('https://')) return
      if (truncateUrl && text.length > URL_MAX) {
        if (!saved) link.setAttribute('data-orig-url', text)
        link.textContent = text.slice(0, URL_MAX) + '…'
      } else if (!truncateUrl && saved) {
        link.textContent = saved
        link.removeAttribute('data-orig-url')
      }
    })
  }, [truncateUrl])

  const isOwnPost = !!currentAccountId && displayStatus.account.id === currentAccountId

  const handleDelete = async () => {
    if (deleteLoading) return
    setDeleteLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.deleteStatus(displayStatus.id)
      onDelete?.(status.id)
      setShowDeleteDialog(false)
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleImport = async (entry: StoredAccountEntry, action: 'import' | 'fav' | 'boost') => {
    const key = `${entry.accountKey}:${action}`
    if (importStates[key] === 'loading' || importStates[key] === 'ok') return
    setImportStates((prev) => ({ ...prev, [key]: 'loading' }))
    const url = displayStatus.url ?? displayStatus.uri
    const client = new MastodonClient(entry.instanceUrl, entry.accessToken)
    try {
      const resolved = await client.searchResolveStatus(url)
      if (action === 'fav' || action === 'boost') {
        await client.favouriteStatus(resolved.id)
      }
      if (action === 'boost') {
        await client.reblogStatus(resolved.id)
      }
      setImportStates((prev) => ({ ...prev, [key]: 'ok' }))
    } catch {
      setImportStates((prev) => ({ ...prev, [key]: 'error' }))
    }
  }

  const handleMute = async () => {
    if (muteLoading) return
    setMuteLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.muteAccount(displayStatus.account.id, {
        duration: parseInt(muteDuration),
        notifications: muteNotifications,
      })
      setShowMuteDialog(false)
      onMuteAccount?.(displayStatus.account.id)
    } catch {
      // ignore
    } finally {
      setMuteLoading(false)
    }
  }

  const handleBlock = async () => {
    if (blockLoading) return
    setBlockLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.blockAccount(displayStatus.account.id)
      setShowBlockDialog(false)
    } catch {
      // ignore
    } finally {
      setBlockLoading(false)
    }
  }

  const applyUpdate = (patch: Partial<typeof displayStatus>) => {
    const next = { ...displayStatus, ...patch }
    onUpdate(isReblog ? { ...status, reblog: next } : { ...status, ...next })
  }

  const executeFavourite = async () => {
    if (actionLoading) return
    const wasFavourited = displayStatus.favourited
    setShowFavDialog(false)
    setActionLoading(true)
    applyUpdate({
      favourited: !wasFavourited,
      favourites_count: displayStatus.favourites_count + (wasFavourited ? -1 : 1),
    })
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      const updated = wasFavourited
        ? await client.unfavouriteStatus(displayStatus.id)
        : await client.favouriteStatus(displayStatus.id)
      onUpdate(isReblog ? { ...status, reblog: updated } : { ...status, ...updated })
    } catch {
      applyUpdate({ favourited: wasFavourited, favourites_count: displayStatus.favourites_count })
    } finally {
      setActionLoading(false)
    }
  }

  const handleFavourite = () => {
    if (actionLoading) return
    if (!displayStatus.favourited && loadSettings(accountKey).confirmFavourite) {
      setShowFavDialog(true)
      return
    }
    executeFavourite()
  }

  const handleBookmark = async () => {
    if (actionLoading) return
    setActionLoading(true)
    const wasBookmarked = displayStatus.bookmarked
    applyUpdate({ bookmarked: !wasBookmarked })
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      const updated = wasBookmarked
        ? await client.unbookmarkStatus(displayStatus.id)
        : await client.bookmarkStatus(displayStatus.id)
      onUpdate(isReblog ? { ...status, reblog: updated } : { ...status, ...updated })
    } catch {
      applyUpdate({ bookmarked: wasBookmarked })
    } finally {
      setActionLoading(false)
    }
  }

  const executeReblog = async () => {
    if (actionLoading) return
    const wasReblogged = displayStatus.reblogged
    setShowBoostDialog(false)
    setActionLoading(true)
    applyUpdate({
      reblogged: !wasReblogged,
      reblogs_count: displayStatus.reblogs_count + (wasReblogged ? -1 : 1),
    })
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      const updated = wasReblogged
        ? await client.unreblogStatus(displayStatus.id)
        : await client.reblogStatus(displayStatus.id)
      // reblogStatus returns the new reblog wrapper; the original is in updated.reblog
      // unreblogStatus returns the original directly
      const source = !wasReblogged && updated.reblog ? updated.reblog : updated
      onUpdate(isReblog ? { ...status, reblog: source } : { ...status, ...source })
    } catch {
      applyUpdate({ reblogged: wasReblogged, reblogs_count: displayStatus.reblogs_count })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReblog = () => {
    if (actionLoading) return
    if (!displayStatus.reblogged && loadSettings(accountKey).confirmBoost) {
      setShowBoostDialog(true)
      return
    }
    executeReblog()
  }

  return (
    <article className="border-b border-gray-700 p-3 hover:bg-gray-750 transition-colors">
      {pinned && (
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
          ピン止め
        </p>
      )}

      {isReblog && (
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <button
            onClick={() => onOpenProfile?.(status.account)}
            className={onOpenProfile ? 'hover:text-gray-300 transition-colors' : 'cursor-default'}
            dangerouslySetInnerHTML={{ __html: emojifyText(status.account.display_name || status.account.username, status.account.emojis) }}
          /> がブースト
        </p>
      )}

      <div className="flex gap-3 items-start">
        <button
          onClick={() => onOpenProfile?.(displayStatus.account)}
          className={`flex-shrink-0 rounded-full ${onOpenProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
        >
          <img
            src={displayStatus.account.avatar_static}
            alt={displayStatus.account.display_name || displayStatus.account.username}
            className="w-10 h-10 rounded-full bg-gray-700"
            loading="lazy"
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className="font-medium text-white text-sm truncate"
              dangerouslySetInnerHTML={{ __html: emojifyText(displayStatus.account.display_name || displayStatus.account.username, displayStatus.account.emojis) }}
            />
            <span className="text-gray-500 text-xs truncate">@{displayStatus.account.acct}</span>
            <span className="flex items-center gap-1 ml-auto flex-shrink-0 text-gray-600">
              {displayStatus.visibility === 'public' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {displayStatus.visibility === 'unlisted' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {displayStatus.visibility === 'private' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {displayStatus.visibility === 'direct' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              )}
              {onOpenDetail ? (
                <button
                  onClick={() => onOpenDetail(displayStatus)}
                  className="text-xs hover:text-blue-400 transition-colors"
                >
                  {formatDate(displayStatus.created_at)}
                </button>
              ) : (
                <span className="text-xs">{formatDate(displayStatus.created_at)}</span>
              )}
            </span>
          </div>

          {hasCw && (
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-yellow-400 text-sm font-medium flex-1"
                dangerouslySetInnerHTML={{ __html: emojifyText(displayStatus.spoiler_text, displayStatus.emojis) }}
              />
              <button
                onClick={() => setCwOpen((v) => !v)}
                className="flex-shrink-0 text-xs px-2 py-0.5 rounded border border-yellow-600 text-yellow-400 hover:bg-yellow-900/40 transition-colors"
              >
                {cwOpen ? '隠す' : '表示'}
              </button>
            </div>
          )}

          {(!hasCw || cwOpen) && (
            <>
              <div
                ref={contentRef}
                className={`text-gray-200 text-sm leading-relaxed prose prose-sm prose-invert max-w-none break-words [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_p]:mb-1${truncateUrl ? " [&_.invisible]:hidden [&_.ellipsis]:after:content-['…']" : ''}`}
                dangerouslySetInnerHTML={{ __html: emojifyHtml(displayStatus.content, displayStatus.emojis) }}
              />

              <MediaGrid
                attachments={displayStatus.media_attachments}
                sensitive={displayStatus.sensitive}
              />

              {loadSettings(accountKey).showPreviewCard && displayStatus.card && displayStatus.card.title && (
                <a
                  href={displayStatus.card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex flex-col border border-gray-600 rounded-lg overflow-hidden hover:border-gray-400 transition-colors bg-gray-750 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayStatus.card.image && (
                    <img
                      src={displayStatus.card.image}
                      alt=""
                      className="w-full max-h-36 object-cover bg-gray-700"
                      loading="lazy"
                    />
                  )}
                  <div className="px-3 py-2 min-w-0">
                    <p className="text-white text-xs font-medium leading-snug line-clamp-2">{displayStatus.card.title}</p>
                    {displayStatus.card.description && (
                      <p className="text-gray-400 text-xs leading-snug mt-0.5 line-clamp-2">{displayStatus.card.description}</p>
                    )}
                    <p className="text-gray-500 text-[11px] mt-1 truncate">
                      {displayStatus.card.provider_name || new URL(displayStatus.card.url).hostname}
                    </p>
                  </div>
                </a>
              )}

              {(() => {
                const content = displayStatus.content
                const contentLower = content.toLowerCase()
                const hiddenTags = displayStatus.tags.filter((t) => {
                  const nameLower = t.name.toLowerCase()
                  const encoded = encodeURIComponent(t.name)
                  return (
                    !contentLower.includes(`/tags/${nameLower}`) &&
                    !content.includes(`/tags/${encoded}`)
                  )
                })
                if (hiddenTags.length === 0) return null
                return (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {hiddenTags.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => onAddTagColumn?.(t.name)}
                        className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                      >
                        #{t.name}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </>
          )}

          <div className="flex items-center gap-4 mt-2 text-gray-500">
            <button
              onClick={() => setReplyOpen((v) => !v)}
              className={`flex items-center gap-1 text-xs hover:text-blue-400 transition-colors ${replyOpen ? 'text-blue-400' : ''}`}
              title="返信"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              {displayStatus.replies_count > 0 && <span>{displayStatus.replies_count}</span>}
            </button>

            <button
              onClick={handleReblog}
              disabled={actionLoading}
              className={`flex items-center gap-1 text-xs hover:text-green-400 transition-colors ${displayStatus.reblogged ? 'text-green-400' : ''}`}
              title="ブースト"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {displayStatus.reblogs_count > 0 && <span>{displayStatus.reblogs_count}</span>}
            </button>

            <button
              onClick={handleFavourite}
              disabled={actionLoading}
              className={`flex items-center gap-1 text-xs hover:text-yellow-400 transition-colors ${displayStatus.favourited ? 'text-yellow-400' : ''}`}
              title="お気に入り"
            >
              <svg className="w-4 h-4" fill={displayStatus.favourited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {displayStatus.favourites_count > 0 && <span>{displayStatus.favourites_count}</span>}
            </button>

            <button
              onClick={handleBookmark}
              disabled={actionLoading}
              className={`flex items-center gap-1 text-xs hover:text-blue-400 transition-colors ${displayStatus.bookmarked ? 'text-blue-400' : ''}`}
              title="ブックマーク"
            >
              <svg className="w-4 h-4" fill={displayStatus.bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              {isOwnPost && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1 text-xs hover:text-blue-400 transition-colors"
                  title="編集"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {isOwnPost && (
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-1 text-xs hover:text-red-400 transition-colors"
                  title="削除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <div className="relative">
                <button
                  ref={menuButtonRef}
                  onClick={() => {
                    if (!showMenu && menuButtonRef.current) {
                      const r = menuButtonRef.current.getBoundingClientRect()
                      setMenuPos({ top: r.bottom + 4, left: r.left })
                    }
                    setShowMenu((v) => !v)
                    setExpandedSection(null)
                  }}
                  className="flex items-center text-xs hover:text-gray-300 transition-colors"
                  title="その他"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>
                {showMenu && menuPos && createPortal(
                  <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
                    className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden min-w-max">
                    <a
                      href={displayStatus.url ?? displayStatus.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      元のサイトで開く
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(displayStatus.url ?? displayStatus.uri)
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border-t border-gray-700"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      元のサイトへのリンクをコピー
                    </button>

                    {!isOwnPost && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setShowMenu(false); setShowMuteDialog(true) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-orange-400 hover:bg-gray-700 hover:text-orange-300 transition-colors border-t border-gray-700"
                        >
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          このユーザーをミュートする
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowMenu(false); setShowBlockDialog(true) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors border-t border-gray-700"
                        >
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          このユーザーをブロックする
                        </button>
                      </>
                    )}

                    {importableAccounts.length > 0 && (
                      <>
                        {(
                          [
                            { section: 'import', label: '別サーバーへ取り込む' },
                            { section: 'fav',    label: '別サーバーでお気に入り' },
                            { section: 'boost',  label: '別サーバーでお気に入り＆ブースト' },
                          ] as const
                        ).map(({ section, label }) => (
                          <div key={section}>
                            <button
                              type="button"
                              onClick={() => setExpandedSection((v) => v === section ? null : section)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border-t border-gray-700 first:border-t-0"
                            >
                              <span className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {label}
                              </span>
                              <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${expandedSection === section ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {expandedSection === section && (
                              <div className="border-t border-gray-700">
                                {importableAccounts.map((entry) => {
                                  const state = importStates[`${entry.accountKey}:${section}`] ?? 'idle'
                                  return (
                                    <button
                                      key={entry.accountKey}
                                      type="button"
                                      onClick={() => handleImport(entry, section)}
                                      disabled={state === 'loading' || state === 'ok'}
                                      className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-default"
                                    >
                                      <img src={entry.account.avatar_static} alt="" className="w-4 h-4 rounded-full flex-shrink-0" />
                                      <span className="flex-1 text-left truncate">{entry.account.display_name || entry.account.username}</span>
                                      {state === 'loading' && (
                                        <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                      )}
                                      {state === 'ok' && (
                                        <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {state === 'error' && (
                                        <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    {replyOpen && (
      <ReplyModal
        status={displayStatus}
        instanceUrl={instanceUrl}
        accessToken={accessToken}
        accountKey={accountKey}
        onClose={() => setReplyOpen(false)}
        onComposed={() => setReplyOpen(false)}
      />
    )}

    {showFavDialog && createPortal(
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
        onClick={() => setShowFavDialog(false)}
      >
        <div
          className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-4">この投稿をお気に入りに追加しますか？</h3>
          <div
            className="mb-5 bg-gray-700/50 rounded-lg p-3 text-gray-300 text-sm line-clamp-4 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: displayStatus.spoiler_text
                ? emojifyText(displayStatus.spoiler_text, displayStatus.emojis)
                : emojifyHtml(displayStatus.content, displayStatus.emojis)
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFavDialog(false)}
              className="flex-1 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={executeFavourite}
              className="flex-1 px-4 py-2 text-sm text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
            >
              お気に入りに追加
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {showBoostDialog && createPortal(
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
        onClick={() => setShowBoostDialog(false)}
      >
        <div
          className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-4">この投稿をブーストしますか？</h3>
          <div
            className="mb-5 bg-gray-700/50 rounded-lg p-3 text-gray-300 text-sm line-clamp-4 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: displayStatus.spoiler_text
                ? emojifyText(displayStatus.spoiler_text, displayStatus.emojis)
                : emojifyHtml(displayStatus.content, displayStatus.emojis)
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowBoostDialog(false)}
              className="flex-1 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={executeReblog}
              className="flex-1 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              ブーストする
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {showDeleteDialog && createPortal(
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
        onClick={() => setShowDeleteDialog(false)}
      >
        <div
          className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-4">この投稿を削除しますか？</h3>
          <div className="mb-5 bg-gray-700/50 rounded-lg p-3 text-gray-300 text-sm line-clamp-4 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: displayStatus.spoiler_text
                ? emojifyText(displayStatus.spoiler_text, displayStatus.emojis)
                : emojifyHtml(displayStatus.content, displayStatus.emojis)
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {deleteLoading ? '削除中…' : '削除する'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {showBlockDialog && createPortal(
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
        onClick={() => setShowBlockDialog(false)}
      >
        <div
          className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-4">このユーザーをブロックしますか？</h3>

          <div className="flex items-center gap-3 mb-4 bg-gray-700/50 rounded-lg p-3">
            <img
              src={displayStatus.account.avatar_static}
              alt=""
              className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <p
                className="text-white text-sm font-medium truncate"
                dangerouslySetInnerHTML={{ __html: emojifyText(displayStatus.account.display_name || displayStatus.account.username, displayStatus.account.emojis) }}
              />
              <p className="text-gray-400 text-xs truncate">@{displayStatus.account.acct}</p>
            </div>
          </div>

          <p className="text-gray-400 text-xs mb-5">ブロックすると、このユーザーからフォローされなくなり、タイムラインに投稿が表示されなくなります。</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowBlockDialog(false)}
              className="flex-1 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleBlock}
              disabled={blockLoading}
              className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {blockLoading ? 'ブロック中…' : 'ブロックする'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {showEditModal && (
      <EditStatusModal
        status={displayStatus}
        instanceUrl={instanceUrl}
        accessToken={accessToken}
        accountKey={accountKey}
        onClose={() => setShowEditModal(false)}
        onEdited={(updated) => {
          onUpdate(isReblog ? { ...status, reblog: updated } : { ...status, ...updated })
        }}
      />
    )}

    {showMuteDialog && createPortal(
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
        onClick={() => setShowMuteDialog(false)}
      >
        <div
          className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-4">ユーザーをミュート</h3>

          <div className="flex items-center gap-3 mb-5 bg-gray-700/50 rounded-lg p-3">
            <img
              src={displayStatus.account.avatar_static}
              alt=""
              className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <p
                className="text-white text-sm font-medium truncate"
                dangerouslySetInnerHTML={{ __html: emojifyText(displayStatus.account.display_name || displayStatus.account.username, displayStatus.account.emojis) }}
              />
              <p className="text-gray-400 text-xs truncate">@{displayStatus.account.acct}</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-400 text-xs mb-1.5">ミュート期間</label>
            <select
              value={muteDuration}
              onChange={(e) => setMuteDuration(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {[
                { value: '0', label: '無期限' },
                { value: '1800', label: '30分' },
                { value: '3600', label: '1時間' },
                { value: '21600', label: '6時間' },
                { value: '86400', label: '24時間' },
                { value: '259200', label: '3日' },
                { value: '604800', label: '7日' },
              ].map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={muteNotifications}
              onChange={(e) => setMuteNotifications(e.target.checked)}
              className="w-4 h-4 rounded accent-orange-500"
            />
            <span className="text-gray-300 text-sm">通知をオフにする</span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMuteDialog(false)}
              className="flex-1 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleMute}
              disabled={muteLoading}
              className="flex-1 px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {muteLoading ? 'ミュート中…' : 'ミュートする'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </article>
  )
}
