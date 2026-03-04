import { useState } from 'react'
import { registerApp, buildAuthUrl, saveApp } from '../services/auth'

interface AddAccountModalProps {
  onClose: () => void
}

export function AddAccountModal({ onClose }: AddAccountModalProps) {
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
      sessionStorage.setItem('mastodon_adding_account', '1')
      const authUrl = buildAuthUrl(normalizedUrl, app.client_id)
      window.location.href = authUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">アカウントを追加</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          追加するインスタンスのドメインを入力してください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-instance" className="block text-sm font-medium text-gray-300 mb-1">
              インスタンスのドメイン
            </label>
            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <span className="text-gray-400 pl-4 pr-1 select-none">https://</span>
              <input
                id="add-instance"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="mastodon.social"
                className="flex-1 bg-transparent text-white placeholder-gray-500 px-2 py-2.5 focus:outline-none"
                required
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? '接続中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
