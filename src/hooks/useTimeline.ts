import { useState, useEffect, useCallback, useRef } from 'react'
import { MastodonClient } from '../services/mastodon'
import type { Status, ColumnType } from '../types'

const PAGE_LIMIT = 20

type TagFilters = { any?: string[]; all?: string[]; none?: string[] }

async function fetchTimeline(
  client: MastodonClient,
  type: ColumnType,
  tag: string | undefined,
  params: { max_id?: string; limit?: number; only_media?: boolean },
  tagFilters?: TagFilters,
  listId?: string,
): Promise<Status[]> {
  switch (type) {
    case 'home':
      return client.getHomeTimeline(params)
    case 'local':
      return client.getLocalTimeline(params)
    case 'public':
      return client.getPublicTimeline(params)
    case 'tag':
      return client.getTagTimeline(tag ?? '', { ...params, ...tagFilters })
    case 'list':
      return client.getListTimeline(listId ?? '', params)
    case 'favourites':
      return client.getFavourites(params)
    case 'bookmarks':
      return client.getBookmarks(params)
    default:
      throw new Error(`useTimeline does not support column type: ${type as string}`)
  }
}

export function useTimeline(
  instanceUrl: string,
  accessToken: string,
  type: ColumnType,
  tag?: string,
  onlyMedia?: boolean,
  tagFilters?: TagFilters,
  listId?: string,
) {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const clientRef = useRef(new MastodonClient(instanceUrl, accessToken))

  useEffect(() => {
    clientRef.current = new MastodonClient(instanceUrl, accessToken)
  }, [instanceUrl, accessToken])

  // Serialize for stable dependency comparison (arrays can't be deps directly)
  const tagFiltersKey = JSON.stringify(tagFilters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: TagFilters | undefined = tagFiltersKey ? JSON.parse(tagFiltersKey) : undefined
      const items = await fetchTimeline(clientRef.current, type, tag, { limit: PAGE_LIMIT, only_media: onlyMedia }, filters, listId)
      setStatuses(items)
      setHasMore(items.length > 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, tag, onlyMedia, tagFiltersKey, listId])

  useEffect(() => {
    setStatuses([])
    setHasMore(true)
    load()
  }, [load])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || statuses.length === 0) return
    const lastId = statuses[statuses.length - 1].id
    setLoading(true)
    try {
      const filters: TagFilters | undefined = tagFiltersKey ? JSON.parse(tagFiltersKey) : undefined
      const items = await fetchTimeline(clientRef.current, type, tag, {
        max_id: lastId,
        limit: PAGE_LIMIT,
        only_media: onlyMedia,
      }, filters, listId)
      setStatuses((prev) => [...prev, ...items])
      setHasMore(items.length > 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, statuses, type, tag, onlyMedia, tagFiltersKey, listId])

  const prependStatus = useCallback((status: Status) => {
    setStatuses((prev) => {
      if (prev.some((s) => s.id === status.id)) return prev
      return [status, ...prev]
    })
  }, [])

  const removeStatus = useCallback((id: string) => {
    setStatuses((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const removeByAccountId = useCallback((accountId: string) => {
    setStatuses((prev) =>
      prev.filter((s) => s.account.id !== accountId && s.reblog?.account.id !== accountId)
    )
  }, [])

  const updateStatus = useCallback((updated: Status) => {
    setStatuses((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }, [])

  return { statuses, loading, error, hasMore, loadMore, prependStatus, removeStatus, removeByAccountId, updateStatus }
}
