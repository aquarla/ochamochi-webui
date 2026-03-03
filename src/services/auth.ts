import type { Application } from '../types'

const APP_NAME = 'Ochamochi Web'
const SCOPES = 'read write follow'
const REDIRECT_URI = `${window.location.origin}/oauth/callback`

export async function registerApp(instanceUrl: string): Promise<Application> {
  const res = await fetch(`${instanceUrl}/api/v1/apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: APP_NAME,
      redirect_uris: REDIRECT_URI,
      scopes: SCOPES,
      website: 'https://iwatedon.net/',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`App registration failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<Application>
}

export function buildAuthUrl(instanceUrl: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
  })
  return `${instanceUrl}/oauth/authorize?${params}`
}

export async function exchangeCodeForToken(
  instanceUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<string> {
  const res = await fetch(`${instanceUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

export const AUTH_STORAGE_KEY = 'mastodon_auth'
export const APP_STORAGE_KEY = 'mastodon_app'

export interface StoredAuth {
  instanceUrl: string
  accessToken: string
}

export interface StoredApp {
  instanceUrl: string
  clientId: string
  clientSecret: string
}

export function saveAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function loadAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(APP_STORAGE_KEY)
}

export function saveApp(app: StoredApp): void {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(app))
}

export function loadApp(): StoredApp | null {
  const raw = localStorage.getItem(APP_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredApp
  } catch {
    return null
  }
}
