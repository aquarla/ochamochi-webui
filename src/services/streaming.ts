import type { ColumnType, StreamEvent } from '../types'

export type StreamHandler = (event: StreamEvent) => void

function getStreamName(type: ColumnType, tag?: string, onlyMedia?: boolean): string {
  switch (type) {
    case 'home':
    case 'notifications':
      return 'user'
    case 'local':
      return onlyMedia ? 'public:local:media' : 'public:local'
    case 'public':
      return onlyMedia ? 'public:media' : 'public'
    case 'tag':
      return `hashtag&tag=${encodeURIComponent(tag ?? '')}`
    case 'favourites':
    case 'bookmarks':
    case 'scheduled':
      return ''  // no streaming endpoint; useStreaming skips this type
  }
}

export function createStream(
  instanceUrl: string,
  accessToken: string,
  type: ColumnType,
  tag: string | undefined,
  onEvent: StreamHandler,
  onError?: (err: Event) => void,
  onlyMedia?: boolean,
): WebSocket {
  const wsUrl = instanceUrl.replace(/^http/, 'ws')
  const stream = getStreamName(type, tag, onlyMedia)
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
