export type FontSize = 'small' | 'medium' | 'large'
export type ColumnWidth = 'narrow' | 'medium' | 'wide'
export type EmojiStyle = 'default' | 'twemoji' | 'blobmoji'
export type DefaultVisibilityMode = 'lastUsed' | 'public' | 'unlisted' | 'private' | 'direct'

export interface AppSettings {
  defaultVisibilityMode: DefaultVisibilityMode
  confirmFavourite: boolean
  confirmBoost: boolean
  notifyMention: boolean
  notifyStatus: boolean
  notifyFollow: boolean
  notifyReblog: boolean
  notifyFavourite: boolean
  desktopNotification: boolean
  fontSize: FontSize
  columnWidth: ColumnWidth
  allowCrossAccountAction: boolean
  backgroundNotification: boolean
  showPreviewCard: boolean
  truncateUrl: boolean
  showQuote: boolean
  emojiStyle: EmojiStyle
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultVisibilityMode: 'public',
  confirmFavourite: false,
  confirmBoost: false,
  notifyMention: true,
  notifyStatus: true,
  notifyFollow: true,
  notifyReblog: true,
  notifyFavourite: true,
  desktopNotification: false,
  fontSize: 'medium',
  columnWidth: 'medium',
  allowCrossAccountAction: true,
  backgroundNotification: false,
  showPreviewCard: true,
  truncateUrl: true,
  showQuote: false,
  emojiStyle: 'default',
}

function storageKey(accountKey?: string | null) {
  return accountKey ? `mastodon_settings_${accountKey}` : 'mastodon_settings_default'
}

export function loadSettings(accountKey?: string | null): AppSettings {
  try {
    const raw = localStorage.getItem(storageKey(accountKey))
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings, accountKey?: string | null): void {
  localStorage.setItem(storageKey(accountKey), JSON.stringify(settings))
}
