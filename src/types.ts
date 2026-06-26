export type Era = 'BCE' | 'CE'
export type DateQualifier =
  | 'exact'
  | 'approximate'
  | 'after'
  | 'before'
  | 'alternative'
  | 'transition'

export interface HistoricalDate {
  year: number
  era: Era
  qualifiers?: DateQualifier[]
  alternativeYear?: number
  original?: string
}

export type ItemType = 'person' | 'event' | 'period' | 'power'

export interface SourceRef {
  id?: string
  label?: string
  url: string
  section?: 1 | 2 | 3
  locator?: string
}

export interface Relationship {
  personId: string
  type: string
}

export interface ChronologyProvenance {
  datasetId: 'jw-dates-calendar-bce'
  sourceRecordId: string
  sourceParagraph: string
  dateSourceParagraph: string
  rowType: 'dated' | 'continuation'
  immutable: true
}

export interface ChronologyDetail {
  id: string
  title: string
  date: HistoricalDate
  endDate?: HistoricalDate
  source: SourceRef
  scriptureReferences: string[]
  publicationReferences: string[]
  tags: string[]
}

export interface BaseItem {
  id: string
  type: ItemType
  name: string
  description?: string
  notes?: string
  tags: string[]
  color?: string
  image?: string
  sources: SourceRef[]
  aliases?: string[]
  expandedChronology?: ChronologyDetail[]
}

export interface Person extends BaseItem {
  type: 'person'
  start: HistoricalDate
  end: HistoricalDate
  periodId?: string
  consolidatedGroup?: string
  scriptureReferences: string[]
  relationships: Relationship[]
}

export interface TimelineEvent extends BaseItem {
  type: 'event'
  date: HistoricalDate
  endDate?: HistoricalDate
  periodId?: string
  scriptureReferences: string[]
  publicationReferences?: string[]
  relatedPersonIds?: string[]
  importance?: 'major' | 'secondary'
  provenance?: ChronologyProvenance
}

export interface Period extends BaseItem {
  type: 'period'
  start: HistoricalDate
  end?: HistoricalDate
}

export interface WorldPower extends BaseItem {
  type: 'power'
  start: HistoricalDate
  end?: HistoricalDate
}

export type TimelineItem = Person | TimelineEvent | Period | WorldPower

export interface TimelineDataset {
  schemaVersion: 2
  exportedAt?: string
  items: TimelineItem[]
}

export interface ChronologyEnrichment extends ChronologyDetail {
  targetItemIds: string[]
}

export interface ExpandedChronologyBundle {
  schemaVersion: 1
  datasetId: 'jw-dates-calendar-bce'
  generatedAt: string
  source: SourceRef
  sourceRecordCount: number
  events: TimelineEvent[]
  enrichments: ChronologyEnrichment[]
}

export interface TimelineFilters {
  query: string
  types: ItemType[]
  sections: number[]
  periodId: string
  certainty: 'all' | 'exact' | 'uncertain'
  tag: string
}
