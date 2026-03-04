import { useState, useRef, useEffect } from 'react'
import { Column } from './Column'
import { NotificationsColumn } from './NotificationsColumn'
import { ComposeForm } from './ComposeForm'
import { AddColumnModal } from './AddColumnModal'
import { AddAccountModal } from './AddAccountModal'
import { addColumn, removeColumn } from '../store/columns'
import type { AuthContext } from '../hooks/useAuth'
import type { ColumnConfig, ColumnType } from '../types'

interface LayoutProps {
  auth: AuthContext
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
}

export function Layout({ auth, columns, onColumnsChange }: LayoutProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
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

  const handleAddColumn = (type: ColumnType, tag?: string) => {
    onColumnsChange(addColumn(columns, type, tag))
  }

  const handleRemoveColumn = (id: string) => {
    onColumnsChange(removeColumn(columns, id))
  }

  const handleUpdateColumn = (updated: ColumnConfig) => {
    onColumnsChange(columns.map((c) => (c.id === updated.id ? updated : c)))
  }

  const handleSwitchAccount = (accountKey: string) => {
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
            <span className="text-gray-400 text-sm">@{auth.account.acct}@{new URL(auth.instanceUrl).hostname}</span>
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

          {auth.account && (
            <div className="relative ml-2" ref={accountMenuRef}>
              <button
                onClick={() => setShowAccountMenu((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-700 transition-colors"
              >
                <img
                  src={auth.account.avatar_static}
                  alt={auth.account.display_name || auth.account.username}
                  className="w-7 h-7 rounded-full bg-gray-700"
                />
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
                        <img
                          src={entry.account.avatar_static}
                          alt={entry.account.display_name || entry.account.username}
                          className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0"
                        />
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

      {/* Compose panel */}
      {showCompose && (
        <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
          <ComposeForm
            instanceUrl={auth.instanceUrl!}
            accessToken={auth.accessToken!}
            accountKey={auth.activeAccountKey ?? undefined}
            onComposed={() => setShowCompose(false)}
          />
        </div>
      )}

      {/* Columns */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden gap-[10px] p-[10px]">
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
                onRemove={handleRemoveColumn}
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
              />
            )
          )
        )}
      </div>

      {showAddModal && (
        <AddColumnModal
          onAdd={handleAddColumn}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showAddAccountModal && (
        <AddAccountModal onClose={() => setShowAddAccountModal(false)} />
      )}
    </div>
  )
}
