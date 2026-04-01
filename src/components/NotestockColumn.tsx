import { useCallback, useEffect, useRef, useState } from 'react'
import { useNotestockTimeline } from '../hooks/useNotestockTimeline'
import { useWordFilters } from '../hooks/useWordFilters'
import { isFiltered } from '../utils/wordFilterMatch'
import { loadNotestockToken } from '../store/notestockToken'
import { getColumnLabel } from '../store/columns'
import { Post } from './Post'
import { StatusDetailModal } from './StatusDetailModal'
import { UserProfileModal } from './UserProfileModal'
import type { ColumnConfig, Status, Account } from '../types'
import type { StoredAccountEntry } from '../services/auth'

type AcctMode = 'all' | 'self' | 'custom'

interface FilterPanelProps {
  column: ColumnConfig
  currentAcct?: string
  hasApiToken: boolean
  onApply: (query: string, acctMode: AcctMode, acct: string, maxDt: string, includePrivate: boolean) => void
}

// datetime-local value (YYYY-MM-DDTHH:MM) → ISO 8601 string
function localDateTimeToIso(value: string): string {
  if (!value) return ''
  return new Date(value).toISOString()
}

// ISO 8601 string → datetime-local value (時刻は 00:00 にデフォルト)
function isoToLocalDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 今日の日付＋00:00 (datetime-local の max 用)
function todayAtMidnight(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function FilterPanel({ column, currentAcct, hasApiToken, onApply }: FilterPanelProps) {
  const [query, setQuery] = useState(column.notestockQuery ?? '')
  const [acctMode, setAcctMode] = useState<AcctMode>(column.notestockAcctMode ?? 'all')
  const [acct, setAcct] = useState(column.notestockAcct ?? '')
  const [includePrivate, setIncludePrivate] = useState(column.notestockIncludePrivate ?? true)
  const [maxDt, setMaxDt] = useState(() => {
    const restored = isoToLocalDateTime(column.notestockMaxDt)
    // 時刻部分が未設定の場合は 00:00 をデフォルトとして使う
    if (restored && !restored.includes('T')) return `${restored}T00:00`
    return restored
  })

  const handleDateChange = (value: string) => {
    // 日付だけ変わった場合、時刻は 00:00 にリセット
    if (value && !value.includes('T')) {
      setMaxDt(`${value}T00:00`)
    } else {
      setMaxDt(value)
    }
  }

  const handleApply = () => onApply(query.trim(), acctMode, acct.trim(), maxDt ? localDateTimeToIso(maxDt) : '', includePrivate)

  return (
    <div className="border-b border-gray-700 bg-gray-800 px-3 py-3 space-y-2 flex-shrink-0">
      <div>
        <label className="block text-xs text-gray-400 mb-1">検索クエリ</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
          placeholder="キーワード（空欄で全件）"
          className="w-full bg-gray-700/60 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="off"
          data-1p-ignore
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">検索範囲</label>
        <div className="space-y-1">
          {([
            { value: 'all', label: 'すべて' },
            { value: 'self', label: `自分のみ${currentAcct ? ` (@${currentAcct})` : ''}` },
            { value: 'custom', label: 'acct指定' },
          ] as const).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="notestockAcctMode"
                value={value}
                checked={acctMode === value}
                onChange={() => setAcctMode(value)}
                className="accent-blue-500"
              />
              <span className="text-gray-300 text-xs">{label}</span>
            </label>
          ))}
        </div>
        {acctMode === 'custom' && (
          <input
            type="text"
            value={acct}
            onChange={(e) => setAcct(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
            placeholder="user@example.com"
            className="mt-2 w-full bg-gray-700/60 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="off"
            data-1p-ignore
          />
        )}
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">この日時より前を検索（省略可）</label>
        <div className="flex items-center gap-1">
          <input
            type="datetime-local"
            value={maxDt}
            max={todayAtMidnight()}
            onChange={(e) => handleDateChange(e.target.value)}
            className="flex-1 bg-gray-700/60 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {maxDt && (
            <button type="button" onClick={() => setMaxDt('')} className="text-gray-500 hover:text-gray-300 text-xs px-1">
              ✕
            </button>
          )}
        </div>
      </div>
      {hasApiToken && acctMode === 'self' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includePrivate}
            onChange={(e) => setIncludePrivate(e.target.checked)}
            className="accent-blue-500"
          />
          <span className="text-gray-300 text-xs">非公開投稿を含める</span>
        </label>
      )}
      {acctMode === 'all' && !query.trim() && (
        <p className="text-yellow-500 text-xs">「すべて」で検索するにはキーワードが必要です</p>
      )}
      <button
        type="button"
        onClick={handleApply}
        disabled={acctMode === 'all' && !query.trim()}
        className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
      >
        適用
      </button>
    </div>
  )
}

