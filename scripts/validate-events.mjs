import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateEventsSnapshot } from './lib/events-validation.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const eventPath = resolve(scriptDir, '../public/data/events.json')
const snapshot = JSON.parse(await readFile(eventPath, 'utf8'))
const summary = validateEventsSnapshot(snapshot)

console.log(`Validated ${summary.events} events with ${summary.occurrences} occurrences`)
