import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { MediaGrid } from './MediaGrid'
import type { Status, StatusContext, Account } from '../types'

interface StatusDetailModalProps {
  status: Status
  instanceUrl: string
  accessToken: string
  onClose: () => void
  onOpenProfile?: (account: Account) => void
  onDelete?: (id: string) => void
  currentAccountId?: string
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
  onOpenProfile?: (account: Account) => void
  onDeleteRequest?: (status: Status) => void
  isOwnPost?: boolean
}

function StatusRow({ status, highlight, slim, onOpenProfile, onDeleteRequest, isOwnPost }: StatusRowProps) {
  const hasCw = !!status.spoiler_text
  const [cwOpen, setCwOpen] = useState(!hasCw)

  return (
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
              className="text-gray-200 text-sm leading-relaxed prose prose-sm prose-invert max-w-none break-words [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_p]:mb-1"
              dangerouslySetInnerHTML={{ __html: emojifyHtml(status.content, status.emojis) }}
            />
            <MediaGrid
              attachments={status.media_attachments}
              sensitive={status.sensitive}
              thumbnailHeight="h-40"
            />
          </>
        )}

        <div className="flex items-center mt-2 gap-4 text-gray-400 text-xs">
          {highlight && (
            <>
              <span>{status.replies_count} 返信</span>
              <span>{status.reblogs_count} ブースト</span>
              <span>{status.favourites_count} お気に入り</span>
            </>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {isOwnPost && onDeleteRequest && (
              <button
                onClick={() => onDeleteRequest(status)}
                className="hover:text-red-400 transition-colors"
                title="削除"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            {highlight && (
              <a
                href={status.url ?? status.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
              >
                元の投稿を開く
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatusDetailModal({ status, instanceUrl, accessToken, onClose, onOpenProfile, onDelete, currentAccountId }: StatusDetailModalProps) {
  const [context, setContext] = useState<StatusContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Status | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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
                  onOpenProfile={onOpenProfile}
                  onDeleteRequest={setDeleteTarget}
                  isOwnPost={!!currentAccountId && s.account.id === currentAccountId}
                />
              ))}

              <StatusRow
                status={status}
                highlight
                onOpenProfile={onOpenProfile}
                onDeleteRequest={setDeleteTarget}
                isOwnPost={!!currentAccountId && status.account.id === currentAccountId}
              />

              {context?.descendants.map((s) => (
                <StatusRow
                  key={s.id}
                  status={s}
                  slim
                  onOpenProfile={onOpenProfile}
                  onDeleteRequest={setDeleteTarget}
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
    </>
  )
}
