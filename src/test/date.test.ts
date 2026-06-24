import { describe, expect, it } from 'vitest'
import { formatDate, fromAxisYear, toAxisYear } from '../date'

describe('historical dates', () => {
  it('crosses BCE/CE without a year zero', () => {
    expect(toAxisYear({ year: 1, era: 'BCE' })).toBe(0)
    expect(toAxisYear({ year: 1, era: 'CE' })).toBe(1)
    expect(fromAxisYear(0)).toEqual({ year: 1, era: 'BCE' })
  })

  it('formats combined uncertainty qualifiers', () => {
    expect(
      formatDate({
        year: 65,
        era: 'CE',
        qualifiers: ['after', 'approximate']
      })
    ).toBe('After 65* CE')
  })
})
