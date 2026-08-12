import { readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const KiB = 1024
const MiB = 1024 * KiB
const budgets = {
  javascript: 800 * KiB,
  css: 250 * KiB,
  largestData: 5 * MiB,
  dataTotal: 12 * MiB,
  distTotal: 15 * MiB,
}

async function filesUnder(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...(await filesUnder(absolute)))
    else if (entry.isFile()) files.push({ path: absolute, size: (await stat(absolute)).size })
  }
  return files
}

function bytes(value) {
  if (value >= MiB) return `${(value / MiB).toFixed(2)} MiB`
  return `${(value / KiB).toFixed(1)} KiB`
}

const files = await filesUnder('dist')
const js = files
  .filter((file) => file.path.endsWith('.js'))
  .reduce((sum, file) => sum + file.size, 0)
const css = files
  .filter((file) => file.path.endsWith('.css'))
  .reduce((sum, file) => sum + file.size, 0)
const dataFiles = files.filter((file) => file.path.includes(`${path.sep}data${path.sep}`))
const dataTotal = dataFiles.reduce((sum, file) => sum + file.size, 0)
const largestData = dataFiles.reduce(
  (largest, file) => (file.size > largest.size ? file : largest),
  { path: 'none', size: 0 },
)
const distTotal = files.reduce((sum, file) => sum + file.size, 0)

const rows = [
  ['JavaScript', js, budgets.javascript],
  ['CSS', css, budgets.css],
  ['Largest data file', largestData.size, budgets.largestData],
  ['All data files', dataTotal, budgets.dataTotal],
  ['Full dist', distTotal, budgets.distTotal],
]

console.log('Performance and map-data audit')
for (const [label, value, budget] of rows)
  console.log(`${label}: ${bytes(value)} / budget ${bytes(budget)}`)
console.log(`Largest data file: ${largestData.path}`)

const violations = rows.filter(([, value, budget]) => value > budget)
if (violations.length) {
  for (const [label, value, budget] of violations)
    console.error(`${label} exceeds budget: ${bytes(value)} > ${bytes(budget)}`)
  process.exitCode = 1
}

if (process.argv.includes('--write-report')) {
  const generated = new Date().toISOString().slice(0, 10)
  const table = rows
    .map(([label, value, budget]) => `| ${label} | ${bytes(value)} | ${bytes(budget)} |`)
    .join('\n')
  const report = `# Performance audit\n\nBaseline generated ${generated} from a production build after refreshing the local OSM boundary snapshots. Budgets are conservative regression guards, not claims about network transfer size after HTTP compression.\n\n| Measure | Current build | Budget |\n| --- | ---: | ---: |\n${table}\n\nLargest data file: \`${largestData.path.replaceAll('\\', '/')}\`.\n\nThe audit is run in CI and during GitHub Pages deployment via \`npm run performance:check\`. The deployment run is the authoritative map-data check because it regenerates current boundary snapshots before building.\n`
  await writeFile('docs/performance-audit.md', report)
}
