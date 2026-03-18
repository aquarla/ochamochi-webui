import { useEffect, useRef, useState } from 'react'
import { loadSettings } from './useSettings'
import { loadColumns } from '../store/columns'
import type { StoredAccountEntry } from '../services/auth'
import type { MastodonNotification } from '../types'

// Returns badge counts per accountKey and a function to clear a badge
export function useBackgroundNotifications(
  accounts: StoredAccountEntry[],
  activeAccountKey: string | null,
) {
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const wsRefs = useRef<Record<string, WebSocket>>({})

  useEffect(() => {
    // Close all existing connections first
    Object.values(wsRefs.current).forEach((ws) => ws.close())
    wsRefs.current = {}

    const targets = accounts.filter((a) => {
      if (a.accountKey === activeAccountKey) return false
      if (!loadSettings(a.accountKey).backgroundNotification) return false
      const hasNotificationsColumn = loadColumns(a.accountKey).some((c) => c.type === 'notifications')
      return hasNotificationsColumn
    })

    for (const entry of targets) {
      const wsUrl = entry.instanceUrl.replace(/^http/, 'ws')
      const url = `${wsUrl}/api/v1/streaming?access_token=${encodeURIComponent(entry.accessToken)}&stream=user`
      const ws = new WebSocket(url)

      ws.addEventListener('message', (msg) => {
        try {
          const event = JSON.parse(msg.data as string) as { event: string; payload: string }
          if (event.event !== 'notification') return

          const notification = JSON.parse(event.payload) as MastodonNotification
          const settings = loadSettings(entry.accountKey)

          // 通知種別フィルター（アクティブアカウントと同じ基準）
          if (notification.type === 'mention' && !settings.notifyMention) return
          if ((notification.type === 'follow' || notification.type === 'follow_request') && !settings.notifyFollow) return
          if (notification.type === 'reblog' && !settings.notifyReblog) return
          if (notification.type === 'favourite' && !settings.notifyFavourite) return

          setBadgeCounts((prev) => ({
            ...prev,
            [entry.accountKey]: (prev[entry.accountKey] ?? 0) + 1,
          }))

          // デスクトップ通知
          if (
            settings.desktopNotification &&
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted'
          ) {
            const name = notification.account.display_name || notification.account.username
            const titles: Partial<Record<MastodonNotification['type'], string>> = {
              mention: `${name} があなたにメンションしました`,
              follow: `${name} があなたをフォローしました`,
              follow_request: `${name} がフォローリクエストを送りました`,
              reblog: `${name} があなたの投稿をブーストしました`,
              favourite: `${name} があなたの投稿をお気に入りしました`,
            }
            const title = titles[notification.type] ?? `${name} からの通知`
            const body = notification.status?.content
              ? notification.status.content.replace(/<[^>]+>/g, '').trim()
              : undefined
            new Notification(title, { body, icon: notification.account.avatar_static })
          }
        } catch {
          // ignore parse errors
        }
      })

      // 切断時に自動再接続（30秒後）
      ws.addEventListener('close', () => {
        setTimeout(() => {
          // wsRefs に自分のエントリがまだ残っている場合のみ再接続
          if (wsRefs.current[entry.accountKey] === ws) {
            delete wsRefs.current[entry.accountKey]
          }
        }, 30000)
      })

      wsRefs.current[entry.accountKey] = ws
    }

    return () => {
      Object.values(wsRefs.current).forEach((ws) => ws.close())
      wsRefs.current = {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, activeAccountKey])

  const clearBadge = (accountKey: string) => {
    setBadgeCounts((prev) => {
      const next = { ...prev }
      delete next[accountKey]
      return next
    })
  }

  return { badgeCounts, clearBadge }
}
