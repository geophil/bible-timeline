import type {
  ChronologyDetail,
  ExpandedChronologyBundle,
  SourceRef,
  TimelineEvent,
  TimelineItem
} from './types'
import { expandedChronologyBundleSchema } from './schema'

export const EXPANDED_CHRONOLOGY_STORAGE_KEY =
  'bible-timeline-expanded-chronology'

export async function loadExpandedChronology() {
  const module = await import('./data/expanded-chronology.json')
  return expandedChronologyBundleSchema.parse(
    module.default
  ) as ExpandedChronologyBundle
}

const sourceKey = (source: SourceRef) =>
  `${source.id ?? ''}:${source.url}:${source.locator ?? ''}`

export function applyChronologyEnrichments(
  items: TimelineItem[],
  bundle: ExpandedChronologyBundle
) {
  const byTarget = new Map<string, ChronologyDetail[]>()
  for (const enrichment of bundle.enrichments) {
    for (const targetId of enrichment.targetItemIds) {
      const details = byTarget.get(targetId) ?? []
      details.push(enrichment)
      byTarget.set(targetId, details)
    }
  }

  return items.map((item) => {
    const details = byTarget.get(item.id)
    if (!details?.length) return item

    const sources = new Map(item.sources.map((source) => [sourceKey(source), source]))
    details.forEach((detail) =>
      sources.set(sourceKey(detail.source), detail.source)
    )
    const aliases = new Set(item.aliases ?? [])
    details.forEach((detail) => aliases.add(detail.title))

    const expanded: TimelineItem = {
      ...item,
      sources: [...sources.values()],
      aliases: [...aliases],
      expandedChronology: details
    }
    if ('scriptureReferences' in expanded) {
      expanded.scriptureReferences = [
        ...new Set([
          ...expanded.scriptureReferences,
          ...details.flatMap((detail) => detail.scriptureReferences)
        ])
      ]
    }
    return expanded
  })
}

export function duplicateChronologyEvent(event: TimelineEvent): TimelineEvent {
  return {
    ...event,
    id: crypto.randomUUID(),
    name: event.name,
    importance: 'major',
    provenance: undefined,
    aliases: event.aliases ? [...event.aliases] : [],
    relatedPersonIds: event.relatedPersonIds
      ? [...event.relatedPersonIds]
      : [],
    sources: event.sources.map((source) => ({ ...source })),
    tags: [...event.tags],
    scriptureReferences: [...event.scriptureReferences],
    publicationReferences: event.publicationReferences
      ? [...event.publicationReferences]
      : undefined
  }
}

export function isChronologyEvent(item?: TimelineItem): item is TimelineEvent {
  return item?.type === 'event' && item.provenance?.immutable === true
}
