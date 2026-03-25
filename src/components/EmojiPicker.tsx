import { useState, useEffect } from 'react'
import { MastodonClient } from '../services/mastodon'
import type { CustomEmoji } from '../types'

// Per-instance cache (survives component unmount within the session)
export const emojiCache: Record<string, CustomEmoji[]> = {}
export const emojiFetching: Record<string, boolean> = {}

const UNICODE_CATEGORIES: { label: string; emoji: string[] }[] = [
  {
    label: 'スマイル',
    emoji: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😋','😛','😜','🤪','😎','🤩','😏','😒','😔','😢','😭','😤','😠','🤬','😱','😳','🥺','😶','😐','😬','🙄','😯','😴','🤢','🤮','🤧','😵','😈','💀','💩','🤡','👻','👽','🤖'],
  },
  {
    label: '手・体',
    emoji: ['👋','🤚','✋','👌','✌️','🤞','🤟','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤲','🙏','💪','👀','👁️','👅','💋','👂','👃'],
  },
  {
    label: '動物',
    emoji: ['🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦉','🦇','🐺','🐴','🦄','🐝','🦋','🐌','🐞','🐢','🐍','🦎','🐙','🦑','🐠','🐟','🐬','🐳','🦈','🐘','🦒','🦘','🐕','🐈','🦚','🦜','🐇','🦔'],
  },
  {
    label: '食べ物',
    emoji: ['🍎','🍊','🍋','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥕','🌽','🍞','🥐','🧀','🥚','🍳','🥞','🧇','🥓','🍗','🌮','🌯','🍜','🍝','🍣','🍱','🍛','🍲','🍿','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🧋','🍺','🍷','🍸','🍹'],
  },
  {
    label: '旅行',
    emoji: ['🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚲','🛴','✈️','🚀','🛸','🚂','🚃','🚄','🛳️','⛵','🏔️','🌋','🏕️','🏖️','🏜️','🏝️','🏠','🏡','🏢','🏥','🏦','🏨','🏛️','⛪','🕌','⛩️','🗼','🗽','🌃','🌆','🌇','🌉'],
  },
  {
    label: '物',
    emoji: ['💡','🔦','💰','💵','💳','📱','💻','📷','📹','🎥','📺','📻','📚','📖','📝','✏️','✂️','🔒','🔑','🔨','⚙️','🔧','💊','💉','🎁','🎀','🎊','🎉','🎈','🔮','🎭','🎨','🎬','🎵','🎶','🎸','🎹','🥁','🎺','🎷','🎻'],
  },
  {
    label: '記号・自然',
    emoji: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💖','⭐','🌟','✨','💫','🔥','💥','❄️','🌈','☀️','⛅','🌧️','🌊','💧','🌙','🌿','🍀','🌸','🌺','🌻','🌹','🍁','🍂','♻️','✅','❌','⭕','❗','❓','💯','⛔','🚫','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔶','🔷'],
  },
]

interface EmojiPickerProps {
  instanceUrl: string
  accessToken: string
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ instanceUrl, accessToken, onSelect }: EmojiPickerProps) {
  const [tab, setTab] = useState<'custom' | 'unicode'>('custom')
  const [search, setSearch] = useState('')
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>(() => emojiCache[instanceUrl] ?? [])
  const [loading, setLoading] = useState(!emojiCache[instanceUrl])

  useEffect(() => {
    if (emojiCache[instanceUrl]) {
      setCustomEmojis(emojiCache[instanceUrl])
      setLoading(false)
      return
    }
    const client = new MastodonClient(instanceUrl, accessToken)
    client.getCustomEmojis()
      .then((data) => {
        const visible = data
          .filter((e) => e.visible_in_picker !== false)
          .sort((a, b) => {
            if (a.category && b.category) return a.category.localeCompare(b.category)
            if (a.category) return -1
            if (b.category) return 1
            return a.shortcode.localeCompare(b.shortcode)
          })
        emojiCache[instanceUrl] = visible
        setCustomEmojis(visible)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [instanceUrl, accessToken])

  const query = search.toLowerCase().replace(/^:/, '').replace(/:$/, '')

  const filteredCustom = query
    ? customEmojis.filter((e) => e.shortcode.toLowerCase().includes(query))
    : customEmojis

  const customGroups = filteredCustom.reduce<Record<string, CustomEmoji[]>>((acc, e) => {
    const cat = e.category || 'その他'
    ;(acc[cat] ??= []).push(e)
    return acc
  }, {})

  return (
    <div className="mt-2 border border-gray-600 rounded-lg bg-gray-800 overflow-hidden">
      {/* Search */}
      <div className="px-2 pt-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'custom' ? 'shortcodeで検索…' : 'カテゴリで絞り込み…'}
          className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mt-2">
        <button
          type="button"
          onClick={() => setTab('custom')}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === 'custom' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          カスタム
        </button>
        <button
          type="button"
          onClick={() => setTab('unicode')}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === 'unicode' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          Unicode
        </button>
      </div>

      {/* Content */}
      <div className="h-52 overflow-y-auto p-2">
        {tab === 'custom' && (
          <>
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
            {!loading && Object.keys(customGroups).length === 0 && (
              <p className="text-gray-500 text-xs text-center py-6">
                {query ? '見つかりませんでした' : 'カスタム絵文字がありません'}
              </p>
            )}
            {!loading && Object.entries(customGroups).map(([cat, emojis]) => (
              <div key={cat} className="mb-3">
                <p className="text-gray-500 text-xs font-medium mb-1">{cat}</p>
                <div className="flex flex-wrap gap-0.5">
                  {emojis.map((e) => (
                    <button
                      key={e.shortcode}
                      type="button"
                      onClick={() => onSelect(`:${e.shortcode}:`)}
                      title={`:${e.shortcode}:`}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
                    >
                      <img src={e.static_url} alt={e.shortcode} className="w-6 h-6 object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'unicode' && (() => {
          const filtered = query
            ? UNICODE_CATEGORIES.filter((c) => c.label.includes(query))
            : UNICODE_CATEGORIES
          return filtered.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-6">見つかりませんでした</p>
          ) : (
            <>
              {filtered.map((cat) => (
                <div key={cat.label} className="mb-3">
                  <p className="text-gray-500 text-xs font-medium mb-1">{cat.label}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {cat.emoji.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => onSelect(e)}
                        title={e}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors text-lg leading-none"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )
        })()}
      </div>
    </div>
  )
}
