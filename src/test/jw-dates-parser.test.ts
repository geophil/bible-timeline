import { describe, expect, it } from 'vitest'
import dataset from '../../data/jw-dates-calendar-bce.json'
import {
  parseChronologyHtml,
  parseDateExpression,
  toCsv
} from '../../scripts/lib/jw-dates-parser.mjs'

describe('JW Dates chronology parser', () => {
  it('normalizes exact, qualified, range, and alternative dates', () => {
    expect(parseDateExpression('1943')).toMatchObject({
      kind: 'point',
      date: { year: 1943, era: 'BCE', qualifier: 'exact' }
    })
    expect(parseDateExpression('a. 874')).toMatchObject({
      kind: 'point',
      date: { year: 874, qualifier: 'after' }
    })
    expect(parseDateExpression('c. 1774–c. 1767')).toMatchObject({
      kind: 'range',
      start: { year: 1774, qualifier: 'approximate' },
      end: { year: 1767, qualifier: 'approximate' }
    })
    expect(parseDateExpression('586 or 587')).toMatchObject({
      kind: 'alternative',
      alternatives: [{ year: 586 }, { year: 587 }]
    })
  })

  it('assigns continuation rows to the preceding explicit date', () => {
    const html = `
      <p id="p69" class="sx">4026, Adam created
        (<a class="b">Ge 2:7</a>): <a>it-1 45</a>
      </p>
      <p id="p70" class="sy">a related event: <a>source 1</a></p>
    `
    const records = parseChronologyHtml(html, {
      firstParagraph: 69,
      lastParagraph: 70
    })

    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      rowType: 'dated',
      dateSourceParagraph: 'p69',
      description: 'Adam created',
      scriptureReferences: ['Ge 2:7']
    })
    expect(records[1]).toMatchObject({
      rowType: 'continuation',
      dateSourceParagraph: 'p69',
      dateExpression: '4026'
    })
  })

  it('keeps the checked-in dataset complete and CSV-compatible', () => {
    expect(dataset.records).toHaveLength(430)
    const records = dataset.records as unknown as Parameters<typeof toCsv>[0]
    expect(toCsv(records).trim().split('\n')).toHaveLength(431)
  })
})
