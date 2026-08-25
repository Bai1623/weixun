import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function completeOnboarding(page: Page) {
  await page.goto('/#/home')
  const start = page.getByRole('button', { name: '完成首次设置' })
  await expect(start).toBeVisible()
  await start.click()
  await expect(page).toHaveURL(/#\/home$/)
}

test('creates, edits, favorites, searches and reversibly deletes a local dream', async ({ page }) => {
  await completeOnboarding(page)
  await page.getByRole('link', { name: '记录' }).click()
  await page.getByLabel('梦境碎片').fill('湖面尽头出现一扇门，月光落在门把手上。')
  await page.getByRole('button', { name: '保存梦境' }).click()

  await expect(page.getByText('湖面尽头出现一扇门，月光落在门把手上。')).toBeVisible()
  await page.getByRole('button', { name: '收藏梦境' }).click()
  await expect(page.getByRole('button', { name: '取消收藏梦境' })).toBeVisible()

  await page.getByRole('link', { name: '编辑梦境' }).click()
  await page.getByLabel(/标题/).fill('雾里的门')
  await page.getByRole('button', { name: '保存梦境' }).click()
  await expect(page.getByRole('heading', { name: '雾里的门' })).toBeVisible()

  await page.getByRole('link', { name: '档案' }).click()
  await page.getByRole('searchbox', { name: '搜索梦境' }).fill('湖面尽头')
  await expect(page.getByRole('heading', { name: '雾里的门' })).toBeVisible()
  await page.getByRole('heading', { name: '雾里的门' }).click()

  await page.getByRole('button', { name: '删除梦境' }).click()
  await expect(page.getByText('梦境已移入雾中')).toBeVisible()
  await page.getByRole('button', { name: '撤销删除' }).click()
  await expect(page.getByText('湖面尽头出现一扇门，月光落在门把手上。')).toBeVisible()
})
