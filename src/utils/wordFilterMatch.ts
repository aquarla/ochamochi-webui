import type { Status, WordFilter } from '../types'

function stripHtml(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

function matchesFilter(text: string, filter: WordFilter): boolean {
  if (filter.expiresAt && new Date(filter.expiresAt) < new Date()) return false
  if (filter.isRegex) {
    try {
      return new RegExp(filter.pattern, 'i').test(text)
    } catch {
      return false
    }
  }
  return text.toLowerCase().includes(filter.pattern.toLowerCase())
}

export function isFiltered(status: Status, filters: WordFilter[]): boolean {
  if (filters.length === 0) return false
  const target = status.reblog ?? status
  const text = [stripHtml(target.content), target.spoiler_text].join(' ')
  return filters.some((f) => matchesFilter(text, f))
}
