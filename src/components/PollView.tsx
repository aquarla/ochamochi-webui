import { useState } from 'react'
import { MastodonClient } from '../services/mastodon'
import { emojifyText } from '../utils/emojify'
import type { Poll } from '../types'

interface PollViewProps {
  poll: Poll
  instanceUrl: string
  accessToken: string
  onVote: (updated: Poll) => void
}

function formatPollExpiry(expiresAt: string | null, expired: boolean): string {
  if (expired) return '終了済み'
  if (!expiresAt) return ''
  const diff = new Date(expiresAt).getTime() - Date.now()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `残り${min}分`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `残り${hour}時間`
  return `残り${Math.floor(hour / 24)}日`
}

export function PollView({ poll, instanceUrl, accessToken, onVote }: PollViewProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [voting, setVoting] = useState(false)

  const canVote = !poll.voted && !poll.expired
  const showResults = !canVote

  const toggleChoice = (idx: number) => {
    if (poll.multiple) {
      setSelected((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx])
    } else {
      setSelected([idx])
    }
  }

  const handleVote = async () => {
    if (selected.length === 0 || voting) return
    setVoting(true)
    try {
      const client = new MastodonClient(instanceUrl, accessToken)
      const updated = await client.votePoll(poll.id, selected)
      onVote(updated)
    } catch {
      // ignore
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className="mt-2 space-y-1.5">
      {poll.options.map((opt, idx) => {
        const pct = poll.votes_count > 0 && opt.votes_count != null
          ? Math.round((opt.votes_count / poll.votes_count) * 100)
          : 0
        const isOwn = poll.own_votes?.includes(idx)

        if (!showResults) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleChoice(idx)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left text-xs transition-colors ${
                selected.includes(idx)
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-400'
              }`}
            >
              <span className={`w-3.5 h-3.5 flex-shrink-0 border-2 flex items-center justify-center ${
                poll.multiple ? 'rounded-sm' : 'rounded-full'
              } ${selected.includes(idx) ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                {selected.includes(idx) && (
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span dangerouslySetInnerHTML={{ __html: emojifyText(opt.title, poll.emojis) }} />
            </button>
          )
        }

        return (
          <div key={idx} className="relative overflow-hidden rounded-lg">
            <div
              className={`absolute inset-y-0 left-0 rounded-lg ${isOwn ? 'bg-blue-500/25' : 'bg-gray-700/60'}`}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between px-3 py-1.5 text-xs">
              <span className={`flex items-center gap-1 ${isOwn ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                {isOwn && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                <span dangerouslySetInnerHTML={{ __html: emojifyText(opt.title, poll.emojis) }} />
              </span>
              <span className="text-gray-400 ml-2 flex-shrink-0">{pct}%</span>
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-gray-500 text-xs">
          {poll.votes_count}票
          {formatPollExpiry(poll.expires_at, poll.expired) && ` · ${formatPollExpiry(poll.expires_at, poll.expired)}`}
        </span>
        {canVote && (
          <button
            type="button"
            onClick={handleVote}
            disabled={selected.length === 0 || voting}
            className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {voting ? '投票中…' : '投票'}
          </button>
        )}
      </div>
    </div>
  )
}
