import { useCallback, useEffect, useRef, useState } from 'react'
import { createStream } from '../services/streaming'
import type { Status, ColumnType } from '../types'

export type StreamStatus = 'connecting' | 'connected' | 'disconnected'

interface UseStreamingOptions {
  instanceUrl: string
  accessToken: string
  type: ColumnType
  tag?: string
  listId?: string
  onlyMedia?: boolean
  onNew: (status: Status) => void
  onDelete: (id: string) => void
}

interface UseStreamingResult {
  streamStatus: StreamStatus
  reconnect: () => void
}

const NO_STREAM_TYPES: ColumnType[] = ['favourites', 'bookmarks', 'scheduled', 'search', 'conversations']

export function useStreaming({
  instanceUrl,
  accessToken,
  type,
  tag,
  listId,
  onlyMedia,
  onNew,
  onDelete,
}: UseStreamingOptions): UseStreamingResult {
  const onNewRef = useRef(onNew)
  const onDeleteRef = useRef(onDelete)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting')

  useEffect(() => { onNewRef.current = onNew }, [onNew])
  useEffect(() => { onDeleteRef.current = onDelete }, [onDelete])

  useEffect(() => {
    if (NO_STREAM_TYPES.includes(type)) return

    setStreamStatus('connecting')

    const ws = createStream(instanceUrl, accessToken, type, tag, (event) => {
      if (event.event === 'update') {
        try {
          const status = JSON.parse(event.payload) as Status
          onNewRef.current(status)
        } catch {
          // ignore
        }
      } else if (event.event === 'delete') {
        onDeleteRef.current(event.payload)
      }
    }, undefined, onlyMedia, listId)

    ws.addEventListener('open', () => setStreamStatus('connected'))
    ws.addEventListener('close', () => setStreamStatus('disconnected'))
    ws.addEventListener('error', () => setStreamStatus('disconnected'))

    return () => {
      ws.close()
    }
  }, [instanceUrl, accessToken, type, tag, listId, onlyMedia, reconnectKey])

  const reconnect = useCallback(() => setReconnectKey((k) => k + 1), [])

  return { streamStatus, reconnect }
}
