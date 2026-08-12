from pathlib import Path

# Keep this locator unambiguous because the search region and input intentionally share a label.
path = Path('e2e/core-journeys.spec.ts')
text = path.read_text()
old = "await page.getByLabel('Search address').fill('Test address')"
new = "await page.getByRole('searchbox', { name: 'Search address' }).fill('Test address')"
if old not in text:
    raise SystemExit('Expected address search selector not found')
path.write_text(text.replace(old, new, 1))
