import { apiClient } from '@/api/client'
import type { Cocktail } from '@/types/cocktail'

export type CocktailListResponse = {
  items: Cocktail[]
  total: number
}

export type AnonymousUserResponse = {
  id: string
  anonymousKey: string | null
  displayName: string | null
  isAnonymous: boolean
}

export type DailyPickResponse = {
  pickDate: string
  reason: string
  cocktail: Cocktail
}

export type FavoriteListResponse = {
  slugs: string[]
}

export type HistoryListResponse = {
  items: Cocktail[]
}

const assetUrl = (path: string) => {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}${path.replace(/^\//, '')}`
}

export const fetchCocktails = async (): Promise<CocktailListResponse> => {
  const response = await apiClient.get<CocktailListResponse>('/cocktails')
  return response.data
}

export const fetchStaticCocktailCatalog = async (): Promise<CocktailListResponse> => {
  const response = await fetch(assetUrl('/cocktails/catalog.json'))
  if (!response.ok) {
    throw new Error('Static cocktail catalog unavailable')
  }
  return (await response.json()) as CocktailListResponse
}

export const fetchCocktail = async (slug: string): Promise<Cocktail> => {
  const response = await apiClient.get<Cocktail>(`/cocktails/${slug}`)
  return response.data
}

export const createAnonymousUser = async (anonymousKey: string): Promise<AnonymousUserResponse> => {
  const response = await apiClient.post<AnonymousUserResponse>('/users/anonymous', {
    anonymousKey,
  })
  return response.data
}

export const fetchDailyPick = async (
  userId: string,
  pickDate: string,
): Promise<DailyPickResponse> => {
  const response = await apiClient.get<DailyPickResponse>('/daily-pick', {
    params: { userId, pickDate },
  })
  return response.data
}

export const fetchFavorites = async (userId: string): Promise<FavoriteListResponse> => {
  const response = await apiClient.get<FavoriteListResponse>('/favorites', { params: { userId } })
  return response.data
}

export const addFavorite = async (userId: string, slug: string): Promise<FavoriteListResponse> => {
  const response = await apiClient.post<FavoriteListResponse>(`/favorites/${slug}`, null, {
    params: { userId },
  })
  return response.data
}

export const removeFavorite = async (userId: string, slug: string): Promise<void> => {
  await apiClient.delete(`/favorites/${slug}`, { params: { userId } })
}

export const recordCocktailHistory = async (
  userId: string,
  slug: string,
): Promise<HistoryListResponse> => {
  const response = await apiClient.post<HistoryListResponse>(`/history/cocktails/${slug}`, null, {
    params: { userId },
  })
  return response.data
}
