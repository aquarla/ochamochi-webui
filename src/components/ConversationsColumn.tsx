import { useCallback, useEffect, useRef, useState } from 'react'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { StatusDetailModal } from './StatusDetailModal'
import { UserProfileModal } from './UserProfileModal'
import { ReplyModal } from './ReplyModal'
import type { ColumnConfig, Conversation, Account, Status } from '../types'
import type { StoredAccountEntry } from '../services/auth'

const PAGE_LIMIT = 20

interface ConversationsColumnProps {
  column: ColumnConfig
  instanceUrl: string
  accessToken: string
  accountKey?: string
  currentAccountId?: string
  accounts?: StoredAccountEntry[]
  onRemove: (id: string) => void
  onUpdate: (column: ColumnConfig) => void
  onAddTagColumn?: (tag: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return `${diffSec}秒前`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}分前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}時間前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}日前`
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}月${date.getDate()}日`
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

interface ConversationItemProps {
  conversation: Conversation
  instanceUrl: string
  accessToken: string
  onOpenDetail: (status: Status) => void
  onOpenProfile: (account: Account) => void
  onAddTagColumn?: (tag: string) => void
}

function ConversationItem({ conversation, instanceUrl, accessToken, onOpenDetail, onOpenProfile, onAddTagColumn }: ConversationItemProps) {
  const { accounts, last_status, unread } = conversation
  const otherAccounts = accounts.slice(0, 3)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el || !last_status) return
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
      if (!link) return
      const tagMatch = link.href.match(/\/tags\/([^/?#]+)/)
      if (tagMatch && onAddTagColumn) {
        e.preventDefault()
        onAddTagColumn(decodeURIComponent(tagMatch[1]))
        return
      }
      const mention = last_status.mentions.find((m) => link.href === m.url)
      if (mention) {
        e.preventDefault()
        const client = new MastodonClient(instanceUrl, accessToken)
        client.getAccountById(mention.id).then(onOpenProfile).catch(() => {})
        return
      }
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [last_status, onOpenDetail, onOpenProfile, onAddTagColumn, instanceUrl, accessToken])

  return (
    <article
      className={`border-b border-gray-700 p-3 hover:bg-gray-750 transition-colors ${unread ? 'bg-blue-900/10' : ''}`}
    >
      {/* 参加者アバター */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex -space-x-2 flex-shrink-0">
          {otherAccounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => onOpenProfile(acc)}
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src={acc.avatar_static}
                alt={acc.display_name || acc.username}
                className="w-8 h-8 rounded-full border-2 border-gray-800 bg-gray-700"
                loading="lazy"
              />
            </button>
          ))}
          {accounts.length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center text-xs text-gray-400">
              +{accounts.length - 3}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 flex-wrap">
            {otherAccounts.map((acc, i) => (
              <span key={acc.id}>
                <button
                  onClick={() => onOpenProfile(acc)}
                  className="text-white text-xs font-medium hover:text-blue-400 transition-colors"
                  dangerouslySetInnerHTML={{ __html: emojifyText(acc.display_name || acc.username, acc.emojis) }}
                />
                {i < otherAccounts.length - 1 && <span className="text-gray-600 text-xs">, </span>}
              </span>
            ))}
            {accounts.length > 3 && (
              <span className="text-gray-500 text-xs">他{accounts.length - 3}人</span>
            )}
          </div>
          {unread && (
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 ml-1 align-middle" />
          )}
        </div>

        {last_status && (
          <button
            type="button"
            onClick={() => onOpenDetail(last_status)}
            className="text-gray-600 text-xs flex-shrink-0 hover:text-blue-400 transition-colors"
          >
            {formatDate(last_status.created_at)}
          </button>
        )}
      </div>

      {/* 最新メッセージ */}
      {last_status && (
        <div
          ref={contentRef}
          className="text-gray-400 text-xs leading-relaxed line-clamp-2 break-words [&_a]:text-blue-400 [&_p]:inline"
          dangerouslySetInnerHTML={{
            __html: last_status.spoiler_text
              ? `<span class="text-yellow-500">${emojifyText(last_status.spoiler_text, last_status.emojis)}</span>`
              : emojifyHtml(last_status.content, last_status.emojis),
          }}
        />
      )}

    </article>
  )
}

export function ConversationsColumn({ column, instanceUrl, accessToken, accountKey, currentAccountId, accounts, onRemove, onUpdate, onAddTagColumn }: ConversationsColumnProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [detailStatus, setDetailStatus] = useState<Status | null>(null)
  const [replyStatus, setReplyStatus] = useState<Status | null>(null)
  const [profileAccount, setProfileAccount] = useState<Account | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef(new MastodonClient(instanceUrl, accessToken))

  useEffect(() => {
    clientRef.current = new MastodonClient(instanceUrl, accessToken)
  }, [instanceUrl, accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await clientRef.current.getConversations({ limit: PAGE_LIMIT })
      setConversations(items)
      setHasMore(items.length > 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setConversations([])
    setHasMore(true)
    load()
  }, [load])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || conversations.length === 0) return
    const lastId = conversations[conversations.length - 1].id
    setLoading(true)
    try {
      const items = await clientRef.current.getConversations({ max_id: lastId, limit: PAGE_LIMIT })
      setConversations((prev) => {
        const existingIds = new Set(prev.map((c) => c.id))
        return [...prev, ...items.filter((c) => !existingIds.has(c.id))]
      })
      setHasMore(items.length > 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, conversations])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMore()
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [loadMore])

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-gray-800 border-r border-gray-700">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <h2
          className="text-white font-semibold text-sm truncate min-w-0 cursor-pointer hover:text-gray-300 transition-colors"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          会話
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => load()}
            className="text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors p-1 rounded"
            title="更新"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => onUpdate({ ...column, locked: !column.locked })}
            className={`transition-colors p-1 rounded ${column.locked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`}
            title={column.locked ? 'ロック中（クリックで解除）' : 'クリックでロック'}
          >
            {column.locked ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onRemove(column.id)}
            disabled={!!column.locked}
            className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500"
            title="カラムを削除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* リスト */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-3 text-red-400 text-xs border-b border-gray-700">エラー: {error}</div>
        )}
        {conversations.length === 0 && !loading && !error && (
          <div className="p-4 text-gray-500 text-sm text-center">会話がありません</div>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            instanceUrl={instanceUrl}
            accessToken={accessToken}
            onOpenDetail={setDetailStatus}
            onOpenProfile={setProfileAccount}
            onAddTagColumn={onAddTagColumn}
          />
        ))}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
        {!hasMore && conversations.length > 0 && (
          <div className="p-3 text-gray-600 text-xs text-center">最後まで読み込みました</div>
        )}
      </div>

      {replyStatus && (
        <ReplyModal
          status={replyStatus}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          accountKey={accountKey}
          defaultVisibility="direct"
          onClose={() => setReplyStatus(null)}
          onComposed={() => { setReplyStatus(null); load() }}
        />
      )}

      {detailStatus && (
        <StatusDetailModal
          status={detailStatus}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          accountKey={accountKey}
          currentAccountId={currentAccountId}
          onClose={() => setDetailStatus(null)}
          onOpenProfile={(acc) => { setDetailStatus(null); setProfileAccount(acc) }}
          onReply={(s) => { setDetailStatus(null); setReplyStatus(s) }}
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
        />
      )}
    </div>
  )
}
