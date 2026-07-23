import type { CustomEmoji } from '../types'
import type { EmojiStyle } from '../hooks/useSettings'

let _emojiStyle: EmojiStyle = 'default'
export function setActiveEmojiStyle(style: EmojiStyle) { _emojiStyle = style }

// ZWJ sequences, skin tones, keycap, variation selectors を含む絵文字にマッチ
const EMOJI_REGEX = new RegExp(
  '\\p{Extended_Pictographic}(?:\\uFE0F\\u20E3?|\\u20E3)?(?:\\p{Emoji_Modifier})?(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F\\u20E3?|\\u20E3)?(?:\\p{Emoji_Modifier})?)*|[#*0-9]\\uFE0F\\u20E3',
  'gu',
)


function unicodeEmojiToImg(emoji: string, style: EmojiStyle): string {
  const cps = [...emoji].map((c) => c.codePointAt(0)!.toString(16).toLowerCase())
  let src: string
  if (style === 'twemoji') {
    src = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cps.join('-')}.svg`
  } else {
    // Blobmoji: Noto Emoji 命名規則 (emoji_u プレフィックス、_ 区切り、FE0F 除外)
    const blobCps = cps.filter((cp) => cp !== 'fe0f')
    src = `https://cdn.jsdelivr.net/gh/C1710/blobmoji@main/svg/emoji_u${blobCps.join('_')}.svg`
  }
  return `<img src="${src}" alt="${emoji}" class="custom-emoji" onerror="this.replaceWith(this.alt)">`
}

function replaceUnicodeEmoji(text: string): string {
  if (_emojiStyle === 'default') return text
  return text.replace(EMOJI_REGEX, (e) => unicodeEmojiToImg(e, _emojiStyle))
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const EMOJI_IMG = (emoji: CustomEmoji) => {
  const cls = emoji.shortcode.startsWith('stamp_') ? 'custom-emoji-stamp' : 'custom-emoji'
  return `<img src="${emoji.static_url}" alt=":${emoji.shortcode}:" title=":${emoji.shortcode}:" class="${cls}" />`
}

/**
 * HTML フィールド (content) 用。
 * HTML タグを壊さずに、テキストノード内の :shortcode: と Unicode 絵文字を置換する。
 */
export function emojifyHtml(html: string, emojis: CustomEmoji[]): string {
  const needsUnicode = _emojiStyle !== 'default'
  if (!emojis.length && !needsUnicode) return html

  // <tag> と非タグ部分に分割（capturing group でタグ自体も配列に含まれる）
  const parts = html.split(/(<[^>]*>)/g)
  return parts.map((part, i) => {
    if (i % 2 === 1) return part // HTML タグはそのまま
    // テキストノード: カスタム絵文字 → Unicode 絵文字 の順に置換
    let result = part
    if (emojis.length) {
      result = result.replace(/:[a-zA-Z0-9_]+:/g, (match) => {
        const shortcode = match.slice(1, -1)
        const emoji = emojis.find((e) => e.shortcode === shortcode)
        return emoji ? EMOJI_IMG(emoji) : match
      })
    }
    if (needsUnicode) result = replaceUnicodeEmoji(result)
    return result
  }).join('')
}

/**
 * Plain text フィールド (display_name, spoiler_text) 用。
 * HTML エスケープ後に :shortcode: と Unicode 絵文字を置換する。
 */
export function emojifyText(text: string, emojis: CustomEmoji[]): string {
  let result = escapeHtml(text)
  for (const emoji of emojis) {
    result = result.replace(
      new RegExp(`:${emoji.shortcode}:`, 'g'),
      EMOJI_IMG(emoji),
    )
  }
  if (_emojiStyle !== 'default') result = replaceUnicodeEmoji(result)
  return result
}
