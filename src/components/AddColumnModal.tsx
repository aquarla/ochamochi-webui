import { useState, useEffect } from 'react'
import { MastodonClient } from '../services/mastodon'
import { loadNotestockToken } from '../store/notestockToken'
import type { ColumnType, MastodonList } from '../types'

interface AddColumnModalProps {
  onAdd: (type: ColumnType, tag?: string, listId?: string, listTitle?: string, searchType?: 'accounts' | 'statuses' | 'hashtags', notestockQuery?: string, notestockAcctMode?: 'all' | 'self' | 'custom', notestockAcct?: string, notestockIncludePrivate?: boolean, notestockMaxDt?: string) => void
  onClose: () => void
  instanceUrl?: string
  accessToken?: string
  currentAcct?: string
  accountKey?: string
}

export function AddColumnModal({ onAdd, onClose, instanceUrl, accessToken, currentAcct, accountKey }: AddColumnModalProps) {
  const hasNotestockToken = !!loadNotestockToken(accountKey)
  const [type, setType] = useState<ColumnType>('tag')
  const [tag, setTag] = useState('')
  const [lists, setLists] = useState<MastodonList[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<'accounts' | 'statuses' | 'hashtags'>('statuses')
  const [notestockQuery, setNotestockQuery] = useState('')
  const [notestockAcctMode, setNotestockAcctMode] = useState<'all' | 'self' | 'custom'>('all')
  const [notestockAcct, setNotestockAcct] = useState('')
  const [notestockIncludePrivate, setNotestockIncludePrivate] = useState(true)
  const [notestockMaxDt, setNotestockMaxDt] = useState('')

  useEffect(() => {
    if (type !== 'list' || !instanceUrl || !accessToken) return
    setListsLoading(true)
    setListsError(null)
    const client = new MastodonClient(instanceUrl, accessToken)
    client.getLists()
      .then((data) => setLists(data))
      .catch((e) => setListsError(e instanceof Error ? e.message : 'リスト取得に失敗しました'))
      .finally(() => setListsLoading(false))
  }, [type, instanceUrl, accessToken])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'tag' && !tag.trim()) return
    if (type === 'list' && !selectedListId) return
    const selectedList = type === 'list' ? lists.find((l) => l.id === selectedListId) : undefined
    onAdd(
      type,
      type === 'tag' ? tag.trim().replace(/^#/, '') : undefined,
      selectedList?.id,
      selectedList?.title,
      type === 'search' ? searchType : undefined,
      type === 'notestock' ? notestockQuery.trim() : undefined,
      type === 'notestock' ? notestockAcctMode : undefined,
      type === 'notestock' && notestockAcctMode === 'custom' ? notestockAcct.trim() : undefined,
      type === 'notestock' ? notestockIncludePrivate : undefined,
      type === 'notestock' && notestockMaxDt ? new Date(notestockMaxDt).toISOString() : undefined,
    )
    onClose()
  }

  const isSubmitDisabled =
    (type === 'tag' && !tag.trim()) ||
    (type === 'list' && !selectedListId) ||
    (type === 'notestock' && notestockAcctMode === 'all' && !notestockQuery.trim())

  const typeLabel = (t: ColumnType) => {
    switch (t) {
      case 'home': return 'ホーム'
      case 'notifications': return '通知'
      case 'local': return 'ローカル'
      case 'public': return '連合'
      case 'tag': return 'タグ'
      case 'list': return 'リスト'
      case 'favourites': return 'お気に入り'
      case 'bookmarks': return 'ブックマーク'
      case 'scheduled': return '予約投稿'
      case 'search': return '検索'
      case 'conversations': return '会話'
      case 'notestock': return 'notestock'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">カラムを追加</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-4">
            {/* 左列: タイプ選択 */}
            <div className="flex flex-col gap-1 w-32 flex-shrink-0">
              {(['home', 'notifications', 'local', 'public', 'tag', 'list', 'favourites', 'bookmarks', 'scheduled', 'search', 'conversations', 'notestock'] as ColumnType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    type === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {typeLabel(t)}
                </button>
              ))}
            </div>

            {/* 右列: 設定 */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">

          {type === 'tag' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">タグ名</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="mastodon (# 不要)"
                className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
                data-1p-ignore
                autoFocus
              />
            </div>
          )}

          {type === 'list' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">リストを選択</label>
              {listsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : listsError ? (
                <p className="text-red-400 text-xs">{listsError}</p>
              ) : lists.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-2">リストがありません</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => setSelectedListId(list.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedListId === list.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {list.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {type === 'search' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">検索種別</label>
              <div className="flex gap-2">
                {(['statuses', 'accounts', 'hashtags'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSearchType(st)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      searchType === st
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {st === 'statuses' ? '投稿' : st === 'accounts' ? 'アカウント' : 'タグ'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'notestock' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">検索クエリ（省略可）</label>
                <input
                  type="text"
                  value={notestockQuery}
                  onChange={(e) => setNotestockQuery(e.target.value)}
                  placeholder="キーワード（空欄で全件）"
                  className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                  data-1p-ignore
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">検索範囲</label>
                <div className="space-y-1.5">
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
                        checked={notestockAcctMode === value}
                        onChange={() => setNotestockAcctMode(value)}
                        className="accent-blue-500"
                      />
                      <span className="text-gray-300 text-sm">{label}</span>
                    </label>
                  ))}
                </div>
                {notestockAcctMode === 'custom' && (
                  <input
                    type="text"
                    value={notestockAcct}
                    onChange={(e) => setNotestockAcct(e.target.value)}
                    placeholder="user@example.com"
                    className="mt-2 w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
                    data-1p-ignore
                  />
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">この日時より前を検索（省略可）</label>
                <div className="flex items-center gap-1">
                  <input
                    type="datetime-local"
                    value={notestockMaxDt}
                    max={(() => { const d = new Date(); const p = (n: number) => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` })()}
                    onChange={(e) => setNotestockMaxDt(e.target.value)}
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {notestockMaxDt && (
                    <button type="button" onClick={() => setNotestockMaxDt('')} className="text-gray-500 hover:text-gray-300 text-sm px-1">✕</button>
                  )}
                </div>
              </div>
              {hasNotestockToken && notestockAcctMode === 'self' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notestockIncludePrivate}
                    onChange={(e) => setNotestockIncludePrivate(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-gray-300 text-sm">非公開投稿を含める</span>
                </label>
              )}
            </div>
          )}

            </div>{/* 右列 end */}
          </div>{/* flex gap-4 end */}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            追加
          </button>
        </form>
      </div>
    </div>
  )
}
