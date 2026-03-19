import { useEffect, useRef, useState } from 'react'
import { loadApp, exchangeCodeForToken } from '../services/auth'
import type { AuthContext } from '../hooks/useAuth'

interface OAuthCallbackProps {
  auth: AuthContext
}

export function OAuthCallback({ auth }: OAuthCallbackProps) {
  const [error, setError] = useState<string | null>(null)
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      setError(`認可が拒否されました: ${errorParam}`)
      return
    }

    if (!code) {
      setError('認可コードが見つかりません')
      return
    }

    const stored = loadApp()
    if (!stored) {
      setError('アプリ情報が見つかりません。最初からやり直してください。')
      return
    }

    const isAddingAccount = sessionStorage.getItem('mastodon_adding_account') === '1'

    exchangeCodeForToken(stored.instanceUrl, stored.clientId, stored.clientSecret, code)
      .then((accessToken) => {
        sessionStorage.removeItem('mastodon_adding_account')
        if (isAddingAccount) {
          return auth.addAccount({ instanceUrl: stored.instanceUrl, accessToken })
        }
        return auth.login({ instanceUrl: stored.instanceUrl, accessToken })
      })
      .then(() => {
        window.history.replaceState({}, '', '/')
      })
      .catch((e: unknown) => {
        sessionStorage.removeItem('mastodon_adding_account')
        setError(e instanceof Error ? e.message : 'トークンの取得に失敗しました')
      })
  }, [auth])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-xl p-8 max-w-md w-full text-center">
          <p className="font-medium mb-4">エラーが発生しました</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="mt-6 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            最初に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-gray-300 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p>認証中...</p>
      </div>
    </div>
  )
}
