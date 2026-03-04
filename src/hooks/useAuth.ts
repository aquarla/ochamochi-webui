import { useState, useEffect, useCallback } from 'react'
import {
  loadAllAccounts,
  saveAllAccounts,
  loadActiveAccountKey,
  saveActiveAccountKey,
  removeAccountFromStorage,
  type StoredAccountEntry,
  LEGACY_AUTH_STORAGE_KEY,
} from '../services/auth'
import { MastodonClient } from '../services/mastodon'
import type { Account } from '../types'

export interface AuthContext {
  isAuthenticated: boolean
  instanceUrl: string | null
  accessToken: string | null
  account: Account | null
  accounts: StoredAccountEntry[]
  activeAccountKey: string | null
  login: (auth: { instanceUrl: string; accessToken: string }) => Promise<void>
  logout: () => void
  addAccount: (auth: { instanceUrl: string; accessToken: string }) => Promise<void>
  switchAccount: (accountKey: string) => void
  removeAccount: (accountKey: string) => void
}

export function useAuth(): AuthContext {
  const [allAccounts, setAllAccounts] = useState<Record<string, StoredAccountEntry>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const active = activeKey ? (allAccounts[activeKey] ?? null) : null

  const addAccount = useCallback(
    async ({ instanceUrl, accessToken }: { instanceUrl: string; accessToken: string }) => {
      const client = new MastodonClient(instanceUrl, accessToken)
      const account = await client.getAccount()
      const hostname = new URL(instanceUrl).hostname
      const accountKey = `${hostname}_${account.id}`
      const entry: StoredAccountEntry = { accountKey, instanceUrl, accessToken, account }
      setAllAccounts((prev) => {
        const next = { ...prev, [accountKey]: entry }
        saveAllAccounts(next)
        return next
      })
      saveActiveAccountKey(accountKey)
      setActiveKey(accountKey)
    },
    [],
  )

  useEffect(() => {
    const legacyRaw = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)
    const existingAccounts = loadAllAccounts()

    if (legacyRaw && Object.keys(existingAccounts).length === 0) {
      try {
        const legacy = JSON.parse(legacyRaw) as { instanceUrl: string; accessToken: string }
        addAccount(legacy)
          .then(() => localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY))
          .catch(() => {
            // migration failed, keep legacy data
          })
        return
      } catch {
        localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
      }
    }

    setAllAccounts(existingAccounts)
    const key = loadActiveAccountKey()
    if (key && existingAccounts[key]) {
      setActiveKey(key)
    } else {
      const firstKey = Object.keys(existingAccounts)[0] ?? null
      if (firstKey) {
        setActiveKey(firstKey)
        saveActiveAccountKey(firstKey)
      }
    }
  }, [addAccount])

  const switchAccount = useCallback((accountKey: string) => {
    saveActiveAccountKey(accountKey)
    setActiveKey(accountKey)
  }, [])

  const removeAccount = useCallback((accountKey: string) => {
    removeAccountFromStorage(accountKey)
    const newActiveKey = loadActiveAccountKey()
    setAllAccounts((prev) => {
      const next = { ...prev }
      delete next[accountKey]
      return next
    })
    setActiveKey((prev) => (prev === accountKey ? newActiveKey : prev))
  }, [])

  const login = useCallback(
    (auth: { instanceUrl: string; accessToken: string }) => addAccount(auth),
    [addAccount],
  )

  const logout = useCallback(() => {
    if (activeKey) removeAccount(activeKey)
  }, [activeKey, removeAccount])

  return {
    isAuthenticated: !!active,
    instanceUrl: active?.instanceUrl ?? null,
    accessToken: active?.accessToken ?? null,
    account: active?.account ?? null,
    accounts: Object.values(allAccounts),
    activeAccountKey: activeKey,
    login,
    logout,
    addAccount,
    switchAccount,
    removeAccount,
  }
}
