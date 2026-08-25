import { expect, test } from '@playwright/test'

test('makes zero AI calls before consent and restores focus after cancel', async ({ page }) => {
  let aiCalls = 0
  await page.route('**/fake-ai/**', async (route) => {
    aiCalls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: '雾里的门',
        summary: '沿着湖面走向一扇门。',
        mood: 'mysterious',
        keywords: ['湖面', '门'],
      }),
    })
  })

  await page.goto('/#/home')
  await page.getByRole('button', { name: '完成首次设置' }).click()
  await page.getByRole('link', { name: '记录' }).click()
  await page.getByLabel('梦境碎片').fill('我沿着湖面走向一扇门。')
  await page.getByRole('button', { name: '保存梦境' }).click()
  await expect(page.getByText('尚未配置 AI 服务')).toBeVisible()
  expect(aiCalls).toBe(0)

  await page.getByTestId('primary-nav').getByRole('link', { name: '设置' }).click()
  await page.getByRole('textbox', { name: 'HTTPS 地址' }).fill('http://127.0.0.1:4173/fake-ai')
  await page.getByRole('button', { name: '保存 AI 服务地址' }).click()
  await page.getByRole('link', { name: '梦河' }).click()
  await page.getByText('我沿着湖面走向一扇门。').click()

  const organize = page.getByRole('button', { name: 'AI 整理梦境' })
  await organize.click()
  await expect(page.getByRole('dialog', { name: '确认这次 AI 操作' })).toContainText('梦境正文与已选元数据')
  await page.getByRole('button', { name: '取消 AI 操作' }).click()
  await expect(organize).toBeFocused()
  expect(aiCalls).toBe(0)

  await organize.click()
  await page.getByRole('button', { name: '确认 AI 操作' }).click()
  await expect.poll(() => aiCalls).toBe(1)
  await expect(page.getByText('沿着湖面走向一扇门。', { exact: true })).toBeVisible()
})
