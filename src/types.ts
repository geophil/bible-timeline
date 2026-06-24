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
  section: 1 | 2 | 3
  url: string
}

export interface Relationship {
  personId: string
  type: string
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
  periodId?: string
  scriptureReferences: string[]
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
  schemaVersion: 1
  exportedAt?: string
  items: TimelineItem[]
}

export interface TimelineFilters {
  query: string
  types: ItemType[]
  sections: number[]
  periodId: string
  certainty: 'all' | 'exact' | 'uncertain'
  tag: string
}
