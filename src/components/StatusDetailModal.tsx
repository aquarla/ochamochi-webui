import { useEffect, useState } from 'react'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import type { Status, StatusContext, Account } from '../types'

interface StatusDetailModalProps {
  status: Status
  instanceUrl: string
  accessToken: string
  onClose: () => void
  onOpenProfile?: (account: Account) => void
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
}

function StatusRow({ status, highlight, slim, onOpenProfile }: StatusRowProps) {
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
          <span className="text-gray-600 text-xs ml-auto flex-shrink-0">{formatDateFull(status.created_at)}</span>
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
            {status.media_attachments.length > 0 && (
              <div className={`mt-2 grid gap-1 ${status.media_attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {status.media_attachments.map((media) => (
                  <div key={media.id} className="rounded overflow-hidden bg-gray-700">
                    {media.type === 'image' ? (
                      <img
                        src={media.url || media.preview_url}
                        alt={media.description ?? ''}
                        className="w-full max-h-64 object-contain bg-black"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
                        {media.type}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {highlight && (
          <div className="flex items-center gap-4 mt-2 text-gray-400 text-xs">
            <span>{status.replies_count} 返信</span>
            <span>{status.reblogs_count} ブースト</span>
            <span>{status.favourites_count} お気に入り</span>
            <a
              href={status.url ?? status.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto hover:text-blue-400 transition-colors"
            >
              元の投稿を開く
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export function StatusDetailModal({ status, instanceUrl, accessToken, onClose, onOpenProfile }: StatusDetailModalProps) {
  const [context, setContext] = useState<StatusContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = new MastodonClient(instanceUrl, accessToken)
    client
      .getStatusContext(status.id)
      .then(setContext)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'コンテキストの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [status.id, instanceUrl, accessToken])

  return (
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
              {/* Ancestors */}
              {context?.ancestors.map((s) => (
                <StatusRow key={s.id} status={s} slim onOpenProfile={onOpenProfile} />
              ))}

              {/* Main status */}
              <StatusRow status={status} highlight onOpenProfile={onOpenProfile} />

              {/* Descendants */}
              {context?.descendants.map((s) => (
                <StatusRow key={s.id} status={s} slim onOpenProfile={onOpenProfile} />
              ))}

              {context?.descendants.length === 0 && context?.ancestors.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">返信はありません</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
