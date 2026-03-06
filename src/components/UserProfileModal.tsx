import { useEffect, useRef, useState } from 'react'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { Post } from './Post'
import type { Account, Status } from '../types'
import type { StoredAccountEntry } from '../services/auth'

interface UserProfileModalProps {
  account: Account
  instanceUrl: string
  accessToken: string
  accountKey?: string
  currentAccountId?: string
  onClose: () => void
  onOpenDetail?: (status: Status) => void
  onOpenProfile?: (account: Account) => void
  accounts?: StoredAccountEntry[]
}

const LIMIT = 20

export function UserProfileModal({
  account: initialAccount,
  instanceUrl,
  accessToken,
  accountKey,
  currentAccountId,
  onClose,
  onOpenDetail,
  onOpenProfile,
  accounts,
}: UserProfileModalProps) {
  const [account, setAccount] = useState<Account>(initialAccount)
  const [pinnedStatuses, setPinnedStatuses] = useState<Status[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [maxId, setMaxId] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const client = new MastodonClient(instanceUrl, accessToken)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      client.getAccountById(initialAccount.id),
      client.getAccountStatuses(initialAccount.id, { pinned: true }),
      client.getAccountStatuses(initialAccount.id, { limit: LIMIT, exclude_replies: true }),
    ])
      .then(([fullAccount, pinned, initial]) => {
        if (cancelled) return
        setAccount(fullAccount)
        setPinnedStatuses(pinned)
        setStatuses(initial)
        setHasMore(initial.length === LIMIT)
        if (initial.length > 0) setMaxId(initial[initial.length - 1].id)
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAccount.id])

  const loadMore = async () => {
    if (loading || !hasMore || !maxId) return
    setLoading(true)
    try {
      const next = await client.getAccountStatuses(initialAccount.id, {
        max_id: maxId,
        limit: LIMIT,
        exclude_replies: true,
      })
      setStatuses((prev) => [...prev, ...next])
      setHasMore(next.length === LIMIT)
      if (next.length > 0) setMaxId(next[next.length - 1].id)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMore()
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  })

  const handleUpdateStatus = (updated: Status) => {
    setStatuses((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setPinnedStatuses((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  const handleDeleteStatus = (id: string) => {
    setStatuses((prev) => prev.filter((s) => s.id !== id))
    setPinnedStatuses((prev) => prev.filter((s) => s.id !== id))
  }

  const hasHeader = !!account.header && !account.header.endsWith('/headers/original/missing.png')

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex items-center justify-end px-4 py-2 flex-shrink-0 absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-black/40 rounded-full p-1 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto flex-1">
          {/* Header image */}
          {hasHeader ? (
            <div className="h-32 bg-gray-700 flex-shrink-0">
              <img
                src={account.header_static ?? account.header}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-16 bg-gray-700 flex-shrink-0" />
          )}

          {/* Profile info */}
          <div className="px-4 pb-4">
            <div className="flex items-end gap-3 -mt-8 mb-3">
              <img
                src={account.avatar_static}
                alt={account.display_name || account.username}
                className="w-16 h-16 rounded-full border-4 border-gray-800 bg-gray-700 flex-shrink-0"
              />
              <div className="pb-1 min-w-0">
                <p
                  className="font-bold text-white text-base leading-tight"
                  dangerouslySetInnerHTML={{ __html: emojifyText(account.display_name || account.username, account.emojis) }}
                />
                <p className="text-gray-400 text-sm">@{account.acct}</p>
              </div>
            </div>

            {account.note && (
              <div
                className="text-gray-300 text-sm leading-relaxed mb-3 prose prose-sm prose-invert max-w-none [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_p]:mb-1"
                dangerouslySetInnerHTML={{ __html: emojifyHtml(account.note, account.emojis) }}
              />
            )}

            {account.fields && account.fields.length > 0 && (
              <div className="mb-3 border border-gray-700 rounded-lg overflow-hidden">
                {account.fields.map((field, i) => (
                  <div key={i} className="flex text-sm border-b border-gray-700 last:border-0">
                    <span
                      className="px-3 py-1.5 text-gray-400 bg-gray-700/40 w-28 flex-shrink-0 font-medium"
                      dangerouslySetInnerHTML={{ __html: emojifyHtml(field.name, account.emojis) }}
                    />
                    <span
                      className={`px-3 py-1.5 flex-1 min-w-0 break-words [&_a]:text-blue-400 ${field.verified_at ? 'text-green-400' : 'text-gray-300'}`}
                      dangerouslySetInnerHTML={{ __html: emojifyHtml(field.value, account.emojis) }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 text-sm text-gray-400">
              <span><span className="text-white font-medium">{account.statuses_count.toLocaleString()}</span> 投稿</span>
              <span><span className="text-white font-medium">{account.following_count.toLocaleString()}</span> フォロー</span>
              <span><span className="text-white font-medium">{account.followers_count.toLocaleString()}</span> フォロワー</span>
            </div>
          </div>

          <div className="border-t border-gray-700">
            {initialLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {pinnedStatuses.map((s) => (
                  <Post
                    key={`pin-${s.id}`}
                    status={s}
                    instanceUrl={instanceUrl}
                    accessToken={accessToken}
                    accountKey={accountKey}
                    currentAccountId={currentAccountId}
                    onUpdate={handleUpdateStatus}
                    onDelete={handleDeleteStatus}
                    onOpenDetail={onOpenDetail}
                    onOpenProfile={onOpenProfile}
                    accounts={accounts}
                    pinned
                  />
                ))}

                {statuses.map((s) => (
                  <Post
                    key={s.id}
                    status={s}
                    instanceUrl={instanceUrl}
                    accessToken={accessToken}
                    accountKey={accountKey}
                    currentAccountId={currentAccountId}
                    onUpdate={handleUpdateStatus}
                    onDelete={handleDeleteStatus}
                    onOpenDetail={onOpenDetail}
                    onOpenProfile={onOpenProfile}
                    accounts={accounts}
                  />
                ))}

                {loading && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                )}

                {!hasMore && statuses.length > 0 && (
                  <div className="p-3 text-gray-600 text-xs text-center">最後まで読み込みました</div>
                )}

                {!hasMore && statuses.length === 0 && pinnedStatuses.length === 0 && (
                  <div className="p-4 text-gray-500 text-sm text-center">投稿がありません</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
