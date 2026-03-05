import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'sepia' | 'solarized' | 'nord' | 'dracula'

const THEMES: Theme[] = ['dark', 'light', 'sepia', 'solarized', 'nord', 'dracula']

function storageKey(accountKey?: string | null) {
  return accountKey ? `mastodon_theme_${accountKey}` : 'mastodon_theme_default'
}

function loadTheme(accountKey?: string | null): Theme {
  const saved = localStorage.getItem(storageKey(accountKey))
  return THEMES.includes(saved as Theme) ? (saved as Theme) : 'dark'
}

export function useTheme(accountKey?: string | null) {
  const [theme, setTheme] = useState<Theme>('dark')

  // Load theme when account changes (or on initial mount)
  useEffect(() => {
    const t = loadTheme(accountKey)
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [accountKey])

  const setThemeValue = (next: Theme) => {
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(storageKey(accountKey), next)
    setTheme(next)
  }

  return { theme, setTheme: setThemeValue }
}
