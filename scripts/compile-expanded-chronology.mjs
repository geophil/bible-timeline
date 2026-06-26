#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'data/jw-dates-calendar-bce.json')
const manifestPath = resolve(root, 'data/expanded-chronology-manifest.json')
const outputPath = resolve(root, 'src/data/expanded-chronology.json')
const reportPath = resolve(root, 'data/expanded-chronology-report.json')
const TITLE_LIMIT = 48

const [dataset, manifest] = await Promise.all([
  readFile(sourcePath, 'utf8').then(JSON.parse),
  readFile(manifestPath, 'utf8').then(JSON.parse)
])

const source = {
  id: 'jw-dates-calendar',
  label: 'Dates (Calendar)',
  url: dataset.source.url,
  locator: dataset.source.paragraphRange.first
}

const normalizeSpace = (value) => value.replace(/\s+/g, ' ').trim()
const sourceRef = (record) => ({
  ...source,
  url: record.sourceUrl,
  locator: record.sourceParagraph
})

function stripTitleDetails(value) {
  let title = normalizeSpace(value)
    .replace(/\s*\(age\s+[^)]*\)/gi, '')
    .replace(/\s*\((?:January|February|March|April|May|June|July|August|September|October|November|December)[^)]*\)/gi, '')
    .replace(/^(?:spring|fall|autumn|winter),\s*/i, '')
    .replace(/^(?:Nisan|Iyyar|Sivan|Tammuz|Ab|Elul|Ethanim|Bul|Chislev|Tebeth|Shebat|Adar)(?:\s+\d+)?(?:\s*\([^)]*\))?,\s*/i, '')
    .replace(/^40 days later(?:\s*\([^)]*\))?,\s*/i, '')
    .replace(/\bfirst regnal year as\b/gi, 'first year as')
    .replace(/\bbegins to\b/gi, 'begins ')
    .replace(/\s+for (?:one month|seven days|3 months)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (title.includes(';')) title = title.split(';')[0].trim()
  return title.charAt(0).toUpperCase() + title.slice(1)
}

function compileTitle(record) {
  return manifest.titleOverrides[record.sourceParagraph] ??
    stripTitleDetails(record.description)
}

function compileEndpoint(endpoint, extraQualifiers = []) {
  const qualifiers = [
    ...(endpoint.qualifier === 'exact' ? [] : [endpoint.qualifier]),
    ...extraQualifiers
  ]
  return {
    year: endpoint.year,
    era: endpoint.era,
    qualifiers,
    original: `${endpoint.original} B.C.E.`
  }
}

function compileDate(date) {
  if (date.kind === 'point') {
    return { date: compileEndpoint(date.date) }
  }
  if (date.kind === 'range') {
    return {
      date: compileEndpoint(date.start),
      endDate: compileEndpoint(date.end)
    }
  }
  const [first, second] = date.alternatives
  return {
    date: {
      ...compileEndpoint(first, ['alternative']),
      alternativeYear: second.year,
      original: `${date.original} B.C.E.`
    }
  }
}

function periodFor(date) {
  const endpoint =
    date.kind === 'point'
      ? date.date
      : date.kind === 'range'
        ? date.start
        : date.alternatives[0]
  const year = endpoint.year
  if (year >= 2370) return 'period-pre-flood'
  if (year >= 1473) return 'period-post-flood'
  if (year >= 1117) return 'period-judges'
  if (year >= 997) return 'period-united-kingdom'
  if (year >= 607) return 'period-divided-kingdom'
  if (year >= 537) return 'period-babylonian-exile'
  return 'period-postexilic'
}

const errors = []
const seenTitles = new Map()
const events = []
const enrichments = []
const resolutions = []

for (const record of dataset.records) {
  const title = compileTitle(record)
  const date = compileDate(record.date)
  const targets = manifest.enrichments[record.sourceParagraph]
  const detail = {
    id: record.id,
    title,
    ...date,
    source: sourceRef(record),
    scriptureReferences: record.scriptureReferences,
    publicationReferences: record.publicationReferences,
    tags: record.categories
  }

  if (!title) errors.push(`${record.sourceParagraph}: empty title`)
  if (title.length > TITLE_LIMIT) {
    errors.push(
      `${record.sourceParagraph}: title is ${title.length} characters: ${title}`
    )
  }

  const dateKey = `${record.date.original}:${title.toLowerCase()}`
  const duplicate = seenTitles.get(dateKey)
  if (duplicate) {
    errors.push(
      `${record.sourceParagraph}: duplicates title/date from ${duplicate}: ${title}`
    )
  } else {
    seenTitles.set(dateKey, record.sourceParagraph)
  }

  if (targets) {
    enrichments.push({ ...detail, targetItemIds: targets })
    resolutions.push({
      sourceParagraph: record.sourceParagraph,
      resolution: 'enrichment',
      targetItemIds: targets
    })
  } else {
    events.push({
      id: `chronology-${record.sourceParagraph}`,
      type: 'event',
      name: title,
      ...date,
      description: undefined,
      tags: record.categories,
      sources: [sourceRef(record)],
      aliases: [],
      scriptureReferences: record.scriptureReferences,
      publicationReferences: record.publicationReferences,
      relatedPersonIds: [],
      periodId: periodFor(record.date),
      importance: 'secondary',
      provenance: {
        datasetId: 'jw-dates-calendar-bce',
        sourceRecordId: record.id,
        sourceParagraph: record.sourceParagraph,
        dateSourceParagraph: record.dateSourceParagraph,
        rowType: record.rowType,
        immutable: true
      }
    })
    resolutions.push({
      sourceParagraph: record.sourceParagraph,
      resolution: 'event',
      eventId: `chronology-${record.sourceParagraph}`
    })
  }
}

for (const paragraph of manifest.likelyDuplicateParagraphs) {
  if (!manifest.enrichments[paragraph]) {
    errors.push(`${paragraph}: likely duplicate is not mapped`)
  }
}

const sourceParagraphs = new Set(dataset.records.map((record) => record.sourceParagraph))
for (const paragraph of Object.keys(manifest.enrichments)) {
  if (!sourceParagraphs.has(paragraph)) {
    errors.push(`${paragraph}: enrichment mapping has no source record`)
  }
}

if (resolutions.length !== dataset.records.length) {
  errors.push(
    `Resolved ${resolutions.length} of ${dataset.records.length} source records`
  )
}

const bundle = {
  schemaVersion: 1,
  datasetId: 'jw-dates-calendar-bce',
  generatedAt: dataset.generatedAt,
  source,
  sourceRecordCount: dataset.records.length,
  events,
  enrichments
}

const report = {
  generatedAt: dataset.generatedAt,
  sourceRecordCount: dataset.records.length,
  eventCount: events.length,
  enrichmentCount: enrichments.length,
  titleLimit: TITLE_LIMIT,
  errors,
  resolutions
}

await mkdir(dirname(outputPath), { recursive: true })
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
])

if (errors.length) {
  console.error(`Chronology compilation failed with ${errors.length} error(s):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `Compiled ${dataset.records.length} records into ${events.length} events ` +
      `and ${enrichments.length} enrichments.`
  )
}
