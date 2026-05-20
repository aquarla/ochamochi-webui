import {
  ACCOUNTS_STORAGE_KEY,
  ACTIVE_ACCOUNT_STORAGE_KEY,
  APP_STORAGE_KEY,
} from '../services/auth'

interface ExportData {
  version: 1
  exportedAt: string
  accounts: unknown
  activeAccount: string | null
  app: unknown
  perAccount: Record<string, {
    columns?: unknown
    settings?: unknown
    theme?: string
    wordFilters?: unknown
    notestockToken?: string
  }>
  defaultSettings?: unknown
  defaultTheme?: string
  defaultWordFilters?: unknown
  defaultNotestockToken?: string
}

function tryParseJson(raw: string | null): unknown {
  if (raw === null) return undefined
  try { return JSON.parse(raw) } catch { return raw }
}

export function exportData(): void {
  const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
  const accountsObj = accountsRaw ? (JSON.parse(accountsRaw) as Record<string, unknown>) : {}

  const perAccount: ExportData['perAccount'] = {}
  for (const accountKey of Object.keys(accountsObj)) {
    const entry: ExportData['perAccount'][string] = {}
    const cols = localStorage.getItem(`mastodon_columns_${accountKey}`)
    const sets = localStorage.getItem(`mastodon_settings_${accountKey}`)
    const theme = localStorage.getItem(`mastodon_theme_${accountKey}`)
    const filters = localStorage.getItem(`mastodon_word_filters_${accountKey}`)
    const notestock = localStorage.getItem(`mastodon_notestock_token_${accountKey}`)
    if (cols) entry.columns = JSON.parse(cols)
    if (sets) entry.settings = JSON.parse(sets)
    if (theme) entry.theme = theme
    if (filters) entry.wordFilters = JSON.parse(filters)
    if (notestock) entry.notestockToken = notestock
    perAccount[accountKey] = entry
  }

  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts: accountsObj,
    activeAccount: localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY),
    app: tryParseJson(localStorage.getItem(APP_STORAGE_KEY)),
    perAccount,
  }

  const defaultSettings = localStorage.getItem('mastodon_settings_default')
  const defaultTheme = localStorage.getItem('mastodon_theme_default')
  const defaultFilters = localStorage.getItem('mastodon_word_filters')
  const defaultNotestock = localStorage.getItem('mastodon_notestock_token')
  if (defaultSettings) data.defaultSettings = JSON.parse(defaultSettings)
  if (defaultTheme) data.defaultTheme = defaultTheme
  if (defaultFilters) data.defaultWordFilters = JSON.parse(defaultFilters)
  if (defaultNotestock) data.defaultNotestockToken = defaultNotestock

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ochamochi-settings-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importData(json: string): void {
  const data = JSON.parse(json) as ExportData
  if (data.version !== 1) throw new Error(`Unsupported version: ${String(data.version)}`)

  if (data.accounts) {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(data.accounts))
  }
  if (data.activeAccount) {
    localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, data.activeAccount)
  }
  if (data.app) {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data.app))
  }

  for (const [accountKey, perData] of Object.entries(data.perAccount ?? {})) {
    if (perData.columns) localStorage.setItem(`mastodon_columns_${accountKey}`, JSON.stringify(perData.columns))
    if (perData.settings) localStorage.setItem(`mastodon_settings_${accountKey}`, JSON.stringify(perData.settings))
    if (perData.theme) localStorage.setItem(`mastodon_theme_${accountKey}`, perData.theme)
    if (perData.wordFilters) localStorage.setItem(`mastodon_word_filters_${accountKey}`, JSON.stringify(perData.wordFilters))
    if (perData.notestockToken) localStorage.setItem(`mastodon_notestock_token_${accountKey}`, perData.notestockToken)
  }

  if (data.defaultSettings) localStorage.setItem('mastodon_settings_default', JSON.stringify(data.defaultSettings))
  if (data.defaultTheme) localStorage.setItem('mastodon_theme_default', data.defaultTheme)
  if (data.defaultWordFilters) localStorage.setItem('mastodon_word_filters', JSON.stringify(data.defaultWordFilters))
  if (data.defaultNotestockToken) localStorage.setItem('mastodon_notestock_token', data.defaultNotestockToken)
}
