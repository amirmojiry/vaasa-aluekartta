import { expect, test } from '@playwright/test'

test('postal detail reuses the responsive area summary visuals', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/, (route) => route.abort())
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort())

  await page.goto('/vaasa-aluekartta/?postal=65280&lang=en')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('65280')
  await expect(page.getByText('Employment status')).toBeVisible()
  await expect(page.locator('.summary-bar--employment')).toBeVisible()
  await expect(page.locator('.student-pictogram .student-icon')).toHaveCount(10)
  await expect(page.getByText('Population', { exact: true })).toBeVisible()
  await expect(page.getByText('Average annual income of inhabitants')).toBeVisible()

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)
})
