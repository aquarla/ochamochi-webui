import { createPortal } from 'react-dom'
import { ComposeForm } from './ComposeForm'
import type { Account } from '../types'

interface ComposeModalProps {
  instanceUrl: string
  accessToken: string
  accountKey?: string
  account?: Account | null
  onClose: () => void
  onComposed: () => void
}

export function ComposeModal({ instanceUrl, accessToken, accountKey, account, onClose, onComposed }: ComposeModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-semibold text-sm">新規投稿</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {account && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-700/60">
            <img
              src={account.avatar_static}
              alt={account.display_name || account.username}
              className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate leading-tight">{account.display_name || account.username}</p>
              <p className="text-gray-400 text-xs truncate leading-tight">@{account.acct}</p>
            </div>
          </div>
        )}
        <ComposeForm
          instanceUrl={instanceUrl}
          accessToken={accessToken}
          accountKey={accountKey}
          onComposed={onComposed}
          onCancel={onClose}
        />
      </div>
    </div>,
    document.body,
  )
}
