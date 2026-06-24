import { describe, expect, it } from 'vitest'
import { datasetSchema } from '../schema'
import { starterDataset } from '../seed'

describe('starter chronology', () => {
  it('contains every planned source category', () => {
    const counts = starterDataset.items.reduce<Record<string, number>>((result, item) => {
      result[item.type] = (result[item.type] ?? 0) + 1
      return result
    }, {})
    expect(counts).toEqual({ period: 7, power: 6, person: 61, event: 18 })
  })

  it('has unique IDs and validates against the backup schema', () => {
    const ids = starterDataset.items.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(datasetSchema.safeParse(starterDataset).success).toBe(true)
  })

  it('merges Samuel across source sections', () => {
    const samuel = starterDataset.items.find((item) => item.id === 'person-samuel')
    expect(samuel?.sources.map((source) => source.section)).toEqual([1, 2])
  })
})
