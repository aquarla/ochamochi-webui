import { useState, useEffect, useCallback, useRef } from 'react'
import { MastodonClient } from '../services/mastodon'
import { createStream } from '../services/streaming'
import type { MastodonNotification } from '../types'

const PAGE_LIMIT = 20

export function useNotifications(
  instanceUrl: string,
  accessToken: string,
  onNew?: (n: MastodonNotification) => void,
) {
  const [notifications, setNotifications] = useState<MastodonNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const clientRef = useRef(new MastodonClient(instanceUrl, accessToken))
  const onNewRef = useRef(onNew)
  onNewRef.current = onNew

  useEffect(() => {
    clientRef.current = new MastodonClient(instanceUrl, accessToken)
  }, [instanceUrl, accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await clientRef.current.getNotifications({ limit: PAGE_LIMIT })
      setNotifications(items)
      setHasMore(items.length === PAGE_LIMIT)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setNotifications([])
    setHasMore(true)
    load()
  }, [load])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || notifications.length === 0) return
    const lastId = notifications[notifications.length - 1].id
    setLoading(true)
    try {
      const items = await clientRef.current.getNotifications({ max_id: lastId, limit: PAGE_LIMIT })
      setNotifications((prev) => [...prev, ...items])
      setHasMore(items.length === PAGE_LIMIT)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, notifications])

  // Streaming: user stream, listen for 'notification' events
  useEffect(() => {
    const ws = createStream(instanceUrl, accessToken, 'notifications', undefined, (event) => {
      if (event.event === 'notification') {
        try {
          const n = JSON.parse(event.payload) as MastodonNotification
          setNotifications((prev) => {
            if (prev.some((x) => x.id === n.id)) return prev
            return [n, ...prev]
          })
          onNewRef.current?.(n)
        } catch {
          // ignore
        }
      }
    })
    return () => ws.close()
  }, [instanceUrl, accessToken])

  return { notifications, loading, error, hasMore, loadMore }
}
