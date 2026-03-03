import type { ColumnConfig, ColumnType } from '../types'

const STORAGE_KEY = 'mastodon_columns'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: generateId(), type: 'home' },
  { id: generateId(), type: 'local' },
  { id: generateId(), type: 'public' },
]

export function loadColumns(): ColumnConfig[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_COLUMNS
  try {
    const parsed = JSON.parse(raw) as ColumnConfig[]
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return DEFAULT_COLUMNS
  } catch {
    return DEFAULT_COLUMNS
  }
}

export function saveColumns(columns: ColumnConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
}

export function addColumn(columns: ColumnConfig[], type: ColumnType, tag?: string): ColumnConfig[] {
  const newColumn: ColumnConfig = { id: generateId(), type, tag }
  const updated = [...columns, newColumn]
  saveColumns(updated)
  return updated
}

export function removeColumn(columns: ColumnConfig[], id: string): ColumnConfig[] {
  const updated = columns.filter((c) => c.id !== id)
  saveColumns(updated)
  return updated
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
  }
}
