import { expect, test, type Page } from '@playwright/test'

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
  years: [2024],
  areas: {
    '65280': [
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

const poiCollection = {
  type: 'FeatureCollection',
  source: {
    label: 'OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
    licence: 'ODbL',
  },
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [21.6, 63.15] },
      properties: {
        id: 'node/1',
        category: 'cafes',
        name: 'Inside postal cafe',
        osmType: 'node',
        osmId: 1,
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [21.75, 63.15] },
      properties: {
        id: 'node/2',
        category: 'cafes',
        name: 'Outside postal cafe',
        osmType: 'node',
        osmId: 2,
      },
    },
  ],
}

async function mockPostalData(page: Page): Promise<void> {
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
  await page.route('**/data/vaasa-pois.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(poiCollection),
    }),
  )
  await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/, (route) => route.abort())
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort())
}

test('party Wikipedia stays on the dedicated page and follows the active language', async ({
  page,
}) => {
  await page.goto('/vaasa-aluekartta/?area=keskusta&lang=en')

  const partyButton = page.locator('.election-legend__party').filter({ hasText: 'KOK' }).first()
  await expect(partyButton).toBeVisible()
  await partyButton.click()

  const context = page.locator('.election-chart-party-context').first()
  await expect(context).toBeVisible()
  await expect(context.locator('a[href*="wikipedia.org"]')).toHaveCount(0)
  await expect(context.locator('a[href*="party=KOK"]')).toBeVisible()

  await page.goto('/vaasa-aluekartta/?party=KOK&lang=fa')
  const wikipedia = page.locator('.party-page__profile a[href*="wikipedia.org"]')
  await expect(wikipedia).toHaveCount(1)
  await expect(wikipedia).toHaveAttribute('href', /^https:\/\/fa\.wikipedia\.org\//)
})

test('postal POIs can switch between postal-only and all Vaasa places', async ({ page }) => {
  await mockPostalData(page)
  await page.goto('/vaasa-aluekartta/?postal=65280&lang=en')

  const control = page.locator('.poi-control--area')
  await control.locator('summary').click()
  await control.getByRole('button', { name: 'Show all', exact: true }).click()

  const list = page.locator('.poi-list')
  await expect(list).toContainText('Inside postal cafe')
  await expect(list).not.toContainText('Outside postal cafe')
  await expect(control.getByRole('button', { name: 'Show postal-area places' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await control.getByRole('button', { name: 'Show all Vaasa places' }).click()
  await expect(list).toContainText('Inside postal cafe')
  await expect(list).toContainText('Outside postal cafe')
  await expect(control.getByRole('button', { name: 'Show all Vaasa places' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await control.getByRole('button', { name: 'Show postal-area places' }).click()
  await expect(list).not.toContainText('Outside postal cafe')
})
