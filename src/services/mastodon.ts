import type { Status, Account, MastodonNotification, StatusContext, CustomEmoji, MediaAttachment, ScheduledStatus, Relationship, MastodonList } from '../types'

export class MastodonClient {
  constructor(
    private instanceUrl: string,
    private accessToken: string,
  ) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.instanceUrl}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} ${res.statusText}: ${text}`)
    }
    return res.json() as Promise<T>
  }

  async getHomeTimeline(params: { max_id?: string; limit?: number } = {}): Promise<Status[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    return this.request<Status[]>(`/api/v1/timelines/home?${qs}`)
  }

  async getLocalTimeline(params: { max_id?: string; limit?: number; only_media?: boolean } = {}): Promise<Status[]> {
    const qs = new URLSearchParams({ local: 'true' })
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.only_media) qs.set('only_media', 'true')
    return this.request<Status[]>(`/api/v1/timelines/public?${qs}`)
  }

  async getPublicTimeline(params: { max_id?: string; limit?: number; only_media?: boolean } = {}): Promise<Status[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.only_media) qs.set('only_media', 'true')
    return this.request<Status[]>(`/api/v1/timelines/public?${qs}`)
  }

  async getTagTimeline(
    tag: string,
    params: { max_id?: string; limit?: number; only_media?: boolean; any?: string[]; all?: string[]; none?: string[] } = {},
  ): Promise<Status[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.only_media) qs.set('only_media', 'true')
    params.any?.forEach((t) => qs.append('any[]', t))
    params.all?.forEach((t) => qs.append('all[]', t))
    params.none?.forEach((t) => qs.append('none[]', t))
    return this.request<Status[]>(`/api/v1/timelines/tag/${encodeURIComponent(tag)}?${qs}`)
  }

  async getNotifications(params: { max_id?: string; limit?: number } = {}): Promise<MastodonNotification[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    return this.request<MastodonNotification[]>(`/api/v1/notifications?${qs}`)
  }

  async getAccount(): Promise<Account> {
    return this.request<Account>('/api/v1/accounts/verify_credentials')
  }

  async postStatus(params: {
    status: string
    visibility?: 'public' | 'unlisted' | 'private' | 'direct'
    in_reply_to_id?: string
    sensitive?: boolean
    spoiler_text?: string
    media_ids?: string[]
    scheduled_at?: string
  }): Promise<Status> {
    return this.request<Status>('/api/v1/statuses', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  async uploadMedia(file: File): Promise<MediaAttachment> {
    const form = new FormData()
    form.append('file', file)
    const url = `${this.instanceUrl}/api/v2/media`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} ${res.statusText}: ${text}`)
    }
    return res.json() as Promise<MediaAttachment>
  }

  async reblogStatus(id: string): Promise<Status> {
    return this.request<Status>(`/api/v1/statuses/${id}/reblog`, { method: 'POST' })
  }

  async unreblogStatus(id: string): Promise<Status> {
    return this.request<Status>(`/api/v1/statuses/${id}/unreblog`, { method: 'POST' })
  }

  async favouriteStatus(id: string): Promise<Status> {
    return this.request<Status>(`/api/v1/statuses/${id}/favourite`, { method: 'POST' })
  }

  async unfavouriteStatus(id: string): Promise<Status> {
    return this.request<Status>(`/api/v1/statuses/${id}/unfavourite`, { method: 'POST' })
  }

  async getStatusContext(id: string): Promise<StatusContext> {
    return this.request<StatusContext>(`/api/v1/statuses/${id}/context`)
  }

  async getAccountById(id: string): Promise<Account> {
    return this.request<Account>(`/api/v1/accounts/${id}`)
  }

  async getRelationship(id: string): Promise<Relationship> {
    const result = await this.request<Relationship[]>(`/api/v1/accounts/relationships?id[]=${encodeURIComponent(id)}`)
    return result[0]
  }

  async getRelationships(ids: string[]): Promise<Relationship[]> {
    if (ids.length === 0) return []
    const qs = ids.map((id) => `id[]=${encodeURIComponent(id)}`).join('&')
    return this.request<Relationship[]>(`/api/v1/accounts/relationships?${qs}`)
  }

  async getFollowers(id: string, params: { max_id?: string; limit?: number } = {}): Promise<Account[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    return this.request<Account[]>(`/api/v1/accounts/${id}/followers?${qs}`)
  }

  async getFollowing(id: string, params: { max_id?: string; limit?: number } = {}): Promise<Account[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    return this.request<Account[]>(`/api/v1/accounts/${id}/following?${qs}`)
  }

  async followAccount(id: string): Promise<Relationship> {
    return this.request<Relationship>(`/api/v1/accounts/${id}/follow`, { method: 'POST' })
  }

  async unfollowAccount(id: string): Promise<Relationship> {
    return this.request<Relationship>(`/api/v1/accounts/${id}/unfollow`, { method: 'POST' })
  }

  async muteAccount(id: string, params: { duration?: number; notifications?: boolean } = {}): Promise<Relationship> {
    return this.request<Relationship>(`/api/v1/accounts/${id}/mute`, {
      method: 'POST',
      body: JSON.stringify({
        duration: params.duration ?? 0,
        notifications: params.notifications ?? true,
      }),
    })
  }

  async unmuteAccount(id: string): Promise<Relationship> {
    return this.request<Relationship>(`/api/v1/accounts/${id}/unmute`, { method: 'POST' })
  }

  async blockAccount(id: string): Promise<Relationship> {
    return this.request<Relationship>(`/api/v1/accounts/${id}/block`, { method: 'POST' })
  }

  async unblockAccount(id: string): Promise<Relationship> {
    return this.request<Relationship>(`/api/v1/accounts/${id}/unblock`, { method: 'POST' })
  }

  async bookmarkStatus(id: string): Promise<Status> {
    return this.request<Status>(`/api/v1/statuses/${id}/bookmark`, { method: 'POST' })
  }

  async unbookmarkStatus(id: string): Promise<Status> {
    return this.request<Status>(`/api/v1/statuses/${id}/unbookmark`, { method: 'POST' })
  }

  async deleteStatus(id: string): Promise<void> {
    await this.request<unknown>(`/api/v1/statuses/${id}`, { method: 'DELETE' })
  }

  async searchResolveStatus(url: string): Promise<Status> {
    const qs = new URLSearchParams({ q: url, resolve: 'true', limit: '1' })
    const result = await this.request<{ statuses: Status[] }>(`/api/v2/search?${qs}`)
    const status = result.statuses[0]
    if (!status) throw new Error('投稿が見つかりませんでした')
    return status
  }

  async getCustomEmojis(): Promise<CustomEmoji[]> {
    return this.request<CustomEmoji[]>('/api/v1/custom_emojis')
  }

  async getBookmarks(params: { max_id?: string; limit?: number } = {}): Promise<Status[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    return this.request<Status[]>(`/api/v1/bookmarks?${qs}`)
  }

  async getFavourites(params: { max_id?: string; limit?: number } = {}): Promise<Status[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    return this.request<Status[]>(`/api/v1/favourites?${qs}`)
  }

  async getLists(): Promise<MastodonList[]> {
    return this.request<MastodonList[]>('/api/v1/lists')
  }

  async getListTimeline(listId: string, params: { max_id?: string; limit?: number } = {}): Promise<Status[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    return this.request<Status[]>(`/api/v1/timelines/list/${encodeURIComponent(listId)}?${qs}`)
  }

  async getScheduledStatuses(): Promise<ScheduledStatus[]> {
    return this.request<ScheduledStatus[]>('/api/v1/scheduled_statuses')
  }

  async cancelScheduledStatus(id: string): Promise<void> {
    await this.request<unknown>(`/api/v1/scheduled_statuses/${id}`, { method: 'DELETE' })
  }

  async getAccountStatuses(
    id: string,
    params: { max_id?: string; limit?: number; pinned?: boolean; exclude_replies?: boolean } = {},
  ): Promise<Status[]> {
    const qs = new URLSearchParams()
    if (params.max_id) qs.set('max_id', params.max_id)
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.pinned) qs.set('pinned', 'true')
    if (params.exclude_replies !== undefined) qs.set('exclude_replies', String(params.exclude_replies))
    return this.request<Status[]>(`/api/v1/accounts/${id}/statuses?${qs}`)
  }
}
