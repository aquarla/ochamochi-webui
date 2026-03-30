import type { WordFilter } from '../types'

const STORAGE_KEY = 'mastodon_word_filters'

function storageKey(accountKey?: string): string {
  return accountKey ? `${STORAGE_KEY}_${accountKey}` : STORAGE_KEY
}

export function loadWordFilters(accountKey?: string): WordFilter[] {
  try {
    const raw = localStorage.getItem(storageKey(accountKey))
    if (!raw) return []
    return JSON.parse(raw) as WordFilter[]
  } catch {
    return []
  }
}

export function saveWordFilters(filters: WordFilter[], accountKey?: string): void {
  localStorage.setItem(storageKey(accountKey), JSON.stringify(filters))
}

export function addWordFilter(
  filters: WordFilter[],
  pattern: string,
  isRegex: boolean,
  expiresAt?: string,
): WordFilter[] {
  const f: WordFilter = {
    id: Math.random().toString(36).slice(2, 10),
    pattern,
    isRegex,
    expiresAt,
    createdAt: new Date().toISOString(),
  }
  return [...filters, f]
}

export function removeWordFilter(filters: WordFilter[], id: string): WordFilter[] {
  return filters.filter((f) => f.id !== id)
}
