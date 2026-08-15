import { expect, test, type Page } from '@playwright/test'

const majorBoundary = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        slug: 'keskusta',
        name: 'Keskusta',
        name_fi: 'Keskusta',
        name_en: 'City centre',
        ref: '01',
        level: 'suuralue',
        admin_level: 9,
        osm_relation_id: 11930886,
        outer_way_ids: [],
        source: 'Playwright fixture',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [21.6, 63.08],
            [21.64, 63.08],
            [21.64, 63.11],
            [21.6, 63.11],
            [21.6, 63.08],
          ],
        ],
      },
    },
  ],
}

const minorBoundary = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Keskusta 1',
        name_fi: 'Keskusta 1',
        name_en: 'City centre 1',
        ref: '011',
        level: 'pienalue',
        admin_level: 10,
        osm_relation_id: 11930883,
        outer_way_ids: [],
        source: 'Playwright fixture',
        parent_slug: 'keskusta',
        parent_name: 'Keskusta',
        parent_name_fi: 'Keskusta',
        parent_name_en: 'City centre',
        parent_ref: '01',
        parent_osm_relation_id: 11930886,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [21.61, 63.09],
            [21.63, 63.09],
            [21.63, 63.1],
            [21.61, 63.1],
            [21.61, 63.09],
          ],
        ],
      },
    },
  ],
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
      id: '65100',
      properties: {
        code: '65100',
        name_fi: 'Vaasa Keskusta',
        name_sv: 'Vasa centrum',
        statistics_year: 2024,
        population: 1000,
        employed: 500,
        unemployed: 50,
        students: 100,
        average_income: 32000,
        employed_share: 50,
        unemployed_share: 5,
        student_share: 10,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [21.6, 63.08],
            [21.64, 63.08],
            [21.64, 63.11],
            [21.6, 63.11],
            [21.6, 63.08],
          ],
        ],
      },
    },
  ],
}

async function mockMapData(page: Page): Promise<void> {
  await page.route('**/data/vaasa-suuralueet.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(majorBoundary),
    }),
  )
  await page.route('**/data/vaasa-pienalueet.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(minorBoundary),
    }),
  )
  await page.route('**/data/paavo-postal-areas.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(postalBoundary),
    }),
  )
  await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/, (route) => route.abort())
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort())
}

test.beforeEach(async ({ page }) => {
  await mockMapData(page)
})

test('loads from the GitHub Pages base path and preserves boundary level in browser history', async ({
  page,
}) => {
  await page.goto('/vaasa-aluekartta/?lang=en')
  await expect(page.getByRole('heading', { name: 'Statistical areas' })).toBeVisible()

  const minorButton = page.getByRole('button', { name: /Minor areas/ })
  await minorButton.click()
  await expect(minorButton).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/level=pienalue/)

  await page.goBack()
  await expect(page.getByRole('button', { name: /Major areas/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('finds an address and offers major, minor, and postal destinations', async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/search**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ display_name: 'Test address, Vaasa', lat: '63.095', lon: '21.620' }]),
    }),
  )

  await page.goto('/vaasa-aluekartta/?lang=en')
  await page.getByRole('searchbox', { name: 'Search address' }).fill('Test address')
  await page.getByRole('button', { name: 'Search' }).click()

  const majorLink = page.getByRole('link', { name: /Major area.*City centre/i })
  const minorLink = page.getByRole('link', { name: /Minor area.*City centre 1/i })
  const postalLink = page.getByRole('link', { name: /Postal code area.*65100/i })
  await expect(majorLink).toBeVisible()
  await expect(minorLink).toBeVisible()
  await expect(postalLink).toBeVisible()

  await minorLink.click()
  await expect(page).toHaveURL(/pienalue=11930883/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('City centre 1')
})

test('restores a shared major-area URL', async ({ page }) => {
  await page.goto('/vaasa-aluekartta/?area=keskusta&lang=en')
  await expect(page).toHaveURL(/area=keskusta/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('City centre')
})

test('keeps the primary journey usable at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/vaasa-aluekartta/?lang=en')

  const searchButton = page.getByRole('button', { name: 'Search' })
  const minorButton = page.getByRole('button', { name: /Minor areas/ })
  const searchBox = await searchButton.boundingBox()
  const minorBox = await minorButton.boundingBox()

  expect(searchBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(minorBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)

  await minorButton.click()
  await expect(page).toHaveURL(/level=pienalue/)
})
