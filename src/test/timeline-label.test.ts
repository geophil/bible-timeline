import { describe, expect, it } from 'vitest'
import { fitSvgLabel, layoutEventLabels } from '../components/Timeline'
import { isUncertain } from '../date'

describe('timeline period labels', () => {
  it('keeps short labels unchanged', () => {
    expect(fitSvgLabel('Pre-Flood', 80, 5)).toBe('Pre-Flood')
  })

  it('left-preserves and ellipsizes labels that exceed their band', () => {
    expect(fitSvgLabel('Time of the Judges', 62, 5)).toBe('Time of the…')
  })

  it('hides labels when a band cannot fit useful text', () => {
    expect(fitSvgLabel('Rome', 14, 5)).toBe('')
  })
})

describe('range endpoint precision', () => {
  it('keeps exact endpoints crisp', () => {
    expect(isUncertain({ year: 2020, era: 'BCE', qualifiers: [] })).toBe(false)
  })

  it('marks approximate and open-ended endpoints as fuzzy', () => {
    expect(
      isUncertain({ year: 1900, era: 'BCE', qualifiers: ['approximate'] })
    ).toBe(true)
    expect(
      isUncertain({ year: 33, era: 'CE', qualifiers: ['after'] })
    ).toBe(true)
  })
})

describe('event label placement', () => {
  it('puts nearby labels on separate lanes', () => {
    const labels = layoutEventLabels(
      [
        { id: 'exodus', x: 300, date: '1513 BCE', title: 'Exodus from Egypt' },
        { id: 'canaan', x: 325, date: '1473 BCE', title: 'Israel enters Canaan' }
      ],
      800
    )
    expect(labels[0].lane).not.toBe(labels[1].lane)
  })

  it('keeps each event label on one compact line', () => {
    const [label] = layoutEventLabels(
      [{ id: 'event', x: 100, date: '1513 BCE', title: 'Exodus from Egypt' }],
      800
    )
    expect(label.date).toBe('1513 BCE')
    expect(label.title).not.toContain('\n')
  })

  it('allocates disjoint horizontal cells to crowded labels in each lane', () => {
    const labels = layoutEventLabels(
      Array.from({ length: 12 }, (_, index) => ({
        id: `event-${index}`,
        x: 90 + index * 38,
        date: `${1500 - index * 10} BCE`,
        title: `Crowded historical event ${index}`
      })),
      600
    )
    for (const lane of [0, 1, 2]) {
      const laneLabels = labels
        .filter((label) => label.lane === lane)
        .sort((a, b) => a.cellStart - b.cellStart)
      laneLabels.slice(1).forEach((label, index) => {
        expect(label.cellStart).toBeGreaterThanOrEqual(laneLabels[index].cellEnd)
      })
    }
  })
})
