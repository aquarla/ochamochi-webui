import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { LANGUAGES, type Language } from '../data/languages'

interface LanguageDropdownProps {
  value: string
  recent: string[]
  onChange: (code: string) => void
  disabled?: boolean
}

const DROPDOWN_WIDTH = 256
const DROPDOWN_MAX_HEIGHT = 320

const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]))

function matches(lang: Language, query: string): boolean {
  const q = query.toLowerCase()
  return (
    lang.code.toLowerCase().startsWith(q) ||
    lang.name.toLowerCase().includes(q) ||
    lang.nativeName.toLowerCase().includes(q)
  )
}

export function LanguageDropdown({ value, recent, onChange, disabled }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 最近使った言語を先頭に、残りは英語名順
  const options = useMemo(() => {
    const recentLangs = recent.map((c) => LANGUAGE_MAP.get(c)).filter((l): l is Language => !!l)
    const recentSet = new Set(recentLangs.map((l) => l.code))
    const rest = LANGUAGES.filter((l) => !recentSet.has(l.code)).sort((a, b) => a.name.localeCompare(b.name))
    const all = [...recentLangs, ...rest]
    return query ? all.filter((l) => matches(l, query)) : all
  }, [recent, query])

  const openDropdown = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8))
    const spaceBelow = window.innerHeight - rect.bottom
    setPos(
      spaceBelow >= DROPDOWN_MAX_HEIGHT || spaceBelow >= rect.top
        ? { top: rect.bottom + 4, left }
        : { bottom: window.innerHeight - rect.top + 4, left }
    )
    setQuery('')
    setSelectedIndex(0)
    setOpen(true)
  }

  const select = (code: string) => {
    onChange(code)
    setOpen(false)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // キーボード選択中の項目を表示範囲内にスクロール
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, open])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const lang = options[selectedIndex]
      if (lang) select(lang.code)
    }
  }

  const current = LANGUAGE_MAP.get(value)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`text-xs font-bold px-2 py-1 rounded border transition-colors uppercase disabled:opacity-40 disabled:cursor-not-allowed ${
          open
            ? 'bg-gray-600 border-gray-500 text-white'
            : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
        }`}
        title={`投稿言語: ${current ? `${current.nativeName} (${current.name})` : value}`}
        disabled={disabled}
      >
        {value}
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-[9999] flex flex-col overflow-hidden"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: DROPDOWN_WIDTH, maxHeight: DROPDOWN_MAX_HEIGHT }}
        >
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
              onKeyDown={handleKeyDown}
              placeholder="言語を検索"
              autoFocus
              className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div ref={listRef} className="overflow-y-auto">
            {options.map((lang, i) => (
              <button
                key={lang.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(lang.code)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-gray-700' : ''
                } ${lang.code === value ? 'text-blue-400' : 'text-gray-300'}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm truncate">{lang.nativeName}</span>
                  <span className="block text-[11px] text-gray-500 truncate">{lang.name}</span>
                </span>
                <span className="text-[11px] text-gray-500 flex-shrink-0">{lang.code}</span>
              </button>
            ))}
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">該当する言語がありません</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
