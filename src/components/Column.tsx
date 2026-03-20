import { useCallback, useEffect, useRef, useState } from 'react'
import { useTimeline } from '../hooks/useTimeline'
import { useStreaming } from '../hooks/useStreaming'
import { getColumnLabel } from '../store/columns'
import { Post } from './Post'
import { StatusDetailModal } from './StatusDetailModal'
import { UserProfileModal } from './UserProfileModal'
import { MastodonClient } from '../services/mastodon'
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

// ---- Tag chip input ----

interface TagChipInputProps {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder?: string
}

function TagChipInput({ tags, onAdd, onRemove, placeholder = 'タグを追加…' }: TagChipInputProps) {
  const [input, setInput] = useState('')

  const commit = () => {
    const tag = input.trim().replace(/^#/, '').toLowerCase()
    if (tag && !tags.includes(tag)) onAdd(tag)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1 p-2 bg-gray-700/60 border border-gray-600 rounded-lg min-h-[2.25rem] cursor-text"
      onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-0.5 bg-blue-600/30 text-blue-300 text-xs px-2 py-0.5 rounded-full"
        >
          #{tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(tag) }}
            className="ml-0.5 hover:text-white transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 bg-transparent text-white text-xs outline-none min-w-[5rem] placeholder-gray-500"
      />
    </div>
  )
}

// ---- Tag filter panel ----

interface TagFilterPanelProps {
  column: ColumnConfig
  onApply: (updates: Pick<ColumnConfig, 'tagAny' | 'tagAll' | 'tagNone'>) => void
}

function TagFilterPanel({ column, onApply }: TagFilterPanelProps) {
  const [anyTags, setAnyTags] = useState<string[]>(column.tagAny ?? [])
  const [allTags, setAllTags] = useState<string[]>(column.tagAll ?? [])
  const [noneTags, setNoneTags] = useState<string[]>(column.tagNone ?? [])

  const add = (set: React.Dispatch<React.SetStateAction<string[]>>) => (tag: string) =>
    set((prev) => prev.includes(tag) ? prev : [...prev, tag])
  const remove = (set: React.Dispatch<React.SetStateAction<string[]>>) => (tag: string) =>
    set((prev) => prev.filter((t) => t !== tag))

  const handleApply = () => {
    onApply({
      tagAny: anyTags.length ? anyTags : undefined,
      tagAll: allTags.length ? allTags : undefined,
      tagNone: noneTags.length ? noneTags : undefined,
    })
  }

  return (
    <div className="border-b border-gray-700 bg-gray-800 px-3 py-3 space-y-3 flex-shrink-0">
      <div>
        <p className="text-xs text-gray-400 mb-1.5">
          いずれかを含む <span className="text-gray-600">any</span>
        </p>
        <TagChipInput tags={anyTags} onAdd={add(setAnyTags)} onRemove={remove(setAnyTags)} />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-1.5">
          すべてを含む <span className="text-gray-600">all</span>
        </p>
        <TagChipInput tags={allTags} onAdd={add(setAllTags)} onRemove={remove(setAllTags)} />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-1.5">
          除外するタグ <span className="text-gray-600">none</span>
        </p>
        <TagChipInput tags={noneTags} onAdd={add(setNoneTags)} onRemove={remove(setNoneTags)} />
      </div>
      <button
        type="button"
        onClick={handleApply}
        className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        適用
      </button>
    </div>
  )
}

// ---- Column ----

export function Column({ column, instanceUrl, accessToken, accountKey, onRemove, onUpdate, onAddTagColumn, currentAccountId, accounts }: ColumnProps) {
  const [detailStatus, setDetailStatus] = useState<Status | null>(null)
  const [profileAccount, setProfileAccount] = useState<Account | null>(null)
  const [showTagFilter, setShowTagFilter] = useState(false)

  const handleOpenProfile = (account: Account) => {
    setDetailStatus(null)
    setProfileAccount(account)
  }

  const isTagColumn = column.type === 'tag'
  const supportsMediaFilter = column.type !== 'home' && column.type !== 'list' && column.type !== 'favourites' && column.type !== 'bookmarks'
  const onlyMedia = supportsMediaFilter ? (column.onlyMedia ?? false) : false

  const tagFilters = isTagColumn
    ? { any: column.tagAny, all: column.tagAll, none: column.tagNone }
    : undefined

  const tagFilterCount = (column.tagAny?.length ?? 0) + (column.tagAll?.length ?? 0) + (column.tagNone?.length ?? 0)

  const { statuses, loading, error, hasMore, loadMore, prependStatus, removeStatus, removeByAccountId, updateStatus } =
    useTimeline(instanceUrl, accessToken, column.type, column.tag, supportsMediaFilter ? onlyMedia : undefined, tagFilters, column.listId)

  const handleNewStatus = useCallback((status: Status) => {
    prependStatus(status)
    // カードは非同期生成されるため、URLを含む新規投稿は30秒後に再取得する
    const target = status.reblog ?? status
    if (!target.card && target.content.includes('href=')) {
      setTimeout(async () => {
        try {
          const client = new MastodonClient(instanceUrl, accessToken)
          const updated = await client.getStatus(status.id)
          if (updated.card ?? updated.reblog?.card) updateStatus(updated)
        } catch {
          // ignore
        }
      }, 30000)
    }
  }, [prependStatus, updateStatus, instanceUrl, accessToken])

  const { streamStatus, reconnect } = useStreaming({
    instanceUrl,
    accessToken,
    type: column.type,
    tag: column.tag,
    listId: column.listId,
    onlyMedia: supportsMediaFilter ? onlyMedia : undefined,
    onNew: handleNewStatus,
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
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2
            className="text-white font-semibold text-sm truncate min-w-0 cursor-pointer hover:text-gray-300 transition-colors"
            title={label}
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          >{label}</h2>
          {streamStatus === 'disconnected' && (
            <button
              onClick={reconnect}
              title="ストリーミング切断中。クリックで再接続"
              className="flex-shrink-0 text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isTagColumn && (
            <button
              onClick={() => setShowTagFilter((v) => !v)}
              className={`relative flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                showTagFilter || tagFilterCount > 0
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              }`}
              title="タグフィルター"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {tagFilterCount > 0 && (
                <span className="text-[10px] font-bold leading-none">{tagFilterCount}</span>
              )}
            </button>
          )}
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

      {/* Tag filter panel */}
      {isTagColumn && showTagFilter && (
        <TagFilterPanel
          column={column}
          onApply={(updates) => {
            onUpdate({ ...column, ...updates })
            setShowTagFilter(false)
          }}
        />
      )}

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
            onMuteAccount={removeByAccountId}
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

      {profileAccount && (
        <UserProfileModal
          account={profileAccount}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          accountKey={accountKey}
          currentAccountId={currentAccountId}
          onClose={() => setProfileAccount(null)}
          onOpenDetail={setDetailStatus}
          onOpenProfile={handleOpenProfile}
          accounts={accounts}
        />
      )}

      {detailStatus && (
        <StatusDetailModal
          status={detailStatus}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          accountKey={accountKey}
          currentAccountId={currentAccountId}
          accounts={accounts}
          onClose={() => setDetailStatus(null)}
          onDelete={removeStatus}
          onUpdate={updateStatus}
        />
      )}
    </div>
  )
}
