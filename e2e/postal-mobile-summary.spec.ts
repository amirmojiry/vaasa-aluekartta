import { expect, test } from '@playwright/test'

const emptyBoundaries = {
  type: 'FeatureCollection',
  features: [],
}

const postalBoundary = {
  type: 'FeatureCollection',
  metadata: {
    source_url: 'https://geo.stat.fi/',
    release_year: 2026,
    statistics_year: 2024,
  },
  features: [
    {
      type: 'Feature',
      id: '65280',
      properties: {
        code: '65280',
        name_fi: 'Gerby',
        name_sv: 'Gerby',
        statistics_year: 2024,
        population: 5299,
        employed: 2217,
        unemployed: 163,
        students: 414,
        average_income: 33903,
        employed_share: 41.84,
        unemployed_share: 3.08,
        student_share: 7.81,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [21.5, 63.1],
            [21.7, 63.1],
            [21.7, 63.2],
            [21.5, 63.2],
            [21.5, 63.1],
          ],
        ],
      },
    },
  ],
}

const postalHistory = {
  generated_at: '2026-08-16T00:00:00.000Z',
  source: 'Statistics Finland Paavo WFS versioned layers',
  source_url: 'https://geo.stat.fi/',
  licence: 'CC BY 4.0',
  latest_release_year: 2026,
  latest_statistics_year: 2024,
  years: [2023, 2024],
  areas: {
    '65280': [
      {
        year: 2023,
        population: 5250,
        employed: 2180,
        unemployed: 170,
        students: 410,
        average_income: 33100,
        employed_share: 41.52,
        unemployed_share: 3.24,
        student_share: 7.81,
      },
      {
        year: 2024,
        population: 5299,
        employed: 2217,
        unemployed: 163,
        students: 414,
        average_income: 33903,
        employed_share: 41.84,
        unemployed_share: 3.08,
        student_share: 7.81,
      },
    ],
  },
}

async function mockPostalData(page: import('@playwright/test').Page) {
  await page.route('**/data/vaasa-suuralueet.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyBoundaries),
    }),
  )
  await page.route('**/data/vaasa-pienalueet.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyBoundaries),
    }),
  )
  await page.route('**/data/paavo-postal-areas.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(postalBoundary),
    }),
  )
  await page.route('**/data/paavo-postal-history.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(postalHistory),
    }),
  )
  await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/, (route) => route.abort())
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort())
}

test('postal detail reuses the responsive area summary visuals', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockPostalData(page)

  await page.goto('/vaasa-aluekartta/?postal=65280&lang=en')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('65280')
  await expect(page.getByText('Employment status')).toBeVisible()
  await expect(page.locator('.summary-bar--employment')).toBeVisible()
  await expect(page.locator('.student-pictogram .student-icon')).toHaveCount(10)
  await expect(page.getByRole('link', { name: 'Population' })).toBeVisible()
  await expect(page.getByText('Average annual income of inhabitants')).toBeVisible()

  const chartWrap = page.locator('.postal-history__chart-wrap')
  await expect(chartWrap).toBeVisible()
  expect(
    await chartWrap.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)
})

test('postal summary accessible name follows the selected language', async ({ page }) => {
  await mockPostalData(page)
  await page.goto('/vaasa-aluekartta/?postal=65280&lang=fa')

  await expect(page.getByRole('region', { name: 'نمای کلی آمار کد پستی' })).toBeVisible()
})
