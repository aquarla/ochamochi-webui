import { useState } from 'react'
import { registerApp, buildAuthUrl, saveApp } from '../services/auth'

export function LoginPage() {
  const [domain, setDomain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const normalizedUrl = `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()}`

    try {
      const app = await registerApp(normalizedUrl)
      saveApp({
        instanceUrl: normalizedUrl,
        clientId: app.client_id,
        clientSecret: app.client_secret,
      })
      const authUrl = buildAuthUrl(normalizedUrl, app.client_id)
      window.location.href = authUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Mastodon Multi-Column</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          インスタンスのドメインを入力してログインしてください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="instance" className="block text-sm font-medium text-gray-300 mb-1">
              インスタンスのドメイン
            </label>
            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <span className="text-gray-400 pl-4 pr-1 select-none">https://</span>
              <input
                id="instance"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="mastodon.social"
                className="flex-1 bg-transparent text-white placeholder-gray-500 px-2 py-2.5 focus:outline-none"
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {loading ? '接続中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
