export interface CustomEmoji {
  shortcode: string
  url: string
  static_url: string
  visible_in_picker?: boolean
  category?: string | null
}

export interface AccountField {
  name: string
  value: string
  verified_at: string | null
}

export interface Account {
  id: string
  username: string
  acct: string
  display_name: string
  avatar: string
  avatar_static: string
  header?: string
  header_static?: string
  url: string
  note: string
  locked: boolean
  followers_count: number
  following_count: number
  statuses_count: number
  emojis: CustomEmoji[]
  fields?: AccountField[]
}

export interface Relationship {
  id: string
  following: boolean
  requested: boolean
  followed_by: boolean
  muting: boolean
  blocking: boolean
}

export interface MediaAttachment {
  id: string
  type: 'image' | 'video' | 'gifv' | 'audio' | 'unknown'
  url: string
  preview_url: string
  description: string | null
  meta: {
    original?: { width: number; height: number }
    small?: { width: number; height: number }
  }
}

export interface Status {
  id: string
  created_at: string
  content: string
  visibility: 'public' | 'unlisted' | 'private' | 'direct'
  sensitive: boolean
  spoiler_text: string
  url: string | null
  uri: string
  account: Account
  reblog: Status | null
  media_attachments: MediaAttachment[]
  replies_count: number
  reblogs_count: number
  favourites_count: number
  reblogged: boolean | null
  favourited: boolean | null
  bookmarked: boolean | null
  language: string | null
  in_reply_to_id: string | null
  in_reply_to_account_id: string | null
  mentions: Array<{ id: string; username: string; acct: string; url: string }>
  tags: Array<{ name: string; url: string }>
  emojis: CustomEmoji[]
}

export interface Application {
  id: string
  name: string
  client_id: string
  client_secret: string
  redirect_uri: string
  vapid_key?: string
}

export type ColumnType = 'home' | 'local' | 'public' | 'tag' | 'notifications' | 'favourites' | 'bookmarks' | 'scheduled'

export interface ScheduledStatus {
  id: string
  scheduled_at: string
  params: {
    text: string
    visibility: 'public' | 'unlisted' | 'private' | 'direct' | null
    sensitive: boolean | null
    spoiler_text: string | null
    media_ids: string[] | null
    in_reply_to_id: string | null
  }
  media_attachments: MediaAttachment[]
}

export type NotificationType =
  | 'mention'
  | 'reblog'
  | 'favourite'
  | 'follow'
  | 'follow_request'
  | 'poll'
  | 'update'

export interface MastodonNotification {
  id: string
  type: NotificationType
  created_at: string
  account: Account
  status?: Status
}

export interface ColumnConfig {
  id: string
  type: ColumnType
  tag?: string
  onlyMedia?: boolean
}

export interface AuthState {
  instanceUrl: string
  accessToken: string
  account: Account | null
}

export interface StatusContext {
  ancestors: Status[]
  descendants: Status[]
}

export interface StreamEvent {
  event: string
  payload: string
}
