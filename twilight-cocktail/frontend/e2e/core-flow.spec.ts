import { expect, test } from '@playwright/test'

test('home links to daily ritual and recipes', async ({ page }) => {
  await page.goto('/home')

  await expect(page.getByRole('heading', { name: /今晚/ })).toBeVisible()
  await page.getByRole('link', { name: '开启今日酒单' }).click()
  await expect(page.getByRole('heading', { name: '今天会是哪一杯？' })).toBeVisible()
})
