import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Account } from '../types'
import { emojifyText } from '../utils/emojify'

const SHOW_DELAY_MS = 300
const CARD_WIDTH = 256
const CARD_HEIGHT = 64
const CARD_GAP = 4
const VIEWPORT_MARGIN = 8

interface CardPosition {
  left: number
  top?: number
  bottom?: number
}

function calcCardPosition(anchor: DOMRect): CardPosition {
  const maxLeft = window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN
  const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, maxLeft))
  // 画面下に収まらない場合はアンカーの上側に表示する
  if (anchor.bottom + CARD_GAP + CARD_HEIGHT > window.innerHeight - VIEWPORT_MARGIN) {
    return { left, bottom: window.innerHeight - anchor.top + CARD_GAP }
  }
  return { left, top: anchor.bottom + CARD_GAP }
}

interface BoosterNameProps {
  account: Account
  onOpenProfile?: (account: Account) => void
}

export function BoosterName({ account, onOpenProfile }: BoosterNameProps) {
  const [cardPos, setCardPos] = useState<CardPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<number | null>(null)

  const cancelTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const hide = () => {
    cancelTimer()
    setCardPos(null)
  }

  const handleMouseEnter = () => {
    cancelTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      if (buttonRef.current) setCardPos(calcCardPosition(buttonRef.current.getBoundingClientRect()))
    }, SHOW_DELAY_MS)
  }

  useEffect(() => cancelTimer, [])

  // カードは fixed 配置なので、カラムのスクロールでアンカーからずれる前に閉じる
  const isOpen = cardPos !== null
  useEffect(() => {
    if (!isOpen) return
    const close = () => setCardPos(null)
    window.addEventListener('scroll', close, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', close, { capture: true })
  }, [isOpen])

  const displayNameHtml = emojifyText(account.display_name || account.username, account.emojis)

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => {
          hide()
          onOpenProfile?.(account)
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={hide}
        className={`max-w-[12rem] truncate inline-block align-bottom ${onOpenProfile ? 'hover:text-gray-300 transition-colors' : 'cursor-default'}`}
        dangerouslySetInnerHTML={{ __html: displayNameHtml }}
      />
      {cardPos && createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', width: CARD_WIDTH, ...cardPos }}
          className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999] pointer-events-none"
        >
          <img
            src={account.avatar_static}
            alt=""
            className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0"
          />
          <div className="min-w-0">
            <div
              className="font-medium text-white text-sm truncate"
              dangerouslySetInnerHTML={{ __html: displayNameHtml }}
            />
            <div className="text-gray-400 text-xs truncate">@{account.acct}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
