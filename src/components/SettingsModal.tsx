import { useState, useCallback, useRef, useEffect } from 'react'
import { loadSettings, saveSettings } from '../hooks/useSettings'
import type { AppSettings, EmojiStyle, DefaultVisibilityMode } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../hooks/useTheme'
import { useWordFilters } from '../hooks/useWordFilters'
import type { WordFilter } from '../types'
import { loadNotestockToken, saveNotestockToken } from '../store/notestockToken'
import { fetchInstanceVersion } from '../services/mastodon'
import { exportData, importData } from '../store/dataPortability'

interface SettingsModalProps {
  onClose: () => void
  accountKey?: string
  instanceUrl?: string
  onSave?: (settings: AppSettings) => void
}

type GroupId = 'general' | 'display' | 'notifications' | 'privacy' | 'filters' | 'notestock' | 'data'

interface SettingsGroup {
  id: GroupId
  label: string
  icon: React.ReactNode
}

const groups: SettingsGroup[] = [
  {
    id: 'general',
    label: '一般',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'display',
    label: '表示',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    label: '通知',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: 'privacy',
    label: 'プライバシー',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'filters',
    label: 'フィルター',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
      </svg>
    ),
  },
  {
    id: 'notestock',
    label: 'notestock',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'data',
    label: 'データ',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    ),
  },
]

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-700 text-gray-200 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-700/60 last:border-0">
      <div className="min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-gray-400 text-xs mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 mt-6 first:mt-0">{children}</h3>
}

function GeneralSettings({
  settings,
  onChange,
  instanceUrl,
}: {
  settings: AppSettings
  onChange: (s: AppSettings) => void
  instanceUrl?: string
}) {
  const [serverVersion, setServerVersion] = useState<string | null>(null)

  useEffect(() => {
    if (!instanceUrl) return
    fetchInstanceVersion(instanceUrl).then(setServerVersion)
  }, [instanceUrl])

  return (
    <div>
      {instanceUrl && (
        <>
          <SectionTitle>Mastodon</SectionTitle>
          <SettingRow label="サーバーバージョン" description={instanceUrl}>
            <span className="text-gray-300 text-sm font-mono">
              {serverVersion ?? '…'}
            </span>
          </SettingRow>
          <SettingRow label="Mastodon設定画面" description="サーバーの設定ページを開きます">
            <a
              href={`${instanceUrl}/settings/preferences`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              開く
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </SettingRow>
        </>
      )}
      <SectionTitle>動作</SectionTitle>
      <SettingRow label="デフォルト公開範囲" description="新規投稿時に最初に選択される公開範囲">
        <SelectField
          value={settings.defaultVisibilityMode}
          onChange={(v) => onChange({ ...settings, defaultVisibilityMode: v as DefaultVisibilityMode })}
          options={[
            { value: 'lastUsed', label: '前回の投稿に従う' },
            { value: 'public', label: '公開' },
            { value: 'unlisted', label: '未収載' },
            { value: 'private', label: 'フォロワー限定' },
            { value: 'direct', label: 'ダイレクト' },
          ]}
        />
      </SettingRow>
      <SettingRow label="お気に入りの確認" description="お気に入り時に確認ダイアログを表示する">
        <ToggleSwitch
          checked={settings.confirmFavourite}
          onChange={(v) => onChange({ ...settings, confirmFavourite: v })}
        />
      </SettingRow>
      <SettingRow label="ブーストの確認" description="ブースト時に確認ダイアログを表示する">
        <ToggleSwitch
          checked={settings.confirmBoost}
          onChange={(v) => onChange({ ...settings, confirmBoost: v })}
        />
      </SettingRow>
    </div>
  )
}

function DisplaySettings({
  settings,
  onChange,
  accountKey,
}: {
  settings: AppSettings
  onChange: (s: AppSettings) => void
  accountKey?: string
}) {
  const { theme, setTheme } = useTheme(accountKey)
  return (
    <div>
      <SectionTitle>テーマ</SectionTitle>
      <SettingRow label="カラーテーマ" description="アプリ全体の配色テーマ">
        <SelectField
          value={theme}
          onChange={(v) => setTheme(v as Theme)}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'sepia', label: 'Sepia' },
            { value: 'solarized', label: 'Solarized Dark' },
            { value: 'nord', label: 'Nord' },
            { value: 'dracula', label: 'Dracula' },
            { value: 'horizon-bright', label: 'Horizon Bright' },
          ]}
        />
      </SettingRow>

      <SectionTitle>投稿</SectionTitle>
      <SettingRow label="OGPプレビューを表示" description="URLを含む投稿にリンクカードを表示する">
        <ToggleSwitch
          checked={settings.showPreviewCard}
          onChange={(v) => onChange({ ...settings, showPreviewCard: v })}
        />
      </SettingRow>
      <SettingRow label="長いURLを省略表示" description="一定の長さを超えるURLを…で短縮して表示する">
        <ToggleSwitch
          checked={settings.truncateUrl}
          onChange={(v) => onChange({ ...settings, truncateUrl: v })}
        />
      </SettingRow>
      <SettingRow label="引用投稿を表示" description="引用を含む投稿に引用元の内容をカード表示する">
        <ToggleSwitch
          checked={settings.showQuote}
          onChange={(v) => onChange({ ...settings, showQuote: v })}
        />
      </SettingRow>

      <SectionTitle>絵文字</SectionTitle>
      <SettingRow label="絵文字スタイル" description="Unicode絵文字の表示スタイル">
        <SelectField
          value={settings.emojiStyle}
          onChange={(v) => onChange({ ...settings, emojiStyle: v as EmojiStyle })}
          options={[
            { value: 'default', label: 'デフォルト' },
            { value: 'twemoji', label: 'Twemoji' },
            { value: 'blobmoji', label: 'Blobmoji' },
          ]}
        />
      </SettingRow>

      <SectionTitle>フォント・サイズ</SectionTitle>
      <SettingRow label="フォントサイズ" description="タイムライン上のテキストサイズ">
        <SelectField
          value={settings.fontSize}
          onChange={(v) => onChange({ ...settings, fontSize: v as import('../hooks/useSettings').FontSize })}
          options={[
            { value: 'small', label: '小' },
            { value: 'medium', label: '中' },
            { value: 'large', label: '大' },
          ]}
        />
      </SettingRow>
      <SettingRow label="カラム幅" description="各カラムのデフォルト幅">
        <SelectField
          value={settings.columnWidth}
          onChange={(v) => onChange({ ...settings, columnWidth: v as import('../hooks/useSettings').ColumnWidth })}
          options={[
            { value: 'narrow', label: '狭い' },
            { value: 'medium', label: '標準' },
            { value: 'wide', label: '広い' },
          ]}
        />
      </SettingRow>

    </div>
  )
}

