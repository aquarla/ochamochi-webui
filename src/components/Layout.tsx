import { useState, useRef, useEffect } from 'react'
import { Column } from './Column'
import { NotificationsColumn } from './NotificationsColumn'
import { ComposeModal } from './ComposeModal'
import { ConversationsColumn } from './ConversationsColumn'
import { AddColumnModal } from './AddColumnModal'
import { AddAccountModal } from './AddAccountModal'
import { addColumn, removeColumn } from '../store/columns'
import { useTheme } from '../hooks/useTheme'
import { SettingsModal } from './SettingsModal'
import { ScheduledColumn } from './ScheduledColumn'
import { SearchColumn } from './SearchColumn'
import { UserProfileModal } from './UserProfileModal'
import { StatusUrlModal } from './StatusUrlModal'
import { StatusDetailModal } from './StatusDetailModal'
import { loadSettings } from '../hooks/useSettings'
import { useBackgroundNotifications } from '../hooks/useBackgroundNotifications'
import type { AppSettings } from '../hooks/useSettings'
import type { AuthContext } from '../hooks/useAuth'
import type { ColumnConfig, ColumnType, Status } from '../types'

interface LayoutProps {
  auth: AuthContext
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
}

export function Layout({ auth, columns, onColumnsChange }: LayoutProps) {
  useTheme(auth.activeAccountKey)
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(auth.activeAccountKey))

  useEffect(() => {
    setSettings(loadSettings(auth.activeAccountKey))
  }, [auth.activeAccountKey])

  const [showAddModal, setShowAddModal] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSelfProfile, setShowSelfProfile] = useState(false)
  const { badgeCounts, clearBadge } = useBackgroundNotifications(auth.accounts, auth.activeAccountKey)

  const [showUrlModal, setShowUrlModal] = useState(false)
  const [urlStatus, setUrlStatus] = useState<Status | null>(null)
  const [selfProfileDetailStatus, setSelfProfileDetailStatus] = useState<Status | null>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false)
      }
    }
    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAccountMenu])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCompose(false)
        return
      }
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return
      e.preventDefault()
      setShowCompose((v) => !v)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleAddColumn = (type: ColumnType, tag?: string, listId?: string, listTitle?: string, searchType?: 'accounts' | 'statuses' | 'hashtags') => {
    onColumnsChange(addColumn(columns, type, tag, listId, listTitle, searchType))
  }

  const handleRemoveColumn = (id: string) => {
    onColumnsChange(removeColumn(columns, id))
  }

  const handleUpdateColumn = (updated: ColumnConfig) => {
    onColumnsChange(columns.map((c) => (c.id === updated.id ? updated : c)))
  }

  const handleSwitchAccount = (accountKey: string) => {
    clearBadge(accountKey)
    auth.switchAccount(accountKey)
    setShowAccountMenu(false)
  }

  const handleLogout = () => {
    setShowAccountMenu(false)
    if (window.confirm('このアカウントをログアウトしますか？')) {
      auth.logout()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold">Ochamochi Web for Mastodon</h1>
          {auth.account && auth.instanceUrl && (
            <button
              onClick={() => setShowSelfProfile(true)}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              @{auth.account.acct}@{new URL(auth.instanceUrl).hostname}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCompose((v) => !v)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            投稿
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
            </svg>
            カラム追加
          </button>

          <button
            onClick={() => setShowUrlModal(true)}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-700"
            title="投稿URLを開く"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-700"
            title="設定"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {auth.account && (
            <div className="relative ml-2" ref={accountMenuRef}>
              <button
                onClick={() => setShowAccountMenu((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-700 transition-colors"
              >
                <div className="relative">
                  <img
                    src={auth.account.avatar_static}
                    alt={auth.account.display_name || auth.account.username}
                    className="w-7 h-7 rounded-full bg-gray-700"
                  />
                  {Object.values(badgeCounts).some((v) => v > 0) && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-800" />
                  )}
                </div>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* Account list */}
                  <div className="py-1">
                    {auth.accounts.map((entry) => (
                      <button
                        key={entry.accountKey}
                        onClick={() => handleSwitchAccount(entry.accountKey)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={entry.account.avatar_static}
                            alt={entry.account.display_name || entry.account.username}
                            className="w-8 h-8 rounded-full bg-gray-700"
                          />
                          {(badgeCounts[entry.accountKey] ?? 0) > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                              {badgeCounts[entry.accountKey] > 99 ? '99+' : badgeCounts[entry.accountKey]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {entry.account.display_name || entry.account.username}
                          </p>
                          <p className="text-gray-400 text-xs truncate">@{entry.account.acct}</p>
                        </div>
                        {entry.accountKey === auth.activeAccountKey && (
                          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-gray-700 py-1">
                    <button
                      onClick={() => {
                        setShowAccountMenu(false)
                        setShowAddAccountModal(true)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors text-left text-blue-400 hover:text-blue-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-medium">アカウントを追加</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors text-left text-red-400 hover:text-red-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-sm font-medium">ログアウト</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showCompose && (
        <ComposeModal
          instanceUrl={auth.instanceUrl!}
          accessToken={auth.accessToken!}
          accountKey={auth.activeAccountKey ?? undefined}
          onComposed={() => setShowCompose(false)}
          onClose={() => setShowCompose(false)}
        />
      )}

      {/* Columns */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden gap-[10px] p-[10px]" data-font-size={settings.fontSize} data-col-width={settings.columnWidth}>
        {columns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="mb-3">カラムがありません</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                カラムを追加する
              </button>
            </div>
          </div>
        ) : (
          columns.map((col) =>
            col.type === 'notifications' ? (
              <NotificationsColumn
                key={col.id}
                column={col}
                instanceUrl={auth.instanceUrl!}
                accessToken={auth.accessToken!}
                accountKey={auth.activeAccountKey ?? undefined}
                currentAccountId={auth.account?.id}
                accounts={auth.accounts}
                onRemove={handleRemoveColumn}
                onUpdate={handleUpdateColumn}
                onAddTagColumn={(tag) => handleAddColumn('tag', tag)}
              />
            ) : col.type === 'scheduled' ? (
              <ScheduledColumn
                key={col.id}
                column={col}
                instanceUrl={auth.instanceUrl!}
                accessToken={auth.accessToken!}
                onRemove={handleRemoveColumn}
                onUpdate={handleUpdateColumn}
              />
            ) : col.type === 'search' ? (
              <SearchColumn
                key={col.id}
                column={col}
                instanceUrl={auth.instanceUrl!}
                accessToken={auth.accessToken!}
                accountKey={auth.activeAccountKey ?? undefined}
                currentAccountId={auth.account?.id}
                accounts={auth.accounts}
                onRemove={handleRemoveColumn}
                onUpdate={handleUpdateColumn}
                onAddTagColumn={(tag) => handleAddColumn('tag', tag)}
              />
            ) : col.type === 'conversations' ? (
              <ConversationsColumn
                key={col.id}
                column={col}
                instanceUrl={auth.instanceUrl!}
                accessToken={auth.accessToken!}
                accountKey={auth.activeAccountKey ?? undefined}
                currentAccountId={auth.account?.id}
                accounts={auth.accounts}
                onRemove={handleRemoveColumn}
                onUpdate={handleUpdateColumn}
                onAddTagColumn={(tag) => handleAddColumn('tag', tag)}
              />
            ) : (
              <Column
                key={col.id}
                column={col}
                instanceUrl={auth.instanceUrl!}
                accessToken={auth.accessToken!}
                accountKey={auth.activeAccountKey ?? undefined}
                onRemove={handleRemoveColumn}
                onUpdate={handleUpdateColumn}
                onAddTagColumn={(tag) => handleAddColumn('tag', tag)}
                currentAccountId={auth.account?.id}
                accounts={auth.accounts}
              />
            )
          )
        )}
      </div>

      {showAddModal && (
        <AddColumnModal
          onAdd={handleAddColumn}
          onClose={() => setShowAddModal(false)}
          instanceUrl={auth.instanceUrl ?? undefined}
          accessToken={auth.accessToken ?? undefined}
        />
      )}

      {showAddAccountModal && (
        <AddAccountModal onClose={() => setShowAddAccountModal(false)} />
      )}

      {showSelfProfile && auth.account && (
        <UserProfileModal
          account={auth.account}
          instanceUrl={auth.instanceUrl!}
          accessToken={auth.accessToken!}
          accountKey={auth.activeAccountKey ?? undefined}
          currentAccountId={auth.account.id}
          onClose={() => setShowSelfProfile(false)}
          accounts={auth.accounts}
          onOpenDetail={setSelfProfileDetailStatus}
        />
      )}

      {selfProfileDetailStatus && (
        <StatusDetailModal
          status={selfProfileDetailStatus}
          instanceUrl={auth.instanceUrl!}
          accessToken={auth.accessToken!}
          accountKey={auth.activeAccountKey ?? undefined}
          currentAccountId={auth.account?.id}
          accounts={auth.accounts}
          onClose={() => setSelfProfileDetailStatus(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          accountKey={auth.activeAccountKey ?? undefined}
          instanceUrl={auth.instanceUrl ?? undefined}
          onSave={setSettings}
        />
      )}

      {showUrlModal && (
        <StatusUrlModal
          instanceUrl={auth.instanceUrl!}
          accessToken={auth.accessToken!}
          onOpen={(status) => { setShowUrlModal(false); setUrlStatus(status) }}
          onClose={() => setShowUrlModal(false)}
        />
      )}

      {urlStatus && (
        <StatusDetailModal
          status={urlStatus}
          instanceUrl={auth.instanceUrl!}
          accessToken={auth.accessToken!}
          accountKey={auth.activeAccountKey ?? undefined}
          currentAccountId={auth.account?.id}
          accounts={auth.accounts}
          onClose={() => setUrlStatus(null)}
        />
      )}
    </div>
  )
}