interface NotestockColumnProps {
  column: ColumnConfig
  instanceUrl: string
  accessToken: string
  accountKey?: string
  onRemove: (id: string) => void
  onUpdate: (column: ColumnConfig) => void
  onAddTagColumn?: (tag: string) => void
  currentAccountId?: string
  currentAcct?: string
  accounts?: StoredAccountEntry[]
}

export function NotestockColumn({
  column,
  instanceUrl,
  accessToken,
  accountKey,
  onRemove,
  onUpdate,
  onAddTagColumn,
  currentAccountId,
  currentAcct,
  accounts,
}: NotestockColumnProps) {
  const [detailStatus, setDetailStatus] = useState<Status | null>(null)
  const [profileAccount, setProfileAccount] = useState<Account | null>(null)
  const [showFilter, setShowFilter] = useState(false)

  const apitoken = loadNotestockToken(accountKey)
  const query = column.notestockQuery ?? ''
  const acctMode = column.notestockAcctMode ?? 'all'

  const fullSelfAcct = (() => {
    if (!currentAcct) return ''
    if (currentAcct.includes('@')) return currentAcct
    try { return `${currentAcct}@${new URL(instanceUrl).hostname}` } catch { return currentAcct }
  })()

  const effectiveAcct = acctMode === 'self' ? fullSelfAcct : acctMode === 'custom' ? (column.notestockAcct ?? '') : ''
  const hasFilter = !!(query || acctMode !== 'all' || column.notestockMaxDt)

  const includePrivate = (apitoken && acctMode === 'self') ? (column.notestockIncludePrivate ?? true) : undefined

  const { statuses: rawStatuses, loading, error, hasMore, loadMore, updateStatus } =
    useNotestockTimeline(query, effectiveAcct || undefined, apitoken || undefined, column.notestockMaxDt, includePrivate)

  const { filters: wordFilters } = useWordFilters(accountKey)
  const statuses = rawStatuses.filter((s) => !isFiltered(s, wordFilters))

  const handleOpenProfile = useCallback((account: Account) => {
    setDetailStatus(null)
    setProfileAccount(account)
  }, [])

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMore()
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [loadMore])

  const label = getColumnLabel(column)

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-gray-800 border-r border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2
            className="text-white font-semibold text-sm truncate min-w-0 cursor-pointer hover:text-gray-300 transition-colors"
            title={label}
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            {label}
          </h2>
          <span className="flex-shrink-0 text-[10px] text-gray-600 font-medium">NS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              showFilter || hasFilter
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
            }`}
            title="フィルター"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          </button>
          <button
            onClick={() => onUpdate({ ...column, locked: !column.locked })}
            className={`transition-colors p-1 rounded ${
              column.locked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
            }`}
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

      {/* Filter panel */}
      {showFilter && (
        <FilterPanel
          column={column}
          currentAcct={currentAcct}
          hasApiToken={!!apitoken}
          onApply={(q, mode, a, dt, priv) => {
            onUpdate({
              ...column,
              notestockQuery: q || undefined,
              notestockAcctMode: mode,
              notestockAcct: mode === 'custom' ? (a || undefined) : undefined,
              notestockMaxDt: dt || undefined,
              notestockIncludePrivate: priv,
            })
            setShowFilter(false)
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
            onOpenDetail={setDetailStatus}
            onOpenProfile={handleOpenProfile}
            onAddTagColumn={onAddTagColumn}
            currentAccountId={currentAccountId}
            accounts={accounts}
            resolveOnAction
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
          onUpdate={updateStatus}
        />
      )}
    </div>
  )
}
