import { expect, test } from '@playwright/test'

test('keeps the app shell and local recording flow usable offline at 360px', async ({ context, page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/#/home')
  await page.getByRole('button', { name: '完成首次设置' }).click()
  await expect(page).toHaveURL(/#\/home$/)
  await page.evaluate(() => navigator.serviceWorker.ready)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '今晚的梦，会漂向哪里？' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)

  await page.getByRole('link', { name: '记录' }).click()
  await page.getByLabel('梦境碎片').fill('离线时，门后依然有一片安静的海。')
  await page.getByRole('button', { name: '保存梦境' }).click()
  await expect(page.getByText('离线时，门后依然有一片安静的海。')).toBeVisible()
})
