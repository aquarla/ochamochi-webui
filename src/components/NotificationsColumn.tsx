import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { UserProfileModal } from './UserProfileModal'
import { StatusDetailModal } from './StatusDetailModal'
import { loadSettings } from '../hooks/useSettings'
import type { ColumnConfig, Account, MastodonNotification, Status } from '../types'
import type { StoredAccountEntry } from '../services/auth'

interface NotificationsColumnProps {
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

export function NotificationsColumn({ column, instanceUrl, accessToken, accountKey, currentAccountId, accounts, onRemove, onUpdate, onAddTagColumn }: NotificationsColumnProps) {
  const [profileAccount, setProfileAccount] = useState<Account | null>(null)
  const [detailStatus, setDetailStatus] = useState<Status | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const settings = loadSettings(accountKey)

  const handleNewNotification = (n: MastodonNotification) => {
    if (!settings.desktopNotification) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (n.type === 'mention' && !settings.notifyMention) return
    if ((n.type === 'follow' || n.type === 'follow_request') && !settings.notifyFollow) return
    if (n.type === 'reblog' && !settings.notifyReblog) return
    if (n.type === 'favourite' && !settings.notifyFavourite) return
    const name = n.account.display_name || n.account.username
    const titles: Record<string, string> = {
      mention: `${name} があなたにメンションしました`,
      follow: `${name} があなたをフォローしました`,
      follow_request: `${name} がフォローリクエストを送りました`,
      reblog: `${name} があなたの投稿をブーストしました`,
      favourite: `${name} があなたの投稿をお気に入りしました`,
      poll: 'アンケートが終了しました',
      update: `${name} が投稿を編集しました`,
      'admin.sign_up': `${name} が新規登録しました`,
      'admin.report': `${name} が通報しました`,
    }
    const title = titles[n.type] ?? `${name} からの通知`
    const body = n.status?.content ? n.status.content.replace(/<[^>]+>/g, '').trim() : undefined
    new Notification(title, { body, icon: n.account.avatar_static })
  }

  const { notifications, loading, error, hasMore, loadMore } = useNotifications(instanceUrl, accessToken, handleNewNotification)

  const visibleNotifications = notifications.filter((n) => {
    if (n.type === 'mention') return settings.notifyMention
    if (n.type === 'follow' || n.type === 'follow_request') return settings.notifyFollow
    if (n.type === 'reblog') return settings.notifyReblog
    if (n.type === 'favourite') return settings.notifyFavourite
    return true
  })

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
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <h2
          className="text-white font-semibold text-sm truncate min-w-0 cursor-pointer hover:text-gray-300 transition-colors"
          title="通知"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        >通知</h2>
        <div className="flex items-center gap-1">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-3 text-red-400 text-xs border-b border-gray-700">エラー: {error}</div>
        )}

        {visibleNotifications.length === 0 && !loading && !error && (
          <div className="p-4 text-gray-500 text-sm text-center">通知がありません</div>
        )}

        {visibleNotifications.map((n) => (
          <NotificationItem key={n.id} notification={n} instanceUrl={instanceUrl} accessToken={accessToken} onOpenProfile={setProfileAccount} onAddTagColumn={onAddTagColumn} onOpenDetail={setDetailStatus} />
        ))}

        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {!hasMore && notifications.length > 0 && (
          <div className="p-3 text-gray-600 text-xs text-center">最後まで読み込みました</div>
        )}
      </div>

      {detailStatus && (
        <StatusDetailModal
          status={detailStatus}
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          accountKey={accountKey}
          currentAccountId={currentAccountId}
          onClose={() => setDetailStatus(null)}
          onOpenProfile={(account) => { setDetailStatus(null); setProfileAccount(account) }}
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
