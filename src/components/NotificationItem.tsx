import type { MastodonNotification, Account, AdminReport } from '../types'
import { emojifyText, emojifyHtml } from '../utils/emojify'

interface NotificationItemProps {
  notification: MastodonNotification
  onOpenProfile?: (account: Account) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return `${diffSec}秒前`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}分前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}時間前`
  return `${Math.floor(diffHour / 24)}日前`
}

const TYPE_META: Record<
  MastodonNotification['type'],
  { label: string; color: string }
> = {
  mention:        { label: 'メンション', color: 'text-blue-400' },
  reblog:         { label: 'ブースト',   color: 'text-green-400' },
  favourite:      { label: 'お気に入り', color: 'text-yellow-400' },
  follow:         { label: 'フォロー',   color: 'text-purple-400' },
  follow_request: { label: 'フォローリクエスト', color: 'text-orange-400' },
  poll:           { label: 'アンケート終了', color: 'text-gray-400' },
  update:         { label: '編集',       color: 'text-gray-400' },
  'admin.sign_up': { label: '新規登録',  color: 'text-teal-400' },
  'admin.report':  { label: '通報',      color: 'text-red-400' },
}

function ReportSummary({ report, onOpenProfile }: { report: AdminReport; onOpenProfile?: (account: Account) => void }) {
  return (
    <div className="pl-10 mt-1 space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 text-xs">対象:</span>
        <button
          type="button"
          onClick={() => onOpenProfile?.(report.target_account)}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <img src={report.target_account.avatar_static} alt="" className="w-4 h-4 rounded-full bg-gray-700" />
          <span className="text-gray-300 text-xs truncate">
            {report.target_account.display_name || report.target_account.username}
          </span>
        </button>
      </div>
      {report.comment && (
        <p className="text-gray-400 text-xs line-clamp-2 break-words">{report.comment}</p>
      )}
    </div>
  )
}

export function NotificationItem({ notification, onOpenProfile }: NotificationItemProps) {
  const { account, type, created_at, status } = notification
  const meta = TYPE_META[type] ?? { label: type, color: 'text-gray-400' }
  const displayNameHtml = emojifyText(account.display_name || account.username, account.emojis)

  return (
    <article className="border-b border-gray-700 p-3 hover:bg-gray-750 transition-colors">
      <div className="flex items-start gap-2 mb-1.5">
        <button
          type="button"
          onClick={() => onOpenProfile?.(account)}
          className={`flex-shrink-0 rounded-full ${onOpenProfile ? 'hover:opacity-80 transition-opacity cursor-pointer' : 'cursor-default'}`}
        >
          <img
            src={account.avatar_static}
            alt={account.display_name || account.username}
            className="w-8 h-8 rounded-full bg-gray-700"
            loading="lazy"
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-white text-sm truncate" dangerouslySetInnerHTML={{ __html: displayNameHtml }} />
            <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
            <span className="text-gray-600 text-xs ml-auto flex-shrink-0">{formatDate(created_at)}</span>
          </div>
          <span className="text-gray-500 text-xs">@{account.acct}</span>
        </div>
      </div>

      {status && (
        <div
          className="text-gray-400 text-xs leading-relaxed pl-10 line-clamp-3 break-words [&_a]:text-blue-400 [&_p]:inline"
          dangerouslySetInnerHTML={{
            __html: status.spoiler_text
              ? `<span class="text-yellow-500">${emojifyText(status.spoiler_text, status.emojis)}</span>`
              : emojifyHtml(status.content, status.emojis),
          }}
        />
      )}
      {notification.report && (
        <ReportSummary report={notification.report} onOpenProfile={onOpenProfile} />
      )}
    </article>
  )
}
