import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { loadColumns, saveColumns } from './store/columns'
import { LoginPage } from './components/LoginPage'
import { OAuthCallback } from './components/OAuthCallback'
import { Layout } from './components/Layout'
import type { ColumnConfig } from './types'

function isOAuthCallback(): boolean {
  return window.location.pathname === '/oauth/callback' && window.location.search.includes('code=')
}

function accountKey(instanceUrl: string, accountId: string): string {
  const host = new URL(instanceUrl).hostname
  return `${host}_${accountId}`
}

export function App() {
  const auth = useAuth()
  const [columns, setColumns] = useState<ColumnConfig[]>([])

  useEffect(() => {
    if (auth.account && auth.instanceUrl) {
      setColumns(loadColumns(accountKey(auth.instanceUrl, auth.account.id)))
    }
  }, [auth.account, auth.instanceUrl])

  const handleColumnsChange = (updated: ColumnConfig[]) => {
    if (auth.account && auth.instanceUrl) {
      saveColumns(updated, accountKey(auth.instanceUrl, auth.account.id))
    }
    setColumns(updated)
  }

  if (isOAuthCallback()) {
    return <OAuthCallback auth={auth} />
  }

  if (!auth.isAuthenticated) {
    return <LoginPage />
  }

  return (
    <Layout
      auth={auth}
      columns={columns}
      onColumnsChange={handleColumnsChange}
    />
  )
}
