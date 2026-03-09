import { useState, useEffect } from 'react'
import { MastodonClient } from '../services/mastodon'
import type { ColumnType, MastodonList } from '../types'

interface AddColumnModalProps {
  onAdd: (type: ColumnType, tag?: string, listId?: string, listTitle?: string, searchType?: 'accounts' | 'statuses' | 'hashtags') => void
  onClose: () => void
  instanceUrl?: string
  accessToken?: string
}

export function AddColumnModal({ onAdd, onClose, instanceUrl, accessToken }: AddColumnModalProps) {
  const [type, setType] = useState<ColumnType>('tag')
  const [tag, setTag] = useState('')
  const [lists, setLists] = useState<MastodonList[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<'accounts' | 'statuses' | 'hashtags'>('statuses')

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
    )
    onClose()
  }

  const isSubmitDisabled = (type === 'tag' && !tag.trim()) || (type === 'list' && !selectedListId)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['home', 'notifications', 'local', 'public', 'tag', 'list', 'favourites', 'bookmarks', 'scheduled', 'search'] as ColumnType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {t === 'home' ? 'ホーム' : t === 'notifications' ? '通知' : t === 'local' ? 'ローカル' : t === 'public' ? '連合' : t === 'list' ? 'リスト' : t === 'favourites' ? 'お気に入り' : t === 'bookmarks' ? 'ブックマーク' : t === 'scheduled' ? '予約投稿' : t === 'search' ? '検索' : 'タグ'}
              </button>
            ))}
          </div>

          {type === 'tag' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">タグ名</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="mastodon (# 不要)"
                className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            追加
          </button>
        </form>
      </div>
    </div>
  )
}
