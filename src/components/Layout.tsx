import { useState } from 'react'
import { Column } from './Column'
import { NotificationsColumn } from './NotificationsColumn'
import { ComposeForm } from './ComposeForm'
import { AddColumnModal } from './AddColumnModal'
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

  const handleAddColumn = (type: ColumnType, tag?: string) => {
    onColumnsChange(addColumn(columns, type, tag))
  }

  const handleRemoveColumn = (id: string) => {
    onColumnsChange(removeColumn(columns, id))
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold">Ochamochi Web for Mastodon</h1>
          {auth.account && (
            <span className="text-gray-400 text-sm">@{auth.account.acct}</span>
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
            <div className="flex items-center gap-2 ml-2">
              <img
                src={auth.account.avatar_static}
                alt={auth.account.display_name || auth.account.username}
                className="w-7 h-7 rounded-full bg-gray-700"
              />
              <button
                onClick={() => { if (window.confirm('ログアウトしますか？')) auth.logout() }}
                className="text-gray-400 hover:text-white text-xs transition-colors"
              >
                ログアウト
              </button>
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
                onRemove={handleRemoveColumn}
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
    </div>
  )
}
