import { useEffect, useRef } from 'react'
import { createStream } from '../services/streaming'
import type { Status, ColumnType } from '../types'

interface UseStreamingOptions {
  instanceUrl: string
  accessToken: string
  type: ColumnType
  tag?: string
  onNew: (status: Status) => void
  onDelete: (id: string) => void
}

export function useStreaming({
  instanceUrl,
  accessToken,
  type,
  tag,
  onNew,
  onDelete,
}: UseStreamingOptions): void {
  const onNewRef = useRef(onNew)
  const onDeleteRef = useRef(onDelete)

  useEffect(() => {
    onNewRef.current = onNew
  }, [onNew])

  useEffect(() => {
    onDeleteRef.current = onDelete
  }, [onDelete])

  useEffect(() => {
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
    })

    return () => {
      ws.close()
    }
  }, [instanceUrl, accessToken, type, tag])
}
