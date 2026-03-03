import { useEffect, useRef } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import type { ColumnConfig } from '../types'

interface NotificationsColumnProps {
  column: ColumnConfig
  instanceUrl: string
  accessToken: string
  onRemove: (id: string) => void
}

export function NotificationsColumn({ column, instanceUrl, accessToken, onRemove }: NotificationsColumnProps) {
  const { notifications, loading, error, hasMore, loadMore } = useNotifications(instanceUrl, accessToken)
  const scrollRef = useRef<HTMLDivElement>(null)

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
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700 bg-gray-800/90 sticky top-0 z-10">
        <h2 className="text-white font-semibold text-sm">通知</h2>
        <button
          onClick={() => onRemove(column.id)}
          className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
          title="カラムを削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-3 text-red-400 text-xs border-b border-gray-700">エラー: {error}</div>
        )}

        {notifications.length === 0 && !loading && !error && (
          <div className="p-4 text-gray-500 text-sm text-center">通知がありません</div>
        )}

        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} />
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
    </div>
  )
}
