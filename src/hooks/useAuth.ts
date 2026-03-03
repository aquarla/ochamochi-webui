import { useState, useEffect, useCallback } from 'react'
import { loadAuth, saveAuth, clearAuth, type StoredAuth } from '../services/auth'
import { MastodonClient } from '../services/mastodon'
import type { Account } from '../types'

export interface AuthContext {
  isAuthenticated: boolean
  instanceUrl: string | null
  accessToken: string | null
  account: Account | null
  login: (auth: StoredAuth) => Promise<void>
  logout: () => void
}

export function useAuth(): AuthContext {
  const [instanceUrl, setInstanceUrl] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [account, setAccount] = useState<Account | null>(null)

  const fetchAccount = useCallback(async (url: string, token: string) => {
    try {
      const client = new MastodonClient(url, token)
      const acct = await client.getAccount()
      setAccount(acct)
    } catch {
      // token may be invalid
      clearAuth()
      setInstanceUrl(null)
      setAccessToken(null)
      setAccount(null)
    }
  }, [])

  useEffect(() => {
    const stored = loadAuth()
    if (stored) {
      setInstanceUrl(stored.instanceUrl)
      setAccessToken(stored.accessToken)
      fetchAccount(stored.instanceUrl, stored.accessToken)
    }
  }, [fetchAccount])

  const login = useCallback(
    async (auth: StoredAuth) => {
      saveAuth(auth)
      setInstanceUrl(auth.instanceUrl)
      setAccessToken(auth.accessToken)
      await fetchAccount(auth.instanceUrl, auth.accessToken)
    },
    [fetchAccount],
  )

  const logout = useCallback(() => {
    clearAuth()
    setInstanceUrl(null)
    setAccessToken(null)
    setAccount(null)
  }, [])

  return {
    isAuthenticated: !!accessToken,
    instanceUrl,
    accessToken,
    account,
    login,
    logout,
  }
}
