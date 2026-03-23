import { useState, useCallback } from 'react'
import { loadSettings, saveSettings } from '../hooks/useSettings'
import type { AppSettings } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../hooks/useTheme'

interface SettingsModalProps {
  onClose: () => void
  accountKey?: string
  instanceUrl?: string
  onSave?: (settings: AppSettings) => void
}

type GroupId = 'general' | 'display' | 'notifications' | 'privacy'

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
  return (
    <div>
      {instanceUrl && (
        <>
          <SectionTitle>Mastodon</SectionTitle>
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
