import type { CustomEmoji } from '../types'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const EMOJI_IMG = (emoji: CustomEmoji) =>
  `<img src="${emoji.static_url}" alt=":${emoji.shortcode}:" title=":${emoji.shortcode}:" class="custom-emoji" />`

/**
 * HTML フィールド (content) 用。
 * HTML タグを壊さずに、テキストノード内の :shortcode: だけを <img> に置換する。
 */
export function emojifyHtml(html: string, emojis: CustomEmoji[]): string {
  if (!emojis.length) return html
  // <tag> にマッチしたらそのまま返し、:shortcode: にマッチしたら img に置換する
  return html.replace(/(<[^>]*>|:[a-zA-Z0-9_]+:)/g, (match) => {
    if (match.startsWith('<')) return match
    const shortcode = match.slice(1, -1)
    const emoji = emojis.find((e) => e.shortcode === shortcode)
    return emoji ? EMOJI_IMG(emoji) : match
  })
}

/**
 * Plain text フィールド (display_name, spoiler_text) 用。
 * HTML エスケープ後に :shortcode: を <img> に置換する。
 */
export function emojifyText(text: string, emojis: CustomEmoji[]): string {
  let result = escapeHtml(text)
  for (const emoji of emojis) {
    result = result.replace(
      new RegExp(`:${emoji.shortcode}:`, 'g'),
      EMOJI_IMG(emoji),
    )
  }
  return result
}
