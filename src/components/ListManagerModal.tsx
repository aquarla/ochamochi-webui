import { useState, useEffect } from 'react'
import { MastodonClient } from '../services/mastodon'
import type { MastodonList, Account } from '../types'

interface ListManagerModalProps {
  instanceUrl: string
  accessToken: string
  onClose: () => void
}

type RepliesPolicy = 'followed' | 'list' | 'none'

const REPLIES_POLICY_LABELS: Record<RepliesPolicy, string> = {
  followed: 'フォロー中への返信',
  list: 'メンバーへの返信のみ',
  none: '返信を表示しない',
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── 中ペイン: 設定 ───────────────────────────────────────────

interface ListSettingsPanelProps {
  list: MastodonList | null  // null = 新規作成
  instanceUrl: string
  accessToken: string
  onSaved: (list: MastodonList) => void
  onDeleted: (id: string) => void
}

function ListSettingsPanel({ list, instanceUrl, accessToken, onSaved, onDeleted }: ListSettingsPanelProps) {
  const isNew = list === null
  const [title, setTitle] = useState(list?.title ?? '')
  const [exclusive, setExclusive] = useState(list?.exclusive ?? false)
  const [repliesPolicy, setRepliesPolicy] = useState<RepliesPolicy>(list?.replies_policy ?? 'followed')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle(list?.title ?? '')
    setExclusive(list?.exclusive ?? false)
    setRepliesPolicy(list?.replies_policy ?? 'followed')
    setError(null)
    setConfirmDelete(false)
  }, [list?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      const saved = isNew
        ? await client.createList(title.trim(), exclusive, repliesPolicy)
        : await client.updateList(list!.id, title.trim(), exclusive, repliesPolicy)
      onSaved(saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!list) return
    setDeleting(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.deleteList(list.id)
      onDeleted(list.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full px-5 py-4">
      <h3 className="text-white font-semibold text-sm mb-4">{isNew ? '新規リスト作成' : 'リストを編集'}</h3>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      {/* タイトル */}
      <div className="mb-5">
        <label className="block text-gray-400 text-xs mb-1">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          placeholder="リスト名"
          className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-1p-ignore
        />
      </div>

      {/* 設定 */}
      <div className="space-y-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white text-sm">メンバーをホームに表示しない</p>
            <p className="text-gray-500 text-xs mt-0.5">リストメンバーの投稿をホームタイムラインから除外する</p>
          </div>
          <ToggleSwitch checked={exclusive} onChange={setExclusive} />
        </div>

        <div>
          <p className="text-white text-sm mb-2">返信の表示</p>
          <div className="space-y-1.5">
            {(['followed', 'list', 'none'] as RepliesPolicy[]).map((v) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="replies_policy"
                  value={v}
                  checked={repliesPolicy === v}
                  onChange={() => setRepliesPolicy(v)}
                  className="accent-blue-500"
                />
                <span className="text-gray-300 text-sm">{REPLIES_POLICY_LABELS[v]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 保存・削除 */}
      <div className="mt-4 pt-4 border-t border-gray-700/60 space-y-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {saving ? '保存中…' : isNew ? '作成' : '保存'}
        </button>

        {!isNew && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs flex-1">本当に削除しますか？</span>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded transition-colors">キャンセル</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs px-3 py-1 rounded transition-colors">
                {deleting ? '削除中…' : '削除'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="w-full text-red-400 hover:text-red-300 text-xs py-1 transition-colors">
              このリストを削除する
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── 右ペイン: メンバー管理 ──────────────────────────────────

interface MemberPanelProps {
  list: MastodonList
  instanceUrl: string
  accessToken: string
}

function MemberPanel({ list, instanceUrl, accessToken }: MemberPanelProps) {
  const [members, setMembers] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Account[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    setMembers([])
    setSearchQuery('')
    setSearchResults([])
    const client = new MastodonClient(instanceUrl, accessToken)
    client.getListAccounts(list.id)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [list.id, instanceUrl, accessToken])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const client = new MastodonClient(instanceUrl, accessToken)
        const results = await client.searchFollowing(searchQuery)
        if (!cancelled) {
          const memberIds = new Set(members.map((m) => m.id))
          setSearchResults(results.filter((a) => !memberIds.has(a.id)))
        }
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [searchQuery, members, instanceUrl, accessToken])

  const handleAdd = async (account: Account) => {
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.addListAccounts(list.id, [account.id])
      setMembers((prev) => [...prev, account])
      setSearchResults((prev) => prev.filter((a) => a.id !== account.id))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '追加に失敗しました')
    }
  }

  const handleRemove = async (account: Account) => {
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.removeListAccounts(list.id, [account.id])
      setMembers((prev) => prev.filter((m) => m.id !== account.id))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました')
    }
  }

  return (
    <div className="flex flex-col h-full px-5 py-4">
      <h3 className="text-white font-semibold text-sm mb-3">
        メンバー {loading ? '' : `(${members.length})`}
      </h3>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      {/* 検索 */}
      <div className="relative mb-2 flex-shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="フォロー中のアカウントを検索して追加…"
          className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-1p-ignore
        />
        {searchLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* 検索結果 */}
      {searchResults.length > 0 && (
        <div className="mb-2 border border-gray-600 rounded-lg overflow-hidden flex-shrink-0">
          {searchResults.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAdd(a)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 transition-colors text-left border-b border-gray-700/50 last:border-0"
            >
              <img src={a.avatar_static} alt="" className="w-5 h-5 rounded-full bg-gray-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs truncate">{a.display_name || a.username}</p>
                <p className="text-gray-500 text-xs truncate">@{a.acct}</p>
              </div>
              <span className="text-blue-400 text-xs flex-shrink-0">追加</span>
            </button>
          ))}
        </div>
      )}

      {/* メンバー一覧 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-4 h-4 border border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-gray-500 text-xs py-2">メンバーがいません</p>
        ) : (
          <div className="divide-y divide-gray-700/40">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 py-2">
                <img src={m.avatar_static} alt="" className="w-7 h-7 rounded-full bg-gray-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{m.display_name || m.username}</p>
                  <p className="text-gray-500 text-xs truncate">@{m.acct}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(m)}
                  className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  title="リストから削除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── メインモーダル ───────────────────────────────────────────

export function ListManagerModal({ instanceUrl, accessToken, onClose }: ListManagerModalProps) {
  const [lists, setLists] = useState<MastodonList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)

  useEffect(() => {
    const client = new MastodonClient(instanceUrl, accessToken)
    client.getLists()
      .then((ls) => { setLists(ls); if (ls.length > 0) setSelectedId(ls[0].id) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [instanceUrl, accessToken])

  const selectedList = selectedId === 'new' ? null : (lists.find((l) => l.id === selectedId) ?? null)

  const handleSaved = (saved: MastodonList) => {
    setLists((prev) => {
      const exists = prev.find((l) => l.id === saved.id)
      return exists ? prev.map((l) => l.id === saved.id ? saved : l) : [...prev, saved]
    })
    setSelectedId(saved.id)
  }

  const handleDeleted = (id: string) => {
    const next = lists.filter((l) => l.id !== id)
    setLists(next)
    setSelectedId(next.length > 0 ? next[0].id : null)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-[860px] h-[560px] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-semibold">リスト管理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="閉じる">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: 3ペイン */}
        <div className="flex flex-1 min-h-0">
          {/* 左: リスト一覧 */}
          <nav className="w-44 flex-shrink-0 border-r border-gray-700 flex flex-col">
            <button
              onClick={() => setSelectedId('new')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors mx-1 mt-1 rounded-lg ${selectedId === 'new' ? 'bg-gray-700 text-white' : 'text-blue-400 hover:bg-gray-700/50'}`}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規作成
            </button>
            <div className="flex-1 overflow-y-auto py-1">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-4 h-4 border border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : lists.length === 0 ? (
                <p className="text-gray-500 text-xs px-4 py-2">リストがありません</p>
              ) : (
                lists.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors rounded-lg mx-1 ${selectedId === l.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span className="truncate flex-1">{l.title}</span>
                    {l.exclusive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" title="ホーム除外" />}
                  </button>
                ))
              )}
            </div>
          </nav>

          {/* 中: 設定 */}
          <div className="w-64 flex-shrink-0 border-r border-gray-700 overflow-y-auto">
            {selectedId === null ? (
              <p className="text-gray-500 text-sm px-5 py-4">左からリストを選択してください</p>
            ) : (
              <ListSettingsPanel
                key={selectedId}
                list={selectedList}
                instanceUrl={instanceUrl}
                accessToken={accessToken}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
              />
            )}
          </div>

          {/* 右: メンバー */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col border-l border-gray-700/0">
            {selectedList ? (
              <MemberPanel
                key={selectedList.id}
                list={selectedList}
                instanceUrl={instanceUrl}
                accessToken={accessToken}
              />
            ) : (
              <p className="text-gray-500 text-sm px-5 py-4">
                {selectedId === 'new' ? '作成後にメンバーを追加できます' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
