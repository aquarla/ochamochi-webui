import { useState, useEffect, useRef, useCallback } from 'react'
import { MastodonClient } from '../services/mastodon'
import { getColumnLabel } from '../store/columns'
import { Post } from './Post'
import { UserProfileModal } from './UserProfileModal'
import { StatusDetailModal } from './StatusDetailModal'
import type { ColumnConfig, Account, Status, Tag } from '../types'
import type { StoredAccountEntry } from '../services/auth'

const LIMIT = 20

interface SearchColumnProps {
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

function LockButton({ locked, onToggle }: { locked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`transition-colors p-1 rounded ${
        locked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
      }`}
      title={locked ? 'ロック中（クリックで解除）' : 'クリックでロック'}
    >
      {locked ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

export function SearchColumn({
  column,
  instanceUrl,
  accessToken,
  accountKey,
  currentAccountId,
  accounts,
  onRemove,
  onUpdate,
  onAddTagColumn,
}: SearchColumnProps) {
  const [query, setQuery] = useState(column.searchQuery ?? '')
  const [statuses, setStatuses] = useState<Status[]>([])
  const [accountResults, setAccountResults] = useState<Account[]>([])
  const [tagResults, setTagResults] = useState<Tag[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [detailStatus, setDetailStatus] = useState<Status | null>(null)
  const [profileAccount, setProfileAccount] = useState<Account | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeQueryRef = useRef('')

  const searchType = column.searchType ?? 'statuses'

  const executeSearch = useCallback(async (q: string, currentOffset: number, append: boolean) => {
    const client = new MastodonClient(instanceUrl, accessToken)
    const data = await client.search(q, searchType, { limit: LIMIT, offset: currentOffset })

    if (searchType === 'statuses') {
      const items = data.statuses
      setStatuses((prev) => append ? [...prev, ...items] : items)
      // ブロック・ミュートで件数が減る場合があるため、0件になるまで継続する
      setHasMore(items.length > 0)
      setOffset(currentOffset + items.length)
    } else if (searchType === 'accounts') {
      const items = data.accounts
      setAccountResults((prev) => append ? [...prev, ...items] : items)
      setHasMore(items.length > 0)
      setOffset(currentOffset + items.length)
    } else {
      const items = data.hashtags
      setTagResults((prev) => append ? [...prev, ...items] : items)
      setHasMore(items.length > 0)
      setOffset(currentOffset + items.length)
    }
  }, [instanceUrl, accessToken, searchType])

  const handleSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    activeQueryRef.current = trimmed
    setLoading(true)
    setError(null)
    setSearched(false)
    setStatuses([])
    setAccountResults([])
    setTagResults([])
    setOffset(0)
    setHasMore(false)
    try {
      await executeSearch(trimmed, 0, false)
      setSearched(true)
      onUpdate({ ...column, searchQuery: trimmed })
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !activeQueryRef.current) return
    setLoadingMore(true)
    try {
      await executeSearch(activeQueryRef.current, offset, true)
    } catch {
      // ページング失敗は無視
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, offset, executeSearch])

  // Auto-search on mount if there's a saved query
  useEffect(() => {
    if (column.searchQuery) {
      activeQueryRef.current = column.searchQuery
      setLoading(true)
      executeSearch(column.searchQuery, 0, false)
        .then(() => setSearched(true))
        .catch((e) => setError(e instanceof Error ? e.message : '検索に失敗しました'))
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
        handleLoadMore()
      }
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [handleLoadMore])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch(query)
    }
  }

  const handleOpenProfile = (account: Account) => {
    setDetailStatus(null)
    setProfileAccount(account)
  }

  const handleUpdateStatus = (updated: Status) => {
    setStatuses((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  const handleDeleteStatus = (id: string) => {
    setStatuses((prev) => prev.filter((s) => s.id !== id))
  }

  const label = getColumnLabel(column)
  const isEmpty = searched && !loading &&
    statuses.length === 0 && accountResults.length === 0 && tagResults.length === 0

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-gray-800 border-r border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <h2 className="text-white font-semibold text-sm truncate min-w-0" title={label}>{label}</h2>
        <div className="flex items-center gap-1">
          <LockButton
            locked={!!column.locked}
            onToggle={() => onUpdate({ ...column, locked: !column.locked })}
          />
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

      {/* Search input */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="検索クエリを入力…"
          className="flex-1 min-w-0 bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || loading}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        >
          検索
        </button>
      </div>

      {/* Results */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-3 text-red-400 text-xs border-b border-gray-700">
            エラー: {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && isEmpty && (
          <div className="p-4 text-gray-500 text-sm text-center space-y-1">
            <p>見つかりませんでした</p>
            {searchType === 'statuses' && (
              <p className="text-xs text-gray-600">※ このサーバーは全文検索に対応していない可能性があります</p>
            )}
          </div>
        )}

        {!loading && accountResults.map((account) => (
          <button
            key={account.id}
            onClick={() => setProfileAccount(account)}
            className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-700 hover:bg-gray-700/50 transition-colors text-left"
          >
            <img
              src={account.avatar_static}
              alt={account.display_name || account.username}
              className="w-10 h-10 rounded-full flex-shrink-0 bg-gray-700"
            />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{account.display_name || account.username}</p>
              <p className="text-gray-400 text-xs truncate">@{account.acct}</p>
            </div>
          </button>
        ))}

        {!loading && tagResults.map((tag) => (
          <button
            key={tag.name}
            onClick={() => onAddTagColumn?.(tag.name)}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-gray-700 hover:bg-gray-700/50 transition-colors text-left"
          >
            <span className="text-blue-400 font-medium text-sm">#{tag.name}</span>
          </button>
        ))}

        {!loading && statuses.map((status) => (
          <Post
            key={status.id}
            status={status}
            instanceUrl={instanceUrl}
            accessToken={accessToken}
            accountKey={accountKey}
            onUpdate={handleUpdateStatus}
            onDelete={handleDeleteStatus}
            onOpenDetail={setDetailStatus}
            onOpenProfile={handleOpenProfile}
            onAddTagColumn={onAddTagColumn}
            currentAccountId={currentAccountId}
            accounts={accounts}
          />
        ))}

        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {!loadingMore && searched && !hasMore && statuses.length > 0 && (
          <div className="p-3 text-gray-600 text-xs text-center">最後まで読み込みました</div>
        )}
      </div>

      {detailStatus && (
        <StatusDetailModal
          status={detailStatus}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          currentAccountId={currentAccountId}
          onClose={() => setDetailStatus(null)}
          onDelete={handleDeleteStatus}
          onOpenProfile={handleOpenProfile}
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
        />
      )}
    </div>
  )
}
