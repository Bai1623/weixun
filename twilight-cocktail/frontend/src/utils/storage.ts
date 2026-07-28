export const getStoredString = (key: string, fallback: string): string => {
  const value = window.localStorage.getItem(key)
  return value && value.length > 0 ? value : fallback
}

export const setStoredString = (key: string, value: string): void => {
  window.localStorage.setItem(key, value)
}

export const getStoredStringArray = (key: string): string[] => {
  const value = window.localStorage.getItem(key)
  if (!value) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export const setStoredStringArray = (key: string, value: readonly string[]): void => {
  window.localStorage.setItem(key, JSON.stringify([...new Set(value)]))
}
