import { useState, useEffect } from 'react'
import { loadWordFilters, saveWordFilters, addWordFilter, removeWordFilter } from '../store/wordFilters'
import type { WordFilter } from '../types'

export function useWordFilters(accountKey?: string) {
  const [filters, setFilters] = useState<WordFilter[]>(() => loadWordFilters(accountKey))

  useEffect(() => {
    setFilters(loadWordFilters(accountKey))
    const handler = () => setFilters(loadWordFilters(accountKey))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [accountKey])

  const addFilter = (pattern: string, isRegex: boolean, expiresAt?: string) => {
    const next = addWordFilter(filters, pattern, isRegex, expiresAt)
    saveWordFilters(next, accountKey)
    setFilters(next)
  }

  const removeFilter = (id: string) => {
    const next = removeWordFilter(filters, id)
    saveWordFilters(next, accountKey)
    setFilters(next)
  }

  return { filters, addFilter, removeFilter }
}
