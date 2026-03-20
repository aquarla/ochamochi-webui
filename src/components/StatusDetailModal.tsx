import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { MediaGrid } from './MediaGrid'
import { EditStatusModal } from './EditStatusModal'
import { ReplyModal } from './ReplyModal'
import { UserProfileModal } from './UserProfileModal'
import { loadSettings } from '../hooks/useSettings'
import type { Status, StatusContext, Account } from '../types'
import type { StoredAccountEntry } from '../services/auth'

interface StatusDetailModalProps {
  status: Status
  instanceUrl: string
  accessToken: string
  accountKey?: string
  onClose: () => void
  onOpenProfile?: (account: Account) => void
  onDelete?: (id: string) => void
  onUpdate?: (status: Status) => void
  onReply?: (status: Status) => void
  currentAccountId?: string
  accounts?: StoredAccountEntry[]
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface StatusRowProps {
  status: Status
  highlight?: boolean
  slim?: boolean
  showCard?: boolean
  instanceUrl: string
  accessToken: string
  onOpenProfile?: (account: Account) => void
  onDeleteRequest?: (status: Status) => void
  onEditRequest?: (status: Status) => void
  onReplyRequest?: (status: Status) => void
  onUpdate?: (status: Status) => void
  isOwnPost?: boolean
}

function StatusRow({ status, highlight, slim, showCard, instanceUrl, accessToken, onOpenProfile, onDeleteRequest, onEditRequest, onReplyRequest, onUpdate, isOwnPost }: StatusRowProps) {
  const hasCw = !!status.spoiler_text
  const [cwOpen, setCwOpen] = useState(!hasCw)
  const [showLinkMenu, setShowLinkMenu] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [localStatus, setLocalStatus] = useState(status)
  const [replyOpen, setReplyOpen] = useState(false)

  const applyUpdate = (partial: Partial<Status>) =>
    setLocalStatus((s) => ({ ...s, ...partial }))

  const handleFavourite = async () => {
    if (actionLoading) return
    const wasFavourited = localStatus.favourited
    applyUpdate({ favourited: !wasFavourited, favourites_count: localStatus.favourites_count + (wasFavourited ? -1 : 1) })
    setActionLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      const updated = wasFavourited
        ? await client.unfavouriteStatus(localStatus.id)
        : await client.favouriteStatus(localStatus.id)
      setLocalStatus(updated)
      onUpdate?.(updated)
    } catch {
      applyUpdate({ favourited: wasFavourited, favourites_count: localStatus.favourites_count })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReblog = async () => {
    if (actionLoading) return
    const wasReblogged = localStatus.reblogged
    applyUpdate({ reblogged: !wasReblogged, reblogs_count: localStatus.reblogs_count + (wasReblogged ? -1 : 1) })
    setActionLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      const updated = wasReblogged
        ? await client.unreblogStatus(localStatus.id)
        : await client.reblogStatus(localStatus.id)
      const source = !wasReblogged && updated.reblog ? updated.reblog : updated
      setLocalStatus(source)
      onUpdate?.(source)
    } catch {
      applyUpdate({ reblogged: wasReblogged, reblogs_count: localStatus.reblogs_count })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBookmark = async () => {
    if (actionLoading) return
    const wasBookmarked = localStatus.bookmarked
    applyUpdate({ bookmarked: !wasBookmarked })
    setActionLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      const updated = wasBookmarked
        ? await client.unbookmarkStatus(localStatus.id)
        : await client.bookmarkStatus(localStatus.id)
      setLocalStatus(updated)
      onUpdate?.(updated)
    } catch {
      applyUpdate({ bookmarked: wasBookmarked })
    } finally {
      setActionLoading(false)
    }
  }
  const contentRef = useRef<HTMLDivElement>(null)
  const linkMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showLinkMenu) return
    const handler = (e: MouseEvent) => {
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) {
        setShowLinkMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showLinkMenu])

