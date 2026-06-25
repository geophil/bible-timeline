import { JSDOM } from 'jsdom'

export const SOURCE_DOCUMENT_ID = '1200271562'
export const SOURCE_URL =
  'https://wol.jw.org/en/wol/d/r1/lp-e/1200271562#h=68'
export const BCE_FIRST_PARAGRAPH = 69
export const BCE_LAST_PARAGRAPH = 498

const QUALIFIERS = {
  'a.': 'after',
  'b.': 'before',
  'c.': 'approximate'
}

const normalizeSpace = (value) =>
  value
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeQualifier = (value = '') =>
  value.toLowerCase().replace(/\s/g, '')

export function parseDateEndpoint(value) {
  const normalized = normalizeSpace(value)
  const match = normalized.match(/^(?:(a\.|b\.|c\.)\s*)?(\d{1,4})$/i)

  if (!match) {
    throw new Error(`Unsupported date endpoint: "${value}"`)
  }

  const qualifier = QUALIFIERS[normalizeQualifier(match[1])]
  return {
    year: Number(match[2]),
    era: 'BCE',
    qualifier: qualifier ?? 'exact',
    original: normalized
  }
}

export function parseDateExpression(value) {
  const original = normalizeSpace(value)

  const alternativeParts = original.split(/\s+or\s+/i)
  if (alternativeParts.length === 2) {
    return {
      kind: 'alternative',
      original,
      alternatives: alternativeParts.map(parseDateEndpoint)
    }
  }

  const rangeParts = original.split(/\s*[–-]\s*/)
  if (rangeParts.length === 2) {
    return {
      kind: 'range',
      original,
      start: parseDateEndpoint(rangeParts[0]),
      end: parseDateEndpoint(rangeParts[1])
    }
  }

  return {
    kind: 'point',
    original,
    date: parseDateEndpoint(original)
  }
}

function deriveCategories(description) {
  const categories = []
  const tests = [
    ['birth', /\b(?:born|birth)\b/i],
    ['death', /\b(?:dies|died|death|transferred)\b/i],
    ['writing', /\b(?:written|writing completed|compiled|translation .* begun)\b/i],
    ['rulership', /\b(?:king|emperor|ruler|reign|regnal|governor)\b/i],
    ['world-power', /\bworld power\b/i],
    ['covenant', /\bcovenant\b/i],
    ['warfare', /\b(?:battle|war|defeat|conquer|siege|destroy|invasion)\w*\b/i],
    ['prophecy', /\b(?:prophes|vision|foretell)\w*\b/i],
    ['temple', /\btemple\b/i],
    ['travel', /\b(?:enters?|returns?|crosses|leaves?|flees|journey|arrives?)\b/i]
  ]

  for (const [category, pattern] of tests) {
    if (pattern.test(description)) categories.push(category)
  }

  return categories.length ? categories : ['other']
}

function suggestedType(categories) {
  if (categories.includes('birth') || categories.includes('death')) {
    return 'person-boundary'
  }
  if (categories.includes('world-power')) return 'world-power-transition'
  return 'event'
}

function paragraphNumber(element) {
  return Number(element.id.replace(/^p/, ''))
}

function removeSourceReferences(text, publicationReferences) {
  if (!publicationReferences.length) return normalizeSpace(text)

  const firstReference = publicationReferences[0]
  const marker = `: ${firstReference}`
  const markerIndex = text.lastIndexOf(marker)
  return normalizeSpace(markerIndex >= 0 ? text.slice(0, markerIndex) : text)
}

function removeScriptureParenthetical(text, scriptureReferences) {
  if (!scriptureReferences.length) return text

  const match = text.match(/\s*\(([^()]*)\)\s*$/)
  if (!match) return text

  const parenthetical = normalizeSpace(match[1])
  const includesScripture = scriptureReferences.some((reference) =>
    parenthetical.includes(reference)
  )

  return includesScripture
    ? normalizeSpace(text.slice(0, match.index))
    : text
}

function splitExplicitDate(text) {
  const commaIndex = text.indexOf(',')
  if (commaIndex < 1) {
    throw new Error(`Dated row has no date separator: "${text}"`)
  }

  return {
    expression: normalizeSpace(text.slice(0, commaIndex)),
    remainder: normalizeSpace(text.slice(commaIndex + 1))
  }
}

