export type HashLocationParts = {
  pathname: string
  search: string
  hash: string
}

export const getNormalizedHashUrl = ({ pathname, search, hash }: HashLocationParts) => {
  if (!search || !hash.startsWith('#/')) return ''

  const hashPath = hash.slice(1)
  const query = search.slice(1)
  const separator = hashPath.includes('?') ? '&' : '?'

  return `${pathname}#${hashPath}${separator}${query}`
}

export const normalizeHashUrl = () => {
  const nextUrl = getNormalizedHashUrl(window.location)
  if (nextUrl) window.history.replaceState(null, '', nextUrl)
}
