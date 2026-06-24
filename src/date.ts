import type { HistoricalDate } from './types'

export const MIN_YEAR = -4025
export const MAX_YEAR = 100

export function toAxisYear(date: HistoricalDate): number {
  return date.era === 'BCE' ? 1 - date.year : date.year
}

export function fromAxisYear(value: number): HistoricalDate {
  return value <= 0
    ? { year: 1 - Math.round(value), era: 'BCE' }
    : { year: Math.round(value), era: 'CE' }
}

export function formatDate(date?: HistoricalDate): string {
  if (!date) return 'Open-ended'
  if (date.original) return date.original
  const qualifiers = date.qualifiers ?? []
  const prefix =
    qualifiers.includes('after')
      ? 'After '
      : qualifiers.includes('before')
        ? 'Before '
        : ''
  const suffix = qualifiers.includes('approximate') ? '*' : ''
  const alternative =
    qualifiers.includes('alternative') && date.alternativeYear
      ? `/${date.alternativeYear}`
      : ''
  return `${prefix}${date.year}${alternative}${suffix} ${date.era}`
}

export function formatAxisYear(value: number): string {
  const date = fromAxisYear(value)
  return `${date.year} ${date.era}`
}

export function isUncertain(date?: HistoricalDate): boolean {
  return Boolean(
    date && date.qualifiers?.some((qualifier) => qualifier !== 'exact')
  )
}

export function dateSpan(item: {
  start?: HistoricalDate
  end?: HistoricalDate
  date?: HistoricalDate
}): [number, number] {
  if (item.date) {
    const point = toAxisYear(item.date)
    return [point, point]
  }
  const start = item.start ? toAxisYear(item.start) : MIN_YEAR
  const end = item.end ? toAxisYear(item.end) : MAX_YEAR
  return [Math.min(start, end), Math.max(start, end)]
}
