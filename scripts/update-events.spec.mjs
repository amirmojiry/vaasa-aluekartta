import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertReasonableEventCount,
  updateEventsSnapshot,
  writeSnapshotAtomically,
} from './update-events.mjs'

const temporaryDirectories = []

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'vaasa-events-'))
  temporaryDirectories.push(directory)
  return directory
}

function fakeXmlResponse(xml) {
  return async () => ({
    ok: true,
    status: 200,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'application/rss+xml; charset=utf-8' : null
      },
    },
    async text() {
      return xml
    },
  })
}

function eventItem(id, day) {
  return `<item>
    <guid isPermaLink="false">EventCalendar_${id}</guid>
    <link>https://events.osterbotten.fi/en/events/show/${id}</link>
    <title>Test event ${id}</title>
    <municipality>Vaasa</municipality>
    <event:dates-ext><event:date><event:start>${day} Sep 2026 10:00:00 +0300</event:start></event:date></event:dates-ext>
  </item>`
}

function smallRss() {
  return `<?xml version="1.0"?><rss version="2.0"><channel>
    ${eventItem(1, '01')}
    ${eventItem(2, '02')}
  </channel></rss>`
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe('event snapshot update safety', () => {
  it('rejects a suspicious source drop unless an operator explicitly reviewed it', () => {
    const existing = JSON.stringify({ events: Array.from({ length: 249 }, (_, index) => ({ id: index })) })

    expect(() => assertReasonableEventCount(2, existing)).toThrow(/dropped suspiciously from 249 to 2/)
    expect(() =>
      assertReasonableEventCount(2, existing, { allowSuspiciousDrop: true }),
    ).not.toThrow()
  })

  it('preserves the last snapshot when a valid but suspiciously small feed arrives', async () => {
    const directory = await temporaryDirectory()
    const outputFilePath = join(directory, 'events.json')
    const existing = `${JSON.stringify({ events: Array.from({ length: 249 }, () => ({})) }, null, 2)}\n`
    await writeFile(outputFilePath, existing, 'utf8')

    await expect(
      updateEventsSnapshot({ fetchImpl: fakeXmlResponse(smallRss()), outputFilePath }),
    ).rejects.toThrow(/dropped suspiciously from 249 to 2/)
    await expect(readFile(outputFilePath, 'utf8')).resolves.toBe(existing)
  })

  it('replaces snapshots atomically through a sibling temporary file', async () => {
    const directory = await temporaryDirectory()
    const outputFilePath = join(directory, 'events.json')
    await writeFile(outputFilePath, 'old\n', 'utf8')

    await writeSnapshotAtomically(outputFilePath, 'new\n')

    await expect(readFile(outputFilePath, 'utf8')).resolves.toBe('new\n')
    expect((await readdir(directory)).filter((name) => name.endsWith('.tmp'))).toEqual([])
  })
})
