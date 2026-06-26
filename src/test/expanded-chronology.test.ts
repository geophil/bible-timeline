import { describe, expect, it } from 'vitest'
import bundleJson from '../data/expanded-chronology.json'
import sourceDataset from '../../data/jw-dates-calendar-bce.json'
import {
  applyChronologyEnrichments,
  duplicateChronologyEvent
} from '../chronology'
import { parseBackup } from '../backup'
import { dateSpan } from '../date'
import { filterItems } from '../filter'
import { expandedChronologyBundleSchema } from '../schema'
import { starterDataset } from '../seed'
import type { TimelineFilters } from '../types'

const bundle = expandedChronologyBundleSchema.parse(bundleJson)

const filters: TimelineFilters = {
  query: '',
  types: [],
  sections: [],
  periodId: '',
  certainty: 'all',
  tag: ''
}

describe('expanded chronology compilation', () => {
  it('resolves every source paragraph exactly once', () => {
    const resolutionIds = [
      ...bundle.events.map((event) => event.provenance!.sourceParagraph),
      ...bundle.enrichments.map((enrichment) =>
        enrichment.source.locator!
      )
    ]
    expect(bundle.sourceRecordCount).toBe(430)
    expect(bundle.sourceRecordCount).toBe(sourceDataset.records.length)
    expect(resolutionIds).toHaveLength(430)
    expect(new Set(resolutionIds).size).toBe(430)
  })

  it('uses short unique titles and valid enrichment targets', () => {
    const titles = [
      ...bundle.events.map((event) => event.name),
      ...bundle.enrichments.map((enrichment) => enrichment.title)
    ]
    expect(Math.max(...titles.map((title) => title.length))).toBeLessThanOrEqual(
      48
    )

    const starterIds = new Set(starterDataset.items.map((item) => item.id))
    const targets = bundle.enrichments.flatMap(
      (enrichment) => enrichment.targetItemIds
    )
    expect(targets.every((target) => starterIds.has(target))).toBe(true)
  })

  it('keeps distinct same-year events while suppressing mapped duplicates', () => {
    const at1943 = bundle.events.filter((event) => event.date.year === 1943)
    expect(at1943.map((event) => event.name)).toContain(
      'Abraham crosses Euphrates'
    )
    expect(at1943.map((event) => event.name)).toContain(
      '430-year period begins'
    )
    expect(at1943.map((event) => event.name)).not.toContain(
      'Abrahamic covenant takes effect'
    )
  })

  it('maps lifespan, period, event, and world-power duplicates explicitly', () => {
    const targets = new Map(
      bundle.enrichments.map((enrichment) => [
        enrichment.source.locator,
        enrichment.targetItemIds
      ])
    )
    expect(targets.get('p76')).toEqual(['person-adam'])
    expect(targets.get('p92')).toEqual(['period-post-flood'])
    expect(targets.get('p100')).toEqual(['event-abrahamic-covenant'])
    expect(targets.get('p150')).toEqual(['power-egypt'])
  })
})

describe('expanded chronology runtime integration', () => {
  it('enriches existing items without adding duplicate search results', () => {
    const enriched = applyChronologyEnrichments(
      starterDataset.items,
      bundle
    )
    const combined = [...enriched, ...bundle.events]
    const result = filterItems(combined, {
      ...filters,
      query: 'Abrahamic covenant takes effect'
    })

    expect(result.map((item) => item.id)).toEqual([
      'event-abrahamic-covenant'
    ])
    expect(result[0].expandedChronology).toHaveLength(1)
  })

  it('duplicates immutable ranged events as editable local events', () => {
    const ranged = bundle.events.find((event) => event.endDate)
    expect(ranged).toBeDefined()
    const duplicate = duplicateChronologyEvent(ranged!)
    expect(duplicate.id).not.toBe(ranged!.id)
    expect(duplicate.provenance).toBeUndefined()
    expect(duplicate.endDate).toEqual(ranged!.endDate)
    expect(dateSpan(duplicate)).toEqual(dateSpan(ranged!))
  })

  it('migrates version-one backups to schema version two', () => {
    const legacy = {
      schemaVersion: 1,
      items: starterDataset.items.map((item) => ({
        ...item,
        sources: item.sources.map(({ section, url }) => ({ section, url }))
      }))
    }
    const migrated = parseBackup(legacy)
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.items).toHaveLength(starterDataset.items.length)
  })
})
