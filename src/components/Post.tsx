import { useState } from 'react'
import type { Status } from '../types'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { ComposeForm } from './ComposeForm'

interface PostProps {
  status: Status
  instanceUrl: string
  accessToken: string
  accountKey?: string
  onUpdate: (status: Status) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}秒前`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}分前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}時間前`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}日前`
}

export function Post({ status, instanceUrl, accessToken, accountKey, onUpdate }: PostProps) {
  const [actionLoading, setActionLoading] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)

  const displayStatus = status.reblog ?? status
  const isReblog = !!status.reblog
  const hasCw = !!displayStatus.spoiler_text
  const [cwOpen, setCwOpen] = useState(false)

  const handleFavourite = async () => {
    if (actionLoading) return
    setActionLoading(true)
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      const updated = displayStatus.favourited
        ? await client.unfavouriteStatus(displayStatus.id)
        : await client.favouriteStatus(displayStatus.id)
      onUpdate({ ...status, reblog: isReblog ? updated : null, ...(isReblog ? {} : updated) })
    } catch {
      // ignore
    } finally {
      setActionLoading(false)
    }
  }

  const handleReblog = async () => {
    if (actionLoading) return
    setActionLoading(true)
    const client = new MastodonClient(instanceUrl, accessToken)
    try {
      const updated = displayStatus.reblogged
        ? await client.unreblogStatus(displayStatus.id)
        : await client.reblogStatus(displayStatus.id)
      onUpdate({ ...status, reblog: isReblog ? updated : null, ...(isReblog ? {} : updated) })
    } catch {
      // ignore
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <article className="border-b border-gray-700 p-3 hover:bg-gray-750 transition-colors">
      {isReblog && (
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span dangerouslySetInnerHTML={{ __html: emojifyText(status.account.display_name || status.account.username, status.account.emojis) }} /> がブースト
        </p>
      )}

      <div className="flex gap-3">
        <img
          src={displayStatus.account.avatar_static}
          alt={displayStatus.account.display_name || displayStatus.account.username}
          className="w-10 h-10 rounded-full flex-shrink-0 bg-gray-700"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className="font-medium text-white text-sm truncate"
              dangerouslySetInnerHTML={{ __html: emojifyText(displayStatus.account.display_name || displayStatus.account.username, displayStatus.account.emojis) }}
            />
            <span className="text-gray-500 text-xs truncate">@{displayStatus.account.acct}</span>
            <span className="text-gray-600 text-xs ml-auto flex-shrink-0">
              {formatDate(displayStatus.created_at)}
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
                className="text-gray-200 text-sm leading-relaxed prose prose-sm prose-invert max-w-none break-words [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_p]:mb-1"
                dangerouslySetInnerHTML={{ __html: emojifyHtml(displayStatus.content, displayStatus.emojis) }}
              />

              {displayStatus.media_attachments.length > 0 && (
                <div className={`mt-2 grid gap-1 ${displayStatus.media_attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {displayStatus.media_attachments.map((media) => (
                    <div key={media.id} className="rounded overflow-hidden bg-gray-700">
                      {media.type === 'image' ? (
                        <img
                          src={media.preview_url || media.url}
                          alt={media.description ?? ''}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400 text-xs">
                          {media.type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

            <a
              href={displayStatus.url ?? displayStatus.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs hover:text-blue-400 transition-colors ml-auto"
              title="開く"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {replyOpen && (
          <ComposeForm
            instanceUrl={instanceUrl}
            accessToken={accessToken}
            accountKey={accountKey}
            inReplyToId={displayStatus.id}
            initialText={`@${displayStatus.account.acct} `}
            onComposed={() => setReplyOpen(false)}
            onCancel={() => setReplyOpen(false)}
            inline
          />
        )}
      </div>
    </article>
  )
}
