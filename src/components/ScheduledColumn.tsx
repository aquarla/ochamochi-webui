import { useCallback, useEffect, useState } from 'react'
import { MastodonClient } from '../services/mastodon'
import type { ColumnConfig, ScheduledStatus } from '../types'

interface ScheduledColumnProps {
  column: ColumnConfig
  instanceUrl: string
  accessToken: string
  onRemove: (id: string) => void
  onUpdate: (column: ColumnConfig) => void
}

function formatScheduledAt(at: string): string {
  return new Date(at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ScheduledColumn({ column, instanceUrl, accessToken, onRemove, onUpdate }: ScheduledColumnProps) {
  const [statuses, setStatuses] = useState<ScheduledStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ScheduledStatus | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      const data = await client.getScheduledStatuses()
      setStatuses(data.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [instanceUrl, accessToken])

  useEffect(() => { load() }, [load])

  const executeCancel = async () => {
    if (!cancelTarget || cancelLoading) return
    setCancelLoading(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      await client.cancelScheduledStatus(cancelTarget.id)
      setStatuses((prev) => prev.filter((s) => s.id !== cancelTarget.id))
      setCancelTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'キャンセルに失敗しました')
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-gray-800 border-r border-gray-700">
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <h2 className="text-white font-semibold text-sm truncate min-w-0" title="予約投稿">予約投稿</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={load}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
            title="更新"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
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

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
        {error && (
          <div className="p-3 text-red-400 text-xs border-b border-gray-700">エラー: {error}</div>
        )}
        {!loading && !error && statuses.length === 0 && (
          <div className="p-4 text-gray-500 text-sm text-center">予約投稿はありません</div>
        )}
        {statuses.map((s) => (
          <div key={s.id} className="px-3 py-3 border-b border-gray-700 hover:bg-gray-700/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-400 text-xs">{formatScheduledAt(s.scheduled_at)}</span>
                </div>
                <p className="text-gray-200 text-sm break-words whitespace-pre-wrap line-clamp-4">
                  {s.params.text}
                </p>
                {s.params.spoiler_text && (
                  <p className="text-yellow-400 text-xs mt-1">CW: {s.params.spoiler_text}</p>
                )}
                {s.media_attachments.length > 0 && (
                  <p className="text-gray-500 text-xs mt-1">画像 {s.media_attachments.length}枚</p>
                )}
              </div>
              <button
                onClick={() => setCancelTarget(s)}
                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 p-1 mt-0.5"
                title="予約をキャンセル"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {cancelTarget && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
          onClick={() => setCancelTarget(null)}
        >
          <div
            className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold text-base mb-4">この予約投稿をキャンセルしますか？</h3>
            <div className="mb-4 bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-400 text-xs">{formatScheduledAt(cancelTarget.scheduled_at)}</span>
              </div>
              <p className="text-gray-300 text-sm line-clamp-4 leading-relaxed whitespace-pre-wrap">
                {cancelTarget.params.spoiler_text
                  ? `CW: ${cancelTarget.params.spoiler_text}`
                  : cancelTarget.params.text}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={executeCancel}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {cancelLoading ? 'キャンセル中…' : '予約をキャンセル'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
