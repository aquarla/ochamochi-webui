function storageKey(accountKey?: string): string {
  return accountKey ? `mastodon_notestock_token_${accountKey}` : 'mastodon_notestock_token'
}

export function loadNotestockToken(accountKey?: string): string {
  return localStorage.getItem(storageKey(accountKey)) ?? ''
}

export function saveNotestockToken(token: string, accountKey?: string): void {
  const key = storageKey(accountKey)
  if (token.trim()) {
    localStorage.setItem(key, token.trim())
  } else {
    localStorage.removeItem(key)
  }
}
