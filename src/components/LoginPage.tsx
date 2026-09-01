import { useState, useRef } from 'react'
import { registerApp, buildAuthUrl, saveApp } from '../services/auth'
import { importData } from '../store/dataPortability'

export function LoginPage() {
  const [domain, setDomain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [importState, setImportState] = useState<'idle' | 'confirm' | 'error'>('idle')
  const [importError, setImportError] = useState('')
  const [pendingJson, setPendingJson] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        JSON.parse(text)
        setPendingJson(text)
        setImportState('confirm')
        setImportError('')
      } catch {
        setImportState('error')
        setImportError('ファイルの形式が正しくありません')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportConfirm = () => {
    try {
      importData(pendingJson)
      window.location.reload()
    } catch (err) {
      setImportState('error')
      setImportError(err instanceof Error ? err.message : 'インポートに失敗しました')
    }
  }

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
      window.location.replace(authUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Ochamochi Web for Mastodon</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          サーバーのドメインを入力してログインしてください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="instance" className="block text-sm font-medium text-gray-300 mb-1">
              サーバーのドメイン
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

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-xs text-center mb-3">別の端末・ドメインからデータを移行する場合</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          {importState === 'idle' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              バックアップからインポート
            </button>
          )}

          {importState === 'confirm' && (
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 space-y-3">
              <p className="text-yellow-300 text-sm">バックアップファイルをインポートします。続行しますか？</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setImportState('idle'); setPendingJson('') }}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleImportConfirm}
                  className="flex-1 px-3 py-1.5 text-sm text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                >
                  インポートする
                </button>
              </div>
            </div>
          )}

          {importState === 'error' && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 space-y-2">
              <p className="text-red-300 text-sm">{importError}</p>
              <button
                type="button"
                onClick={() => setImportState('idle')}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
