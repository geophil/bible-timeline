import { isUncertain } from './date'
import type { TimelineFilters, TimelineItem } from './types'

export function filterItems(items: TimelineItem[], filters: TimelineFilters) {
  const query = filters.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.types.length && !filters.types.includes(item.type)) return false
    if (
      filters.sections.length &&
      !item.sources.some((source) => filters.sections.includes(source.section))
    )
      return false
    if (
      filters.periodId &&
      'periodId' in item &&
      item.periodId !== filters.periodId
    )
      return false
    if (filters.tag && !item.tags.includes(filters.tag)) return false
    if (filters.certainty !== 'all') {
      const uncertain =
        'date' in item
          ? isUncertain(item.date)
          : isUncertain(item.start) || isUncertain(item.end)
      if (filters.certainty === 'exact' && uncertain) return false
      if (filters.certainty === 'uncertain' && !uncertain) return false
    }
    if (!query) return true
    const haystack = [
      item.name,
      item.description,
      item.notes,
      ...item.tags,
      'scriptureReferences' in item ? item.scriptureReferences.join(' ') : ''
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
}
