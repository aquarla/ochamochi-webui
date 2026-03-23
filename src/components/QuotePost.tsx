import { emojifyText, emojifyHtml } from '../utils/emojify'
import type { Status } from '../types'

interface QuotePostProps {
  status: Status
  onOpenDetail?: (status: Status) => void
}

export function QuotePost({ status, onOpenDetail }: QuotePostProps) {
  const displayStatus = status.reblog ?? status
  const hasCw = !!displayStatus.spoiler_text

  if (!displayStatus.account) return null

  return (
    <button
      type="button"
      onClick={() => onOpenDetail?.(status)}
      className={`w-full text-left mt-2 border border-gray-600 rounded-lg p-2.5 bg-gray-700/40 ${onOpenDetail ? 'hover:bg-gray-700/70 hover:border-gray-500 transition-colors cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <img
          src={displayStatus.account.avatar_static}
          alt=""
          className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-600"
          loading="lazy"
        />
        <span
          className="text-white text-xs font-medium truncate"
          dangerouslySetInnerHTML={{ __html: emojifyText(displayStatus.account.display_name || displayStatus.account.username, displayStatus.account.emojis) }}
        />
        <span className="text-gray-500 text-xs truncate">@{displayStatus.account.acct}</span>
      </div>
      {hasCw ? (
        <p className="text-yellow-400 text-xs line-clamp-2">{displayStatus.spoiler_text}</p>
      ) : (
        <div
          className="text-gray-300 text-xs leading-relaxed line-clamp-3 break-all [overflow-wrap:anywhere] [&_p]:inline [&_p]:after:content-['_'] [&_a]:text-blue-400"
          dangerouslySetInnerHTML={{ __html: emojifyHtml(displayStatus.content, displayStatus.emojis) }}
        />
      )}
    </button>
  )
}
