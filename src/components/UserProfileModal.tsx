import { useEffect, useRef, useState } from 'react'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { Post } from './Post'
import type { Account, Relationship, Status } from '../types'
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
const LIST_LIMIT = 40

type ModalView = 'profile' | 'following' | 'followers'

const MUTE_DURATION_OPTIONS = [
  { value: '0',      label: '無期限' },
  { value: '1800',   label: '30分' },
  { value: '3600',   label: '1時間' },
  { value: '21600',  label: '6時間' },
  { value: '86400',  label: '24時間' },
  { value: '259200', label: '3日' },
  { value: '604800', label: '7日' },
]

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
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [followLoading, setFollowLoading] = useState(false)

  // List view state
  const [view, setView] = useState<ModalView>('profile')
  const [listAccounts, setListAccounts] = useState<Account[]>([])
  const [listRelationships, setListRelationships] = useState<Record<string, Relationship>>({})
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [listMaxId, setListMaxId] = useState<string | undefined>(undefined)
  const [listHasMore, setListHasMore] = useState(true)
  const [listPrivate, setListPrivate] = useState(false)
  const [listFollowingInProgress, setListFollowingInProgress] = useState<Set<string>>(new Set())

  // Menu / mute / block state
  const [showMenu, setShowMenu] = useState(false)
  const [showMuteDialog, setShowMuteDialog] = useState(false)
  const [muteDuration, setMuteDuration] = useState('0')
  const [muteNotifications, setMuteNotifications] = useState(true)
  const [muteLoading, setMuteLoading] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [showUnmuteDialog, setShowUnmuteDialog] = useState(false)
  const [showUnblockDialog, setShowUnblockDialog] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const listScrollRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isSelf = !!currentAccountId && currentAccountId === initialAccount.id

  useEffect(() => {
    let cancelled = false
    const c = new MastodonClient(instanceUrl, accessToken)

    Promise.all([
      c.getAccountById(initialAccount.id),
      isSelf ? Promise.resolve(null) : c.getRelationship(initialAccount.id),
      c.getAccountStatuses(initialAccount.id, { pinned: true }),
      c.getAccountStatuses(initialAccount.id, { limit: LIMIT, exclude_replies: true }),
    ])
      .then(([fullAccount, rel, pinned, initial]) => {
        if (cancelled) return
        setAccount(fullAccount)
        setRelationship(rel)
        setPinnedStatuses(pinned)
        setStatuses(initial)
        setHasMore(initial.length === LIMIT)
        if (initial.length > 0) setMaxId(initial[initial.length - 1].id)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInitialLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAccount.id])

  // Click outside → close menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const loadMore = async () => {
    if (loading || !hasMore || !maxId) return
    setLoading(true)
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const next = await c.getAccountStatuses(initialAccount.id, {
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

  // Profile scroll
  useEffect(() => {
    if (view !== 'profile') return
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMore()
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  })

  // List scroll
  useEffect(() => {
    if (view === 'profile') return
    const el = listScrollRef.current
    if (!el) return
    const handler = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMoreList()
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

  const handleFollow = async () => {
    if (!relationship || followLoading) return
    setFollowLoading(true)
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const updated = await c.followAccount(account.id)
      setRelationship(updated)
    } catch {
      // ignore
    } finally {
      setFollowLoading(false)
    }
  }

  const handleUnfollow = async () => {
    if (!relationship || followLoading) return
    setFollowLoading(true)
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const updated = await c.unfollowAccount(account.id)
      setRelationship(updated)
    } catch {
      // ignore
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMute = async () => {
    if (muteLoading) return
    setMuteLoading(true)
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const updated = await c.muteAccount(account.id, {
        duration: parseInt(muteDuration),
        notifications: muteNotifications,
      })
      setRelationship(updated)
      setShowMuteDialog(false)
    } catch {
      // ignore
    } finally {
      setMuteLoading(false)
    }
  }

  const handleUnmute = async () => {
    if (showUnmuteDialog) return
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const updated = await c.unmuteAccount(account.id)
      setRelationship(updated)
      setShowUnmuteDialog(false)
    } catch {
      // ignore
    }
  }

  const handleBlock = async () => {
    if (blockLoading) return
    setBlockLoading(true)
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const updated = await c.blockAccount(account.id)
      setRelationship(updated)
      setShowBlockDialog(false)
    } catch {
      // ignore
    } finally {
      setBlockLoading(false)
    }
  }

  const handleUnblock = async () => {
    if (showUnblockDialog) return
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const updated = await c.unblockAccount(account.id)
      setRelationship(updated)
      setShowUnblockDialog(false)
    } catch {
      // ignore
    }
  }

  const fetchListPage = async (viewType: 'following' | 'followers', pageMaxId?: string) => {
    setListLoading(true)
    setListError(null)
    const c = new MastodonClient(instanceUrl, accessToken)
    try {
      const accs = viewType === 'followers'
        ? await c.getFollowers(account.id, { max_id: pageMaxId, limit: LIST_LIMIT })
        : await c.getFollowing(account.id, { max_id: pageMaxId, limit: LIST_LIMIT })

      if (!pageMaxId && accs.length === 0) {
        const count = viewType === 'followers' ? account.followers_count : account.following_count
        if (count > 0) setListPrivate(true)
        setListHasMore(false)
        return
      }

      const rels = accs.length > 0 ? await c.getRelationships(accs.map((a) => a.id)) : []
      const relMap: Record<string, Relationship> = {}
      rels.forEach((r) => { relMap[r.id] = r })

      if (pageMaxId) {
        setListAccounts((prev) => [...prev, ...accs])
        setListRelationships((prev) => ({ ...prev, ...relMap }))
      } else {
        setListAccounts(accs)
        setListRelationships(relMap)
      }
      if (accs.length > 0) setListMaxId(accs[accs.length - 1].id)
      setListHasMore(accs.length === LIST_LIMIT)
    } catch {
      setListError('読み込みに失敗しました')
      if (!pageMaxId) {
        const count = viewType === 'followers' ? account.followers_count : account.following_count
        if (count > 0) setListPrivate(true)
      }
    } finally {
      setListLoading(false)
    }
  }

  const handleOpenList = (viewType: 'following' | 'followers') => {
    setView(viewType)
    setListAccounts([])
    setListRelationships({})
    setListMaxId(undefined)
    setListHasMore(true)
    setListPrivate(false)
    setListError(null)
    fetchListPage(viewType, undefined)
  }

  const loadMoreList = () => {
    if (listLoading || !listHasMore || view === 'profile') return
    fetchListPage(view as 'following' | 'followers', listMaxId)
  }

  const handleListFollow = async (accountId: string) => {
    setListFollowingInProgress((prev) => new Set(prev).add(accountId))
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const rel = await c.followAccount(accountId)
      setListRelationships((prev) => ({ ...prev, [accountId]: rel }))
    } catch { /* ignore */ } finally {
      setListFollowingInProgress((prev) => { const s = new Set(prev); s.delete(accountId); return s })
    }
  }

  const handleListUnfollow = async (accountId: string) => {
    setListFollowingInProgress((prev) => new Set(prev).add(accountId))
    try {
      const c = new MastodonClient(instanceUrl, accessToken)
      const rel = await c.unfollowAccount(accountId)
      setListRelationships((prev) => ({ ...prev, [accountId]: rel }))
    } catch { /* ignore */ } finally {
      setListFollowingInProgress((prev) => { const s = new Set(prev); s.delete(accountId); return s })
    }
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
        {view !== 'profile' ? (
          /* ---- List view ---- */
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 flex-shrink-0">
              <button
                onClick={() => setView('profile')}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                title="戻る"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-white font-semibold text-sm flex-1">
                {view === 'followers' ? 'フォロワー' : 'フォロー中'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                aria-label="閉じる"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div ref={listScrollRef} className="overflow-y-auto flex-1">
              {listPrivate && (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  この一覧は非公開に設定されています
                </div>
              )}
              {listError && !listPrivate && (
                <div className="p-3 text-red-400 text-xs">エラー: {listError}</div>
              )}
              {!listPrivate && listAccounts.map((acc) => {
                const rel = listRelationships[acc.id]
                const isOwnAccount = currentAccountId === acc.id
                const inProgress = listFollowingInProgress.has(acc.id)
                return (
                  <div key={acc.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 hover:bg-gray-700/40 transition-colors">
                    <img
                      src={acc.avatar_static}
                      alt=""
                      className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-white text-sm font-medium truncate"
                        dangerouslySetInnerHTML={{ __html: emojifyText(acc.display_name || acc.username, acc.emojis) }}
                      />
                      <p className="text-gray-400 text-xs truncate">@{acc.acct}</p>
                      {rel?.followed_by && (
                        <span className="inline-block mt-0.5 text-xs text-gray-400 bg-gray-700 rounded px-1.5 py-0.5">フォローされています</span>
                      )}
                    </div>
                    {!isOwnAccount && rel && (
                      <div className="flex-shrink-0">
                        {rel.following ? (
                          <button
                            onClick={() => handleListUnfollow(acc.id)}
                            disabled={inProgress}
                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-600 text-gray-300 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {inProgress ? '...' : 'フォロー解除'}
                          </button>
                        ) : rel.requested ? (
                          <button
                            onClick={() => handleListUnfollow(acc.id)}
                            disabled={inProgress}
                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {inProgress ? '...' : 'リクエスト中'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleListFollow(acc.id)}
                            disabled={inProgress}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {inProgress ? '...' : acc.locked ? 'リクエスト' : 'フォロー'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {listLoading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}
              {!listLoading && !listHasMore && listAccounts.length > 0 && (
                <div className="p-3 text-gray-600 text-xs text-center">最後まで読み込みました</div>
              )}
              {!listLoading && listAccounts.length === 0 && !listPrivate && !listError && (
                <div className="p-4 text-gray-500 text-sm text-center">ユーザーがいません</div>
              )}
            </div>
          </>
        ) : (
          /* ---- Profile view ---- */
          <>
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
                <div className="-mt-8 mb-3 flex justify-between gap-3">
                  <div className="min-w-0">
                    <img
                      src={account.avatar_static}
                      alt={account.display_name || account.username}
                      className="w-16 h-16 rounded-full border-4 border-gray-800 bg-gray-700 mb-2"
                    />
                    <div className="min-w-0">
                      <p
                        className="font-bold text-white text-base leading-tight break-words"
                        dangerouslySetInnerHTML={{ __html: emojifyText(account.display_name || account.username, account.emojis) }}
                      />
                      <p className="text-gray-400 text-sm break-all">@{account.acct}</p>
                      {relationship?.followed_by && (
                        <span className="inline-block mt-1 text-xs text-gray-400 bg-gray-700 rounded px-1.5 py-0.5">フォローされています</span>
                      )}
                    </div>
                  </div>

                  {!isSelf && relationship && (
                    <div className="mt-11 flex-shrink-0 flex items-center gap-1.5">
                      {/* Follow button */}
                      {relationship.following ? (
                        <button
                          onClick={handleUnfollow}
                          disabled={followLoading}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {followLoading ? '...' : 'フォロー解除'}
                        </button>
                      ) : relationship.requested ? (
                        <button
                          onClick={handleUnfollow}
                          disabled={followLoading}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {followLoading ? '...' : 'フォローリクエストをキャンセル'}
                        </button>
                      ) : (
                        <button
                          onClick={handleFollow}
                          disabled={followLoading}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {followLoading ? '...' : account.locked ? 'フォローリクエストを送る' : 'フォローする'}
                        </button>
                      )}

                      {/* Menu button */}
                      <div className="relative" ref={menuRef}>
                        <button
                          onClick={() => setShowMenu((v) => !v)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            showMenu
                              ? 'border-gray-500 text-white bg-gray-700'
                              : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                          }`}
                          title="その他の操作"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {showMenu && (
                          <div className="absolute right-0 top-full mt-1 w-64 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-20 overflow-hidden">
                            <a
                              href={account.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setShowMenu(false)}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors flex items-center gap-2"
                            >
                              元のページを開く
                              <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            {relationship.muting ? (
                              <button
                                onClick={() => { setShowMenu(false); setShowUnmuteDialog(true) }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors border-t border-gray-600"
                              >
                                ミュートを解除
                              </button>
                            ) : (
                              <button
                                onClick={() => { setShowMenu(false); setShowMuteDialog(true) }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors border-t border-gray-600"
                              >
                                このユーザーをミュートする
                              </button>
                            )}
                            {relationship.blocking ? (
                              <button
                                onClick={() => { setShowMenu(false); setShowUnblockDialog(true) }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors border-t border-gray-600"
                              >
                                ブロックを解除
                              </button>
                            ) : (
                              <button
                                onClick={() => { setShowMenu(false); setShowBlockDialog(true) }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-600 hover:text-red-300 transition-colors border-t border-gray-600"
                              >
                                このユーザーをブロックする
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                  <button
                    onClick={() => handleOpenList('following')}
                    className="hover:text-blue-400 transition-colors text-left"
                  >
                    <span className="text-white font-medium">{account.following_count.toLocaleString()}</span> フォロー
                  </button>
                  <button
                    onClick={() => handleOpenList('followers')}
                    className="hover:text-blue-400 transition-colors text-left"
                  >
                    <span className="text-white font-medium">{account.followers_count.toLocaleString()}</span> フォロワー
                  </button>
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
          </>
        )}

        {/* Unmute dialog */}
        {showUnmuteDialog && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
            onClick={() => setShowUnmuteDialog(false)}
          >
            <div
              className="bg-gray-800 rounded-xl p-5 w-80 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold mb-3">ミュートを解除しますか？</h3>
              <div className="flex items-center gap-3 mb-5 p-3 bg-gray-700/50 rounded-lg">
                <img src={account.avatar_static} alt="" className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate" dangerouslySetInnerHTML={{ __html: emojifyText(account.display_name || account.username, account.emojis) }} />
                  <p className="text-gray-400 text-xs truncate">@{account.acct}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowUnmuteDialog(false)} className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded transition-colors">キャンセル</button>
                <button onClick={handleUnmute} className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors">ミュートを解除</button>
              </div>
            </div>
          </div>
        )}

        {/* Unblock dialog */}
        {showUnblockDialog && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
            onClick={() => setShowUnblockDialog(false)}
          >
            <div
              className="bg-gray-800 rounded-xl p-5 w-80 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold mb-3">ブロックを解除しますか？</h3>
              <div className="flex items-center gap-3 mb-5 p-3 bg-gray-700/50 rounded-lg">
                <img src={account.avatar_static} alt="" className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate" dangerouslySetInnerHTML={{ __html: emojifyText(account.display_name || account.username, account.emojis) }} />
                  <p className="text-gray-400 text-xs truncate">@{account.acct}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowUnblockDialog(false)} className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded transition-colors">キャンセル</button>
                <button onClick={handleUnblock} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors">ブロックを解除</button>
              </div>
            </div>
          </div>
        )}

        {/* Block dialog */}
        {showBlockDialog && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
            onClick={() => setShowBlockDialog(false)}
          >
            <div
              className="bg-gray-800 rounded-xl p-5 w-80 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold mb-3">このユーザーをブロックしますか？</h3>
              <div className="flex items-center gap-3 mb-5 p-3 bg-gray-700/50 rounded-lg">
                <img src={account.avatar_static} alt="" className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                <div className="min-w-0">
                  <p
                    className="text-white text-sm font-medium truncate"
                    dangerouslySetInnerHTML={{ __html: emojifyText(account.display_name || account.username, account.emojis) }}
                  />
                  <p className="text-gray-400 text-xs truncate">@{account.acct}</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-5">ブロックすると、このユーザーからフォローされなくなり、タイムラインに投稿が表示されなくなります。</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowBlockDialog(false)}
                  className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleBlock}
                  disabled={blockLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
                >
                  {blockLoading ? 'ブロック中...' : 'ブロックする'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mute dialog */}
        {showMuteDialog && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
            onClick={() => setShowMuteDialog(false)}
          >
            <div
              className="bg-gray-800 rounded-xl p-5 w-80 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold mb-3">このユーザーをミュートしますか？</h3>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-700/50 rounded-lg">
                <img src={account.avatar_static} alt="" className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                <div className="min-w-0">
                  <p
                    className="text-white text-sm font-medium truncate"
                    dangerouslySetInnerHTML={{ __html: emojifyText(account.display_name || account.username, account.emojis) }}
                  />
                  <p className="text-gray-400 text-xs truncate">@{account.acct}</p>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-gray-400 text-xs mb-1.5">ミュート期間</label>
                <select
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MUTE_DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={muteNotifications}
                  onChange={(e) => setMuteNotifications(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-gray-300 text-sm">通知をオフにする</span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowMuteDialog(false)}
                  className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleMute}
                  disabled={muteLoading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
                >
                  {muteLoading ? 'ミュート中...' : 'ミュートする'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
