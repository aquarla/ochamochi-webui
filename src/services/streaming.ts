import type { ColumnType, StreamEvent } from '../types'

export type StreamHandler = (event: StreamEvent) => void

function getStreamName(type: ColumnType, tag?: string): string {
  switch (type) {
    case 'home':
    case 'notifications':
      return 'user'
    case 'local':
      return 'public:local'
    case 'public':
      return 'public'
    case 'tag':
      return `hashtag&tag=${encodeURIComponent(tag ?? '')}`
  }
}

export function createStream(
  instanceUrl: string,
  accessToken: string,
  type: ColumnType,
  tag: string | undefined,
  onEvent: StreamHandler,
  onError?: (err: Event) => void,
): WebSocket {
  const wsUrl = instanceUrl.replace(/^http/, 'ws')
  const stream = getStreamName(type, tag)
  const url = `${wsUrl}/api/v1/streaming?access_token=${encodeURIComponent(accessToken)}&stream=${stream}`

  const ws = new WebSocket(url)

  ws.addEventListener('message', (msg) => {
    try {
      const event = JSON.parse(msg.data as string) as StreamEvent
      onEvent(event)
    } catch {
      // ignore parse errors
    }
  })

  if (onError) {
    ws.addEventListener('error', onError)
  }

  return ws
}
