import type { Status, Account, MediaAttachment } from '../types'

// ── Raw types from Notestock API (ActivityPub-like format) ──────────────────

interface NotestockIcon {
  url: string
  type: string
  mediaType: string
}

interface NotestockImage {
  url: string
}

interface NotestockRawAccount {
  id: string
  url: string
  name?: string
  preferredUsername?: string
  subject?: string
  note?: string
  avatar?: string
  icon?: NotestockIcon
  header?: string
  image?: NotestockImage
}

interface NotestockRawAttachment {
  url: string
  name: string | null
  type: string
  mediaType?: string
}

interface NotestockRawStatus {
  id: string
  url: string
  content: string
  published: string
  sensitive?: boolean
  summary?: string | null | object
  attachment?: NotestockRawAttachment[]
  account: NotestockRawAccount
}

interface NotestockSearchResponse {
  statuses: NotestockRawStatus[]
}

// ── Converters ──────────────────────────────────────────────────────────────

function convertAttachment(raw: NotestockRawAttachment): MediaAttachment {
  const mt = raw.mediaType ?? ''
  const type: MediaAttachment['type'] = mt.startsWith('video')
    ? 'video'
    : mt.startsWith('audio')
    ? 'audio'
    : mt.startsWith('image')
    ? 'image'
    : 'unknown'
  return {
    id: raw.url,
    type,
    url: raw.url,
    preview_url: raw.url,
    description: raw.name,
    meta: {},
  }
}

function convertAccount(raw: NotestockRawAccount): Account {
  const avatar = raw.avatar ?? raw.icon?.url ?? ''
  const header = raw.header ?? raw.image?.url ?? ''
  return {
    id: raw.id,
    username: raw.preferredUsername ?? '',
    acct: raw.subject ?? raw.preferredUsername ?? '',
    display_name: raw.name ?? raw.preferredUsername ?? '',
    avatar,
    avatar_static: avatar,
    header,
    header_static: header,
    url: raw.url,
    note: raw.note ?? '',
    locked: false,
    bot: false,
    followers_count: 0,
    following_count: 0,
    statuses_count: 0,
    emojis: [],
    fields: [],
  }
}

function convertStatus(raw: NotestockRawStatus): Status {
  const spoilerText = typeof raw.summary === 'string' ? raw.summary : ''
  return {
    id: raw.id,
    created_at: raw.published,
    content: raw.content,
    visibility: 'public',
    sensitive: raw.sensitive ?? false,
    spoiler_text: spoilerText,
    url: raw.url,
    uri: raw.id,
    account: convertAccount(raw.account),
    reblog: null,
    media_attachments: (raw.attachment ?? []).map(convertAttachment),
    replies_count: 0,
    reblogs_count: 0,
    favourites_count: 0,
    reblogged: false,
    favourited: false,
    bookmarked: false,
    language: null,
    in_reply_to_id: null,
    in_reply_to_account_id: null,
    mentions: [],
    tags: [],
    emojis: [],
  }
}

// ── API client ──────────────────────────────────────────────────────────────

const NOTESTOCK_API = 'https://notestock.osa-p.net/api/v1/search.json'

export interface NotestockSearchResult {
  statuses: Status[]
  nextMaxDt: string | undefined
}

function parseLinkNextMaxDt(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined
  // Link: <https://...?max_dt=2019-01-07T10%3A48%3A14%2B00%3A00&...>; rel="next"
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  if (!match) return undefined
  try {
    return new URL(match[1]).searchParams.get('max_dt') ?? undefined
  } catch {
    return undefined
  }
}

export async function searchNotestock(params: {
  q?: string
  apitoken?: string
  includePrivate?: boolean
  max_dt?: string
  acct?: string
}): Promise<NotestockSearchResult> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.max_dt) qs.set('max_dt', params.max_dt)
  if (params.acct) qs.set('acct', params.acct)
  if (params.apitoken) {
    qs.set('apitoken', params.apitoken)
    if (params.includePrivate === true) qs.set('p', '1')
  }

  const method = params.apitoken ? 'POST' : 'GET'
  const res = await fetch(`${NOTESTOCK_API}?${qs}`, { method })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  const data = (await res.json()) as NotestockSearchResponse
  const rawStatuses = data.statuses ?? []
  const statuses = rawStatuses.map(convertStatus)
  const nextMaxDt = parseLinkNextMaxDt(res.headers.get('Link'))
  return {
    statuses,
    nextMaxDt,
  }
}
