import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MastodonClient } from '../services/mastodon'
import { emojifyText, emojifyHtml } from '../utils/emojify'
import { ComposeForm } from './ComposeForm'
import type { Status } from '../types'

interface ReplyModalProps {
  status: Status
  instanceUrl: string
  accessToken: string
  accountKey?: string
  onClose: () => void
  onComposed: () => void
}

function ThreadPost({ status, highlight, showConnector }: { status: Status; highlight?: boolean; showConnector?: boolean }) {
  const hasCw = !!status.spoiler_text
  const [cwOpen, setCwOpen] = useState(!hasCw)

  return (
    <div className={`flex gap-3 px-4 pt-3 ${highlight ? 'pb-3' : 'pb-0'}`}>
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: '2.25rem' }}>
        <img
          src={status.account.avatar_static}
          alt={status.account.display_name || status.account.username}
          className={`rounded-full bg-gray-700 flex-shrink-0 ${highlight ? 'w-10 h-10' : 'w-9 h-9'}`}
        />
        {showConnector && <div className="w-0.5 flex-1 bg-gray-600 mt-1 min-h-[1rem]" />}
      </div>
      <div className={`flex-1 min-w-0 ${showConnector ? 'pb-3' : ''}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={`font-medium text-white truncate ${highlight ? 'text-sm' : 'text-xs'}`}
            dangerouslySetInnerHTML={{ __html: emojifyText(status.account.display_name || status.account.username, status.account.emojis) }}
          />
          <span className="text-gray-500 text-xs truncate">@{status.account.acct}</span>
        </div>
        {hasCw && (
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-yellow-400 text-sm flex-1"
              dangerouslySetInnerHTML={{ __html: emojifyText(status.spoiler_text, status.emojis) }}
            />
            <button
              onClick={() => setCwOpen((v) => !v)}
              className="flex-shrink-0 text-xs px-2 py-0.5 rounded border border-yellow-600 text-yellow-400 hover:bg-yellow-900/40"
            >
              {cwOpen ? '隠す' : '表示'}
            </button>
          </div>
        )}
        {(!hasCw || cwOpen) && (
          <div
            className="text-gray-200 text-sm leading-relaxed prose prose-sm prose-invert max-w-none break-words [&_a]:text-blue-400 [&_p]:mb-1"
            dangerouslySetInnerHTML={{ __html: emojifyHtml(status.content, status.emojis) }}
          />
        )}
      </div>
    </div>
  )
}

export function ReplyModal({ status, instanceUrl, accessToken, accountKey, onClose, onComposed }: ReplyModalProps) {
  const [ancestors, setAncestors] = useState<Status[]>([])
  const threadEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const client = new MastodonClient(instanceUrl, accessToken)
    client.getStatusContext(status.id)
      .then((ctx) => setAncestors(ctx.ancestors))
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 祖先が読み込まれたらスレッド末尾（返信対象）にスクロール
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [ancestors])

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-semibold text-sm">返信</h2>
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

        {/* スレッド表示（スクロール可） */}
        <div className="overflow-y-auto min-h-0" style={{ maxHeight: '40vh' }}>
          {ancestors.map((s, i) => (
            <ThreadPost key={s.id} status={s} showConnector={i < ancestors.length - 1 || true} />
          ))}
          <ThreadPost status={status} highlight />
          <div ref={threadEndRef} />
        </div>

        {/* 返信フォーム */}
        <div className="border-t border-gray-700 flex-shrink-0">
          <ComposeForm
            instanceUrl={instanceUrl}
            accessToken={accessToken}
            accountKey={accountKey}
            inReplyToId={status.id}
            initialText={`@${status.account.acct} `}
            onComposed={onComposed}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
