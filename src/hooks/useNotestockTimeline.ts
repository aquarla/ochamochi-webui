import { useState, useEffect, useCallback, useRef } from 'react'
import { searchNotestock } from '../services/notestock'
import type { Status } from '../types'

export function useNotestockTimeline(query: string, acct?: string, apitoken?: string, initialMaxDt?: string, includePrivate?: boolean) {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const maxDtRef = useRef<string | undefined>(undefined)
  const loadingRef = useRef(false)

  const load = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const { statuses: newStatuses, nextMaxDt } = await searchNotestock({
        q: query || undefined,
        acct: acct || undefined,
        apitoken: apitoken || undefined,
        includePrivate,
        max_dt: reset ? initialMaxDt : maxDtRef.current,
      })
      if (reset) {
        setStatuses(newStatuses)
      } else {
        setStatuses((prev) => {
          const ids = new Set(prev.map((s) => s.id))
          return [...prev, ...newStatuses.filter((s) => !ids.has(s.id))]
        })
      }
      maxDtRef.current = nextMaxDt
      setHasMore(newStatuses.length > 0 && !!nextMaxDt)
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得に失敗しました')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [query, acct, apitoken, initialMaxDt, includePrivate])

  useEffect(() => {
    maxDtRef.current = undefined
    setStatuses([])
    setHasMore(true)
    setError(null)
    load(true)
  }, [query, acct, apitoken, initialMaxDt, includePrivate]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return
    load(false)
  }, [hasMore, load])

  const updateStatus = useCallback((updated: Status) => {
    setStatuses((prev) => prev.map((s) => s.id === updated.id ? updated : s))
  }, [])

  return { statuses, loading, error, hasMore, loadMore, updateStatus }
}
