import type { ColumnConfig, ColumnType } from '../types'

function storageKey(accountKey: string): string {
  return `mastodon_columns_${accountKey}`
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function defaultColumns(): ColumnConfig[] {
  return [
    { id: generateId(), type: 'home' },
    { id: generateId(), type: 'local' },
    { id: generateId(), type: 'public' },
    { id: generateId(), type: 'notifications' },
  ]
}

export function loadColumns(accountKey: string): ColumnConfig[] {
  const raw = localStorage.getItem(storageKey(accountKey))
  if (!raw) return defaultColumns()
  try {
    const parsed = JSON.parse(raw) as ColumnConfig[]
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return defaultColumns()
  } catch {
    return defaultColumns()
  }
}

export function saveColumns(columns: ColumnConfig[], accountKey: string): void {
  localStorage.setItem(storageKey(accountKey), JSON.stringify(columns))
}

export function addColumn(columns: ColumnConfig[], type: ColumnType, tag?: string, listId?: string, listTitle?: string): ColumnConfig[] {
  return [...columns, { id: generateId(), type, tag, listId, listTitle }]
}

export function removeColumn(columns: ColumnConfig[], id: string): ColumnConfig[] {
  return columns.filter((c) => c.id !== id)
}

export function getColumnLabel(col: ColumnConfig): string {
  switch (col.type) {
    case 'home':
      return 'ホーム'
    case 'local':
      return 'ローカル'
    case 'public':
      return '連合'
    case 'tag':
      return `#${col.tag ?? ''}`
    case 'notifications':
      return '通知'
    case 'favourites':
      return 'お気に入り'
    case 'bookmarks':
      return 'ブックマーク'
    case 'list':
      return col.listTitle ?? 'リスト'
    case 'scheduled':
      return '予約投稿'
  }
}
