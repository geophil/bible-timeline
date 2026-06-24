import { describe, expect, it } from 'vitest'
import { filterItems } from '../filter'
import { starterDataset } from '../seed'
import type { TimelineFilters } from '../types'

const base: TimelineFilters = {
  query: '',
  types: [],
  sections: [],
  periodId: '',
  certainty: 'all',
  tag: ''
}

describe('timeline filters', () => {
  it('searches names', () => {
    const result = filterItems(starterDataset.items, { ...base, query: 'Magdalene' })
    expect(result.map((item) => item.name)).toEqual(['Mary Magdalene'])
  })

  it('filters uncertain people in a source section', () => {
    const result = filterItems(starterDataset.items, {
      ...base,
      types: ['person'],
      sections: [3],
      certainty: 'uncertain'
    })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => item.type === 'person')).toBe(true)
  })
})
