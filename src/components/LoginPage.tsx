import { useState } from 'react'
import { registerApp, buildAuthUrl, saveApp } from '../services/auth'

export function LoginPage() {
  const [instanceUrl, setInstanceUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const normalizedUrl = instanceUrl.replace(/\/$/, '').trim()
    if (!normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('http://')) {
      setError('インスタンスURLはhttps://で始まる必要があります')
      setLoading(false)
      return
    }

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
          インスタンスURLを入力してログインしてください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="instance" className="block text-sm font-medium text-gray-300 mb-1">
              インスタンスURL
            </label>
            <input
              id="instance"
              type="url"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder="https://mastodon.social"
              className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
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