function NotificationsSettings({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (s: AppSettings) => void
}) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  const handleDesktopToggle = useCallback(async (v: boolean) => {
    if (v && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission()
      setPermission(result)
    }
    onChange({ ...settings, desktopNotification: v })
  }, [settings, onChange])

  const desktopDescription = settings.desktopNotification && permission === 'denied'
    ? 'ブラウザの設定で通知を許可してください'
    : '通知カラムに新着があったときにデスクトップへ通知する'

  return (
    <div>
      <SectionTitle>デスクトップ通知</SectionTitle>
      <SettingRow label="デスクトップ通知" description={desktopDescription}>
        <ToggleSwitch checked={settings.desktopNotification} onChange={handleDesktopToggle} />
      </SettingRow>
      <SectionTitle>通知の種類</SectionTitle>
      <SettingRow label="メンション" description="自分宛ての返信・メンション">
        <ToggleSwitch checked={settings.notifyMention} onChange={(v) => onChange({ ...settings, notifyMention: v })} />
      </SettingRow>
      <SettingRow label="投稿通知" description="通知をオンにしたアカウントが投稿したとき">
        <ToggleSwitch checked={settings.notifyStatus} onChange={(v) => onChange({ ...settings, notifyStatus: v })} />
      </SettingRow>
      <SettingRow label="新しいフォロワー" description="フォローされたとき">
        <ToggleSwitch checked={settings.notifyFollow} onChange={(v) => onChange({ ...settings, notifyFollow: v })} />
      </SettingRow>
      <SettingRow label="ブースト" description="自分の投稿がブーストされたとき">
        <ToggleSwitch checked={settings.notifyReblog} onChange={(v) => onChange({ ...settings, notifyReblog: v })} />
      </SettingRow>
      <SettingRow label="お気に入り" description="自分の投稿がお気に入りされたとき">
        <ToggleSwitch checked={settings.notifyFavourite} onChange={(v) => onChange({ ...settings, notifyFavourite: v })} />
      </SettingRow>
    </div>
  )
}