  useEffect(() => {
    const el = contentRef.current
    if (!el || !onOpenProfile) return
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
      if (!link) return
      const mention = status.mentions.find((m) => link.href === m.url)
      if (!mention) return
      e.preventDefault()
      const client = new MastodonClient(instanceUrl, accessToken)
      client.getAccountById(mention.id).then(onOpenProfile).catch(() => {})
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [onOpenProfile, status.mentions, instanceUrl, accessToken])

  return (
    <>
    <div className={`flex gap-3 px-4 py-3 ${highlight ? 'bg-gray-750 border-l-2 border-blue-500' : 'border-b border-gray-700/60'}`}>
      <button
        onClick={() => onOpenProfile?.(status.account)}
        className={`flex-shrink-0 rounded-full ${onOpenProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
      >
        <img
          src={status.account.avatar_static}
          alt={status.account.display_name || status.account.username}
          className={`${slim ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-gray-700`}
          loading="lazy"
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span
            className="font-medium text-white text-sm"
            dangerouslySetInnerHTML={{ __html: emojifyText(status.account.display_name || status.account.username, status.account.emojis) }}
          />
          <span className="text-gray-500 text-xs">@{status.account.acct}</span>
          <span className="flex items-center gap-1 ml-auto flex-shrink-0 text-gray-600">
            {status.visibility === 'public' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {status.visibility === 'unlisted' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {status.visibility === 'private' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {status.visibility === 'direct' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            )}
            <span className="text-xs">{formatDateFull(status.created_at)}</span>
          </span>
        </div>

        {hasCw && (
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-yellow-400 text-sm font-medium flex-1"
              dangerouslySetInnerHTML={{ __html: emojifyText(status.spoiler_text, status.emojis) }}
            />
            <button
              onClick={() => setCwOpen((v) => !v)}
              className="flex-shrink-0 text-xs px-2 py-0.5 rounded border border-yellow-600 text-yellow-400 hover:bg-yellow-900/40 transition-colors"
            >
              {cwOpen ? '隠す' : '表示'}
            </button>
          </div>
        )}

        {cwOpen && (
          <>
            <div
              ref={contentRef}
              className="text-gray-200 text-sm leading-relaxed prose prose-sm prose-invert max-w-none break-all [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_p]:mb-1"
              dangerouslySetInnerHTML={{ __html: emojifyHtml(status.content, status.emojis) }}
            />
            <MediaGrid
              attachments={status.media_attachments}
              sensitive={status.sensitive}
              thumbnailHeight="h-40"
            />
            {showCard && status.card?.title && (
              <a
                href={status.card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex flex-col border border-gray-600 rounded-lg overflow-hidden hover:border-gray-400 transition-colors text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {status.card.image && (
                  <img
                    src={status.card.image}
                    alt=""
                    className="w-full max-h-36 object-cover bg-gray-700"
                    loading="lazy"
                  />
                )}
                <div className="px-3 py-2 min-w-0">
                  <p className="text-white text-xs font-medium leading-snug line-clamp-2">{status.card.title}</p>
                  {status.card.description && (
                    <p className="text-gray-400 text-xs leading-snug mt-0.5 line-clamp-2">{status.card.description}</p>
                  )}
                  <p className="text-gray-500 text-[11px] mt-1 truncate">
                    {status.card.provider_name || new URL(status.card.url).hostname}
                  </p>
                </div>
              </a>
            )}
          </>
        )}

        <div className="mt-2 text-gray-400 text-xs">
          {highlight && (
            <div className="flex items-center gap-4 mb-2">
              <span>{localStatus.replies_count} 返信</span>
              <span>{localStatus.reblogs_count} ブースト</span>
              <span>{localStatus.favourites_count} お気に入り</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onReplyRequest ? onReplyRequest(localStatus) : setReplyOpen(true) }}
              className={`flex items-center gap-1 hover:text-blue-400 transition-colors ${replyOpen ? 'text-blue-400' : ''}`}
              title="返信"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleReblog}
              disabled={actionLoading}
              className={`flex items-center gap-1 hover:text-green-400 transition-colors ${localStatus.reblogged ? 'text-green-400' : ''}`}
              title="ブースト"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleFavourite}
              disabled={actionLoading}
              className={`flex items-center gap-1 hover:text-yellow-400 transition-colors ${localStatus.favourited ? 'text-yellow-400' : ''}`}
              title="お気に入り"
            >
              <svg className="w-3.5 h-3.5" fill={localStatus.favourited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <button
              onClick={handleBookmark}
              disabled={actionLoading}
              className={`flex items-center gap-1 hover:text-blue-400 transition-colors ${localStatus.bookmarked ? 'text-blue-400' : ''}`}
              title="ブックマーク"
            >
              <svg className="w-3.5 h-3.5" fill={localStatus.bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <div className="flex items-center gap-2 ml-auto">
            {isOwnPost && onEditRequest && (
              <button
                onClick={() => onEditRequest(localStatus)}
                className="hover:text-blue-400 transition-colors"
                title="編集"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {isOwnPost && onDeleteRequest && (
              <button
                onClick={() => onDeleteRequest(localStatus)}
                className="hover:text-red-400 transition-colors"
                title="削除"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            {highlight && (
              <div className="relative" ref={linkMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowLinkMenu((v) => !v)}
                  className="flex items-center text-xs hover:text-gray-300 transition-colors"
                  title="その他"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>
                {showLinkMenu && (
                  <div className="absolute right-0 bottom-full mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden min-w-max">
                    <a
                      href={status.url ?? status.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowLinkMenu(false)}
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
                        navigator.clipboard.writeText(status.url ?? status.uri)
                        setShowLinkMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border-t border-gray-700"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      元のサイトへのリンクをコピー
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {replyOpen && (
      <ReplyModal
        status={localStatus}
        instanceUrl={instanceUrl}
        accessToken={accessToken}
        onClose={() => setReplyOpen(false)}
        onComposed={() => setReplyOpen(false)}
      />
    )}
    </>
  )
}

export function StatusDetailModal({ status, instanceUrl, accessToken, accountKey, onClose, onDelete, onUpdate, onReply, currentAccountId, accounts }: StatusDetailModalProps) {
  const [context, setContext] = useState<StatusContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Status | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<Status | null>(null)
  const [mainStatus, setMainStatus] = useState<Status>(status)
  const [profileAccount, setProfileAccount] = useState<Account | null>(null)
  const [nestedDetailStatus, setNestedDetailStatus] = useState<Status | null>(null)
  const showCard = loadSettings(accountKey).showPreviewCard

  useEffect(() => {
    const client = new MastodonClient(instanceUrl, accessToken)
    client
      .getStatusContext(status.id)
      .then(setContext)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'コンテキストの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [status.id, instanceUrl, accessToken])

  const executeDelete = async () => {
    if (!deleteTarget || deleteLoading) return
    const id = deleteTarget.id
    setDeleteLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.deleteStatus(id)
      setDeleteTarget(null)
      if (id === status.id) {
        onDelete?.(id)
        onClose()
      } else {
        setContext((prev) =>
          prev
            ? {
                ancestors: prev.ancestors.filter((s) => s.id !== id),
                descendants: prev.descendants.filter((s) => s.id !== id),
              }
            : null,
        )
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEdited = (updated: Status) => {
    setEditTarget(null)
    if (updated.id === status.id) {
      setMainStatus(updated)
      onUpdate?.(updated)
    } else {
      setContext((prev) =>
        prev
          ? {
              ancestors: prev.ancestors.map((s) => (s.id === updated.id ? updated : s)),
              descendants: prev.descendants.map((s) => (s.id === updated.id ? updated : s)),
            }
          : null,
      )
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-semibold text-sm">詳細</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          {!loading && (
            <>
              {context?.ancestors.map((s) => (
                <StatusRow
                  key={s.id}
                  status={s}
                  slim
                  showCard={showCard}
                  instanceUrl={instanceUrl}
                  accessToken={accessToken}
                  onOpenProfile={setProfileAccount}
                  onDeleteRequest={setDeleteTarget}
                  onEditRequest={setEditTarget}
                  onReplyRequest={onReply}
                  onUpdate={(updated) => setContext((prev) => prev ? { ...prev, ancestors: prev.ancestors.map((a) => a.id === updated.id ? updated : a) } : null)}
                  isOwnPost={!!currentAccountId && s.account.id === currentAccountId}
                />
              ))}

              <StatusRow
                status={mainStatus}
                highlight
                showCard={showCard}
                instanceUrl={instanceUrl}
                accessToken={accessToken}
                onOpenProfile={setProfileAccount}
                onDeleteRequest={setDeleteTarget}
                onEditRequest={setEditTarget}
                onReplyRequest={onReply}
                onUpdate={(updated) => { setMainStatus(updated); onUpdate?.(updated) }}
                isOwnPost={!!currentAccountId && mainStatus.account.id === currentAccountId}
              />

              {context?.descendants.map((s) => (
                <StatusRow
                  key={s.id}
                  status={s}
                  slim
                  showCard={showCard}
                  instanceUrl={instanceUrl}
                  accessToken={accessToken}
                  onOpenProfile={setProfileAccount}
                  onDeleteRequest={setDeleteTarget}
                  onEditRequest={setEditTarget}
                  onReplyRequest={onReply}
                  onUpdate={(updated) => setContext((prev) => prev ? { ...prev, descendants: prev.descendants.map((d) => d.id === updated.id ? updated : d) } : null)}
                  isOwnPost={!!currentAccountId && s.account.id === currentAccountId}
                />
              ))}

              {context?.descendants.length === 0 && context?.ancestors.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">返信はありません</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {deleteTarget && createPortal(
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
        onClick={() => setDeleteTarget(null)}
      >
        <div
          className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-4">この投稿を削除しますか？</h3>
          <div
            className="mb-5 bg-gray-700/50 rounded-lg p-3 text-gray-300 text-sm line-clamp-4 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: deleteTarget.spoiler_text
                ? emojifyText(deleteTarget.spoiler_text, deleteTarget.emojis)
                : emojifyHtml(deleteTarget.content, deleteTarget.emojis)
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="flex-1 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={executeDelete}
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

    {editTarget && (
      <EditStatusModal
        status={editTarget}
        instanceUrl={instanceUrl}
        accessToken={accessToken}
        accountKey={accountKey}
        onClose={() => setEditTarget(null)}
        onEdited={handleEdited}
      />
    )}

    {profileAccount && (
      <UserProfileModal
        account={profileAccount}
        instanceUrl={instanceUrl}
        accessToken={accessToken}
        accountKey={accountKey}
        currentAccountId={currentAccountId}
        accounts={accounts}
        onClose={() => setProfileAccount(null)}
        onOpenProfile={setProfileAccount}
        onOpenDetail={setNestedDetailStatus}
      />
    )}

    {nestedDetailStatus && (
      <StatusDetailModal
        status={nestedDetailStatus}
        instanceUrl={instanceUrl}
        accessToken={accessToken}
        accountKey={accountKey}
        currentAccountId={currentAccountId}
        accounts={accounts}
        onClose={() => setNestedDetailStatus(null)}
        onReply={onReply}
      />
    )}
    </>
  )
}
