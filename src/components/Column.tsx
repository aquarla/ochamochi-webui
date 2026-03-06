import { useEffect, useRef, useState } from 'react'
import { useTimeline } from '../hooks/useTimeline'
import { useStreaming } from '../hooks/useStreaming'
import { getColumnLabel } from '../store/columns'
import { Post } from './Post'
import { StatusDetailModal } from './StatusDetailModal'
import { UserProfileModal } from './UserProfileModal'
import type { ColumnConfig, Status, Account } from '../types'
import type { StoredAccountEntry } from '../services/auth'

interface ColumnProps {
  column: ColumnConfig
  instanceUrl: string
  accessToken: string
  accountKey?: string
  onRemove: (id: string) => void
  onUpdate: (column: ColumnConfig) => void
  onAddTagColumn?: (tag: string) => void
  currentAccountId?: string
  accounts?: StoredAccountEntry[]
}

export function Column({ column, instanceUrl, accessToken, accountKey, onRemove, onUpdate, onAddTagColumn, currentAccountId, accounts }: ColumnProps) {
  const [detailStatus, setDetailStatus] = useState<Status | null>(null)
  const [profileAccount, setProfileAccount] = useState<Account | null>(null)

  const handleOpenProfile = (account: Account) => {
    setDetailStatus(null)
    setProfileAccount(account)
  }
  const supportsMediaFilter = column.type !== 'home' && column.type !== 'favourites' && column.type !== 'bookmarks'
  const onlyMedia = supportsMediaFilter ? (column.onlyMedia ?? false) : false

  const { statuses, loading, error, hasMore, loadMore, prependStatus, removeStatus, updateStatus } =
    useTimeline(instanceUrl, accessToken, column.type, column.tag, supportsMediaFilter ? onlyMedia : undefined)

  useStreaming({
    instanceUrl,
    accessToken,
    type: column.type,
    tag: column.tag,
    onlyMedia: supportsMediaFilter ? onlyMedia : undefined,
    onNew: prependStatus,
    onDelete: removeStatus,
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handler = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
        loadMore()
      }
    }

    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [loadMore])

  const label = getColumnLabel(column)

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-gray-800 border-r border-gray-700">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <h2 className="text-white font-semibold text-sm">{label}</h2>
        <div className="flex items-center gap-1">
          {supportsMediaFilter && (
            <button
              onClick={() => onUpdate({ ...column, onlyMedia: !onlyMedia })}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                onlyMedia
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              }`}
              title="メディアのみ表示"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onRemove(column.id)}
            className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
            title="カラムを削除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-3 text-red-400 text-xs border-b border-gray-700">
            エラー: {error}
          </div>
        )}

        {statuses.length === 0 && !loading && !error && (
          <div className="p-4 text-gray-500 text-sm text-center">投稿がありません</div>
        )}

        {statuses.map((status) => (
          <Post
            key={status.id}
            status={status}
            instanceUrl={instanceUrl}
            accessToken={accessToken}
            accountKey={accountKey}
            onUpdate={updateStatus}
            onDelete={removeStatus}
            onOpenDetail={setDetailStatus}
            onOpenProfile={handleOpenProfile}
            onAddTagColumn={onAddTagColumn}
            currentAccountId={currentAccountId}
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
      </div>

      {detailStatus && (
        <StatusDetailModal
          status={detailStatus}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          currentAccountId={currentAccountId}
          onClose={() => setDetailStatus(null)}
          onOpenProfile={handleOpenProfile}
          onDelete={removeStatus}
        />
      )}

      {profileAccount && (
        <UserProfileModal
          account={profileAccount}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          accountKey={accountKey}
          currentAccountId={currentAccountId}
          onClose={() => setProfileAccount(null)}
          onOpenDetail={(s) => { setProfileAccount(null); setDetailStatus(s) }}
          onOpenProfile={handleOpenProfile}
          accounts={accounts}
        />
      )}
    </div>
  )
}