const groupTitles: Record<GroupId, string> = {
  general: '一般',
  display: '表示',
  notifications: '通知',
  privacy: 'プライバシー',
  filters: 'フィルター',
  notestock: 'notestock',
  data: 'データ',
}

function FiltersSettings({ accountKey }: { accountKey?: string }) {
  const { filters, addFilter, removeFilter } = useWordFilters(accountKey)
  const [pattern, setPattern] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    if (!pattern.trim()) return
    if (isRegex) {
      try { new RegExp(pattern) } catch {
        setError('正規表現が正しくありません')
        return
      }
    }
    addFilter(pattern.trim(), isRegex, expiresAt || undefined)
    setPattern('')
    setIsRegex(false)
    setExpiresAt('')
    setError(null)
  }

  const formatExpiry = (iso?: string) => {
    if (!iso) return '無期限'
    const d = new Date(iso)
    if (d < new Date()) return '期限切れ'
    return d.toLocaleDateString('ja-JP')
  }

  return (
    <div>
      <SectionTitle>登録済みフィルター</SectionTitle>
      {filters.length === 0 ? (
        <p className="text-gray-500 text-xs py-2">フィルターが登録されていません</p>
      ) : (
        <div className="space-y-1 mb-4">
          {filters.map((f: WordFilter) => (
            <div key={f.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${f.isRegex ? 'bg-purple-700 text-purple-200' : 'bg-gray-600 text-gray-300'}`}>
                {f.isRegex ? '正規表現' : '文字列'}
              </span>
              <span className="text-white text-sm flex-1 min-w-0 truncate font-mono">{f.pattern}</span>
              <span className="text-gray-500 text-xs flex-shrink-0">{formatExpiry(f.expiresAt)}</span>
              <button
                type="button"
                onClick={() => removeFilter(f.id)}
                className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                title="削除"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>フィルターを追加</SectionTitle>
      <div className="space-y-2">
        <input
          type="text"
          value={pattern}
          onChange={(e) => { setPattern(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="フィルタリングするキーワードまたは正規表現"
          className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <ToggleSwitch checked={isRegex} onChange={setIsRegex} />
            <span className="text-gray-300 text-sm">正規表現モード</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-xs flex-shrink-0">有効期限（任意）</label>
          <input
            type="date"
            value={expiresAt}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {expiresAt && (
            <button type="button" onClick={() => setExpiresAt('')} className="text-gray-500 hover:text-gray-300 text-xs">
              クリア
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!pattern.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          追加
        </button>
      </div>
      <p className="text-gray-500 text-xs mt-3">投稿本文・CW警告文にマッチする投稿を非表示にします。ブーストの元投稿にも適用されます。</p>
    </div>
  )
}

function NotestockSettings({ accountKey }: { accountKey?: string }) {
  const [token, setToken] = useState(() => loadNotestockToken(accountKey))
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveNotestockToken(token, accountKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <SectionTitle>APIトークン</SectionTitle>
      <p className="text-gray-400 text-xs mb-3">
        notestockのAPIトークンを設定すると、非公開投稿を含む検索が利用できます。
        トークンはnotestockの設定ページから取得してください。
      </p>
      <div className="space-y-2">
        <input
          type="password"
          value={token}
          onChange={(e) => { setToken(e.target.value); setSaved(false) }}
          placeholder="APIトークンを入力"
          className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-1p-ignore
          autoComplete="off"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {saved ? '保存しました' : '保存'}
          </button>
          {token && (
            <button
              type="button"
              onClick={() => { setToken(''); saveNotestockToken('', accountKey); setSaved(false) }}
              className="text-gray-400 hover:text-red-400 text-sm transition-colors px-3 py-2"
            >
              削除
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-600 text-xs mt-3">トークンはこのデバイスのみに保存されます。</p>
    </div>
  )
}

function DataSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importState, setImportState] = useState<'idle' | 'confirm' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingJson, setPendingJson] = useState('')

  const handleExport = () => {
    exportData()
  }

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
        setErrorMsg('')
      } catch {
        setImportState('error')
        setErrorMsg('ファイルの形式が正しくありません')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportConfirm = () => {
    try {
      importData(pendingJson)
      setImportState('done')
    } catch (err) {
      setImportState('error')
      setErrorMsg(err instanceof Error ? err.message : 'インポートに失敗しました')
    }
  }

  return (
    <div>
      <SectionTitle>エクスポート</SectionTitle>
      <p className="text-gray-400 text-xs mb-3">
        全アカウントのログイン情報・カラム設定・各種設定をJSONファイルとして保存します。
        アクセストークンが含まれるため、ファイルは安全に管理してください。
      </p>
      <button
        type="button"
        onClick={handleExport}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        設定をエクスポート
      </button>

      <SectionTitle>インポート</SectionTitle>
      <p className="text-gray-400 text-xs mb-3">
        エクスポートしたJSONファイルを読み込みます。
        現在の設定・アカウント情報はすべて上書きされます。
      </p>

      {importState === 'idle' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            ファイルを選択
          </button>
        </>
      )}

      {importState === 'confirm' && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 space-y-3">
          <p className="text-yellow-300 text-sm font-medium">現在のすべての設定・アカウント情報が上書きされます。続行しますか？</p>
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

      {importState === 'done' && (
        <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 space-y-3">
          <p className="text-green-300 text-sm font-medium">インポートが完了しました。設定を反映するにはページを再読み込みしてください。</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            ページを再読み込み
          </button>
        </div>
      )}

      {importState === 'error' && (
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 space-y-3">
          <p className="text-red-300 text-sm">{errorMsg}</p>
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
  )
}

function PrivacySettings({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (s: AppSettings) => void
}) {
  return (
    <div>
      <SectionTitle>クロスアカウント操作</SectionTitle>
      <SettingRow
        label="別アカウントからの操作を許可"
        description="OFFにすると、他のアカウントで「別サーバーへの取り込み」などを行う際にこのアカウントが一覧に表示されなくなります"
      >
        <ToggleSwitch
          checked={settings.allowCrossAccountAction}
          onChange={(v) => onChange({ ...settings, allowCrossAccountAction: v })}
        />
      </SettingRow>
      <SettingRow
        label="バックグラウンド通知"
        description="他のアカウントを表示中もこのアカウントの通知を受け取り、アイコンにバッジを表示します（通知カラムを追加している場合のみ有効）"
      >
        <ToggleSwitch
          checked={settings.backgroundNotification}
          onChange={(v) => onChange({ ...settings, backgroundNotification: v })}
        />
      </SettingRow>
    </div>
  )
}

export function SettingsModal({ onClose, accountKey, instanceUrl, onSave }: SettingsModalProps) {
  const [activeGroup, setActiveGroup] = useState<GroupId>('general')
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(accountKey))

  const handleSettingsChange = (next: AppSettings) => {
    setSettings(next)
    saveSettings(next, accountKey)
    onSave?.(next)
  }

  const groupContent: Record<GroupId, React.ReactNode> = {
    general: <GeneralSettings settings={settings} onChange={handleSettingsChange} instanceUrl={instanceUrl} />,
    display: <DisplaySettings settings={settings} onChange={handleSettingsChange} accountKey={accountKey} />,
    notifications: <NotificationsSettings settings={settings} onChange={handleSettingsChange} />,
    privacy: <PrivacySettings settings={settings} onChange={handleSettingsChange} />,
    filters: <FiltersSettings accountKey={accountKey} />,
    notestock: <NotestockSettings accountKey={accountKey} />,
    data: <DataSettings />,
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-[640px] h-[520px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-semibold">設定</h2>
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

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left: group list */}
          <nav className="w-44 flex-shrink-0 border-r border-gray-700 py-2 overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors rounded-lg mx-1 ${
                  activeGroup === g.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
                style={{ width: 'calc(100% - 8px)' }}
              >
                {g.icon}
                {g.label}
              </button>
            ))}
          </nav>

          {/* Right: settings content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <h3 className="text-white font-semibold text-base mb-4">{groupTitles[activeGroup]}</h3>
            {groupContent[activeGroup]}
          </div>
        </div>
      </div>
    </div>
  )
}
