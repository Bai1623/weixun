import { expect, test } from '@playwright/test'

const baseUrl = 'http://127.0.0.1:4173'

test('exports a full backup and restores it into a fresh local profile', async ({ browser, page }) => {
  await page.goto('/#/home')
  await page.getByRole('button', { name: '完成首次设置' }).click()
  await page.getByRole('link', { name: '记录' }).click()
  await page.getByLabel('梦境碎片').fill('备份里有一只停在星光下的白鸟。')
  await page.getByRole('button', { name: '保存梦境' }).click()
  await page.getByRole('link', { name: '设置' }).click()
  await page.getByRole('button', { name: '导出完整备份' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '确认导出备份' }).click()
  const download = await downloadPromise
  const backupPath = await download.path()
  expect(backupPath).toBeTruthy()

  const freshContext = await browser.newContext()
  const freshPage = await freshContext.newPage()
  await freshPage.goto(`${baseUrl}/#/home`)
  await freshPage.getByRole('button', { name: '完成首次设置' }).click()
  await freshPage.getByRole('link', { name: '设置' }).click()
  await freshPage.locator('input[type="file"]').setInputFiles(backupPath!)
  const restoreDialog = freshPage.getByRole('dialog', { name: '先看看将恢复什么' })
  await expect(restoreDialog).toContainText('将恢复 1 个梦和 0 个媒体文件')
  await expect(restoreDialog.getByRole('button', { name: '取消' })).toBeFocused()
  await restoreDialog.getByRole('button', { name: '确认恢复' }).click()
  await expect(freshPage.getByText('已恢复 1 个梦')).toBeVisible()
  await freshPage.getByRole('link', { name: '梦河' }).click()
  await expect(freshPage.getByText('备份里有一只停在星光下的白鸟。')).toBeVisible()
  await freshContext.close()
})
