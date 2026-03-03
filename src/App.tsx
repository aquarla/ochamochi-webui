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

export function App() {
  const auth = useAuth()
  const [columns, setColumns] = useState<ColumnConfig[]>([])

  useEffect(() => {
    if (auth.isAuthenticated) {
      setColumns(loadColumns())
    }
  }, [auth.isAuthenticated])

  const handleColumnsChange = (updated: ColumnConfig[]) => {
    saveColumns(updated)
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