export function parseChronologyHtml(html, options = {}) {
  const {
    sourceUrl = SOURCE_URL,
    firstParagraph = BCE_FIRST_PARAGRAPH,
    lastParagraph = BCE_LAST_PARAGRAPH
  } = options
  const dom = new JSDOM(html)
  const { document } = dom.window
  const elements = [...document.querySelectorAll('p[id^="p"]')]
    .filter((element) => {
      const number = paragraphNumber(element)
      return number >= firstParagraph && number <= lastParagraph
    })
    .sort((a, b) => paragraphNumber(a) - paragraphNumber(b))

  const records = []
  let currentDate = null
  let currentDateParagraph = null

  for (const element of elements) {
    const paragraph = paragraphNumber(element)
    const classes = element.className.split(/\s+/)
    const isExplicitDate = classes.includes('sx')
    const isContinuation = classes.includes('sy')

    if (!isExplicitDate && !isContinuation) continue

    const fullText = normalizeSpace(element.textContent ?? '')
    const scriptureReferences = [...element.querySelectorAll('a.b')]
      .map((anchor) => normalizeSpace(anchor.textContent ?? ''))
      .filter(Boolean)
    const publicationReferences = [
      ...element.querySelectorAll('a:not(.b)')
    ]
      .map((anchor) => normalizeSpace(anchor.textContent ?? ''))
      .filter(Boolean)

    let descriptionWithScripture
    let dateExpression = currentDate?.original

    if (isExplicitDate) {
      const split = splitExplicitDate(fullText)
      currentDate = parseDateExpression(split.expression)
      currentDateParagraph = paragraph
      dateExpression = split.expression
      descriptionWithScripture = removeSourceReferences(
        split.remainder,
        publicationReferences
      )
    } else {
      if (!currentDate || !currentDateParagraph) {
        throw new Error(
          `Continuation paragraph p${paragraph} has no preceding date`
        )
      }
      descriptionWithScripture = removeSourceReferences(
        fullText,
        publicationReferences
      )
    }

    const description = removeScriptureParenthetical(
      descriptionWithScripture,
      scriptureReferences
    )
    const categories = deriveCategories(description)

    records.push({
      id: `jw-dates-calendar-p${paragraph}`,
      sequence: records.length + 1,
      sourceParagraph: `p${paragraph}`,
      sourceUrl: `${sourceUrl.replace(/#.*$/, '')}#h=${paragraph}`,
      rowType: isExplicitDate ? 'dated' : 'continuation',
      dateSourceParagraph: `p${currentDateParagraph}`,
      dateExpression,
      date: structuredClone(currentDate),
      description,
      scriptureReferences,
      publicationReferences,
      categories,
      suggestedType: suggestedType(categories)
    })
  }

  return records
}

export function toDataset(records, generatedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    datasetId: 'jw-dates-calendar-bce',
    title: 'Dates (Calendar) — BCE chronology',
    description:
      'Standalone review dataset parsed from the BCE section of the cited source. It is not imported into the Bible Timeline application.',
    generatedAt,
    source: {
      documentId: SOURCE_DOCUMENT_ID,
      title: 'Dates (Calendar)',
      url: SOURCE_URL,
      era: 'BCE',
      paragraphRange: {
        first: `p${BCE_FIRST_PARAGRAPH}`,
        last: `p${BCE_LAST_PARAGRAPH}`
      }
    },
    records
  }
}

const csvEscape = (value) => {
  const text =
    value === undefined || value === null
      ? ''
      : typeof value === 'string'
        ? value
        : JSON.stringify(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(records) {
  const columns = [
    'id',
    'sequence',
    'sourceParagraph',
    'sourceUrl',
    'rowType',
    'dateSourceParagraph',
    'dateExpression',
    'dateKind',
    'startYear',
    'startQualifier',
    'endYear',
    'endQualifier',
    'alternativeYears',
    'description',
    'scriptureReferences',
    'publicationReferences',
    'categories',
    'suggestedType'
  ]

  const rows = records.map((record) => {
    const date = record.date
    const start =
      date.kind === 'point'
        ? date.date
        : date.kind === 'range'
          ? date.start
          : date.alternatives[0]
    const end = date.kind === 'range' ? date.end : undefined
    const alternativeYears =
      date.kind === 'alternative'
        ? date.alternatives.map((item) => item.year).join('|')
        : ''

    return [
      record.id,
      record.sequence,
      record.sourceParagraph,
      record.sourceUrl,
      record.rowType,
      record.dateSourceParagraph,
      record.dateExpression,
      date.kind,
      start.year,
      start.qualifier,
      end?.year,
      end?.qualifier,
      alternativeYears,
      record.description,
      record.scriptureReferences.join(' | '),
      record.publicationReferences.join(' | '),
      record.categories.join(' | '),
      record.suggestedType
    ]
      .map(csvEscape)
      .join(',')
  })

  return [columns.map(csvEscape).join(','), ...rows].join('\n') + '\n'
}
