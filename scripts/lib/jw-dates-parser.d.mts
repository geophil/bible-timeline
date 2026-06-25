export type DateQualifier = 'exact' | 'approximate' | 'after' | 'before'

export interface DateEndpoint {
  year: number
  era: 'BCE'
  qualifier: DateQualifier
  original: string
}

export type ParsedDate =
  | {
      kind: 'point'
      original: string
      date: DateEndpoint
    }
  | {
      kind: 'range'
      original: string
      start: DateEndpoint
      end: DateEndpoint
    }
  | {
      kind: 'alternative'
      original: string
      alternatives: DateEndpoint[]
    }

export interface ChronologyRecord {
  id: string
  sequence: number
  sourceParagraph: string
  sourceUrl: string
  rowType: 'dated' | 'continuation'
  dateSourceParagraph: string
  dateExpression: string
  date: ParsedDate
  description: string
  scriptureReferences: string[]
  publicationReferences: string[]
  categories: string[]
  suggestedType: 'event' | 'person-boundary' | 'world-power-transition'
}

export function parseDateEndpoint(value: string): DateEndpoint
export function parseDateExpression(value: string): ParsedDate
export function parseChronologyHtml(
  html: string,
  options?: {
    sourceUrl?: string
    firstParagraph?: number
    lastParagraph?: number
  }
): ChronologyRecord[]
export function toDataset(
  records: ChronologyRecord[],
  generatedAt?: string
): Record<string, unknown>
export function toCsv(records: ChronologyRecord[]): string
