#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  SOURCE_URL,
  parseChronologyHtml,
  toCsv,
  toDataset
} from './lib/jw-dates-parser.mjs'

function readArguments(argv) {
  const options = {
    html: '',
    outputDirectory: 'data',
    sourceUrl: SOURCE_URL
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--html') options.html = argv[++index]
    else if (argument === '--output-dir') {
      options.outputDirectory = argv[++index]
    } else if (argument === '--url') options.sourceUrl = argv[++index]
    else if (argument === '--help') options.help = true
    else throw new Error(`Unknown argument: ${argument}`)
  }

  return options
}

function printHelp() {
  console.log(`Usage:
  npm run data:extract:jw-dates
  npm run data:extract:jw-dates -- --html path/to/source.html
  npm run data:extract:jw-dates -- --output-dir data

By default, the command downloads the public Dates (Calendar) page. Pass
--html to regenerate deterministically from a previously saved page.`)
}

async function getHtml(options) {
  if (options.html) return readFile(resolve(options.html), 'utf8')

  const response = await fetch(options.sourceUrl)
  if (!response.ok) {
    throw new Error(
      `Could not download source (${response.status} ${response.statusText})`
    )
  }
  return response.text()
}

const options = readArguments(process.argv.slice(2))
if (options.help) {
  printHelp()
  process.exit(0)
}

const html = await getHtml(options)
const records = parseChronologyHtml(html, { sourceUrl: options.sourceUrl })
const dataset = toDataset(records)
const outputDirectory = resolve(options.outputDirectory)

await mkdir(outputDirectory, { recursive: true })
await Promise.all([
  writeFile(
    resolve(outputDirectory, 'jw-dates-calendar-bce.json'),
    `${JSON.stringify(dataset, null, 2)}\n`
  ),
  writeFile(
    resolve(outputDirectory, 'jw-dates-calendar-bce.csv'),
    toCsv(records)
  )
])

const counts = records.reduce(
  (result, record) => {
    result[record.rowType] += 1
    result[record.date.kind] += 1
    return result
  },
  { dated: 0, continuation: 0, point: 0, range: 0, alternative: 0 }
)

console.log(
  `Created ${records.length} BCE records in ${outputDirectory}\n` +
    `Rows: ${counts.dated} dated, ${counts.continuation} continuation\n` +
    `Dates: ${counts.point} point, ${counts.range} range, ` +
    `${counts.alternative} alternative`
)
