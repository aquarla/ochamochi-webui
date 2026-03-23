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
  bot: boolean
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
  card?: PreviewCard | null
  poll?: Poll | null
  quote?: { state: string; quoted_status: Status | null } | null
}

export interface PollOption {
  title: string
  votes_count: number | null
}

export interface Poll {
  id: string
  expires_at: string | null
  expired: boolean
  multiple: boolean
  votes_count: number
  voters_count: number | null
  voted: boolean | null
  own_votes: number[] | null
  options: PollOption[]
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

export interface PreviewCard {
  url: string
  title: string
  description: string
  type: 'link' | 'photo' | 'video' | 'rich'
  image: string | null
  provider_name: string
  provider_url: string
  author_name: string
  width: number
  height: number
}

export interface MastodonList {
  id: string
  title: string
}

export interface Tag {
  name: string
  url: string
  history?: Array<{ day: string; uses: string; accounts: string }>
}

export type ColumnType = 'home' | 'local' | 'public' | 'tag' | 'list' | 'notifications' | 'favourites' | 'bookmarks' | 'scheduled' | 'search' | 'conversations'

export interface Conversation {
  id: string
  unread: boolean
  accounts: Account[]
  last_status: Status | null
}

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
  | 'admin.sign_up'
  | 'admin.report'

export interface AdminReport {
  id: string
  action_taken: boolean
  category: string
  comment: string
  target_account: Account
}

export interface MastodonNotification {
  id: string
  type: NotificationType
  created_at: string
  account: Account
  status?: Status
  report?: AdminReport
}

export interface ColumnConfig {
  id: string
  type: ColumnType
  tag?: string
  listId?: string
  listTitle?: string
  onlyMedia?: boolean
  tagAny?: string[]
  tagAll?: string[]
  tagNone?: string[]
  locked?: boolean
  searchType?: 'accounts' | 'statuses' | 'hashtags'
  searchQuery?: string
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
