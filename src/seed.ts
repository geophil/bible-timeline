import type {
  DateQualifier,
  HistoricalDate,
  Period,
  Person,
  SourceRef,
  TimelineDataset,
  TimelineEvent,
  WorldPower
} from './types'

const urls = {
  1: 'https://wol.jw.org/en/wol/d/r1/lp-e/1102025962',
  2: 'https://wol.jw.org/en/wol/d/r1/lp-e/1102025964',
  3: 'https://wol.jw.org/en/wol/d/r1/lp-e/1102025966'
} as const

const source = (section: 1 | 2 | 3): SourceRef => ({
  section,
  url: urls[section]
})

const d = (
  year: number,
  era: 'BCE' | 'CE',
  qualifiers: DateQualifier[] = [],
  original?: string,
  alternativeYear?: number
): HistoricalDate => ({ year, era, qualifiers, original, alternativeYear })

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

type PersonOptions = {
  group?: string
  sources?: SourceRef[]
  tags?: string[]
}

const person = (
  name: string,
  start: HistoricalDate,
  end: HistoricalDate,
  periodId: string,
  section: 1 | 2 | 3,
  options: PersonOptions = {}
): Person => ({
  id: `person-${slug(name)}`,
  type: 'person',
  name,
  start,
  end,
  periodId,
  consolidatedGroup: options.group,
  tags: options.tags ?? [],
  sources: options.sources ?? [source(section)],
  scriptureReferences: [],
  relationships: []
})

const groupedPeople = (
  names: string[],
  start: HistoricalDate,
  end: HistoricalDate,
  periodId: string,
  section: 1 | 2,
  group: string
) => names.map((name) => person(name, start, end, periodId, section, { group }))

const periodRows: [
  string,
  string,
  HistoricalDate,
  HistoricalDate | undefined,
  1 | 2
][] = [
  ['pre-flood', 'Pre-Flood', d(4026, 'BCE'), d(2370, 'BCE'), 1],
  ['post-flood', 'Post-Flood', d(2370, 'BCE'), d(1473, 'BCE'), 1],
  ['judges', 'Time of the Judges', d(1473, 'BCE'), d(1117, 'BCE'), 1],
  ['united-kingdom', 'United Kingdom', d(1117, 'BCE'), d(997, 'BCE'), 2],
  ['divided-kingdom', 'Divided Kingdom', d(997, 'BCE'), d(607, 'BCE'), 2],
  ['babylonian-exile', 'Exile to Babylon', d(607, 'BCE'), d(537, 'BCE'), 2],
  ['postexilic', 'Postexilic Period', d(537, 'BCE'), undefined, 2]
]

const periods: Period[] = periodRows.map(([id, name, start, end, section]) => ({
  id: `period-${id}`,
  type: 'period',
  name,
  start,
  end,
  tags: [],
  sources: [source(section)]
}))

const people: Person[] = [
  person('Adam', d(4026, 'BCE'), d(3096, 'BCE'), 'period-pre-flood', 1),
  person('Enoch', d(3404, 'BCE'), d(3039, 'BCE'), 'period-pre-flood', 1),
  person('Noah', d(2970, 'BCE'), d(2020, 'BCE'), 'period-pre-flood', 1),
  person('Abraham', d(2018, 'BCE'), d(1843, 'BCE'), 'period-post-flood', 1),
  person('Sarah', d(2008, 'BCE'), d(1881, 'BCE'), 'period-post-flood', 1),
  person(
    'Rebekah',
    d(1900, 'BCE', ['approximate'], '1900* B.C.E.'),
    d(1775, 'BCE', ['approximate'], '1775* B.C.E.'),
    'period-post-flood',
    1
  ),
  person('Jacob', d(1858, 'BCE'), d(1711, 'BCE'), 'period-post-flood', 1),
  person('Joseph', d(1767, 'BCE'), d(1657, 'BCE'), 'period-post-flood', 1),
  ...groupedPeople(
    ['Shiphrah', 'Puah', 'Amram', 'Jochebed', 'Miriam'],
    d(1645, 'BCE', ['approximate'], '1645* B.C.E.'),
    d(1474, 'BCE', ['approximate'], '1474* B.C.E.'),
    'period-post-flood',
    1,
    'Consolidated source range; individual chronology is not specified.'
  ),
  person('Moses', d(1593, 'BCE'), d(1473, 'BCE'), 'period-post-flood', 1),
  person(
    'Caleb',
    d(1552, 'BCE'),
    d(1450, 'BCE', ['approximate'], '1450* B.C.E.'),
    'period-post-flood',
    1
  ),
  person(
    'Joshua',
    d(1560, 'BCE', ['approximate'], '1560* B.C.E.'),
    d(1450, 'BCE', ['approximate'], '1450* B.C.E.'),
    'period-post-flood',
    1
  ),
  person(
    'Rahab',
    d(1500, 'BCE', ['approximate'], '1500* B.C.E.'),
    d(1400, 'BCE', ['approximate'], '1400* B.C.E.'),
    'period-post-flood',
    1
  ),
  ...groupedPeople(
    [
      'Naomi',
      'Ruth',
      'Deborah',
      'Barak',
      'Jael',
      'Gideon',
      'Samson',
      'Jephthah',
      "Jephthah's daughter"
    ],
    d(1450, 'BCE', ['approximate'], '1450* B.C.E.'),
    d(1120, 'BCE', ['approximate'], '1120* B.C.E.'),
    'period-judges',
    1,
    'Consolidated 330-year source range; individual lifespans are shorter and their sequence is uncertain.'
  ),
  person(
    'Samuel',
    d(1180, 'BCE', ['approximate'], '1180* B.C.E.'),
    d(1080, 'BCE', ['approximate'], '1080* B.C.E.'),
    'period-judges',
    1,
    { sources: [source(1), source(2)] }
  ),
  person(
    'Jonathan',
    d(1138, 'BCE', ['approximate'], '1138* B.C.E.'),
    d(1078, 'BCE', ['approximate'], '1078* B.C.E.'),
    'period-united-kingdom',
    2
  ),
  person('David', d(1107, 'BCE'), d(1037, 'BCE'), 'period-united-kingdom', 2),
  ...groupedPeople(
    ['Abigail', 'Nathan'],
    d(1100, 'BCE', ['approximate'], '1100* B.C.E.'),
    d(1000, 'BCE', ['approximate'], '1000* B.C.E.'),
    'period-united-kingdom',
    2,
    'Consolidated source range; individual chronology is not specified.'
  ),
  person(
    'Mephibosheth',
    d(1083, 'BCE', ['approximate'], '1083* B.C.E.'),
    d(1000, 'BCE', ['approximate'], '1000* B.C.E.'),
    'period-united-kingdom',
    2
  ),
  person(
    'Jehoiada',
    d(1005, 'BCE', ['approximate'], '1005* B.C.E.'),
    d(875, 'BCE', ['approximate'], '875* B.C.E.'),
    'period-divided-kingdom',
    2
  ),
  person(
    'Asa',
    d(1000, 'BCE', ['approximate'], '1000* B.C.E.'),
    d(937, 'BCE'),
    'period-divided-kingdom',
    2
  ),
  ...groupedPeople(
    ['Elijah', 'Widow of Zarephath'],
    d(970, 'BCE', ['approximate'], '970* B.C.E.'),
    d(900, 'BCE', ['approximate'], '900* B.C.E.'),
    'period-divided-kingdom',
    2,
    'Consolidated source range; individual chronology is not specified.'
  ),
  person(
    'Elisha',
    d(950, 'BCE', ['approximate'], '950* B.C.E.'),
    d(850, 'BCE', ['approximate'], '850* B.C.E.'),
    'period-divided-kingdom',
    2
  ),
  person(
    'Little Israelite Girl',
    d(925, 'BCE', ['approximate'], '925* B.C.E.'),
    d(825, 'BCE', ['approximate'], '825* B.C.E.'),
    'period-divided-kingdom',
    2
  ),
  person('Hezekiah', d(771, 'BCE'), d(716, 'BCE'), 'period-divided-kingdom', 2),
  person('Manasseh', d(728, 'BCE'), d(661, 'BCE'), 'period-divided-kingdom', 2),
  person('Josiah', d(667, 'BCE'), d(628, 'BCE'), 'period-divided-kingdom', 2),
  ...groupedPeople(
    ['Daniel', 'Hananiah', 'Mishael', 'Azariah'],
    d(635, 'BCE', ['approximate'], '635* B.C.E.'),
    d(535, 'BCE', ['approximate'], '535* B.C.E.'),
    'period-babylonian-exile',
    2,
    'Consolidated source range; individual chronology is not specified.'
  ),
  person(
    'Esther',
    d(515, 'BCE', ['approximate'], '515* B.C.E.'),
    d(415, 'BCE', ['approximate'], '415* B.C.E.'),
    'period-postexilic',
    2
  ),
  person(
    'Nehemiah',
    d(485, 'BCE', ['approximate'], '485* B.C.E.'),
    d(385, 'BCE', ['approximate'], '385* B.C.E.'),
    'period-postexilic',
    2
  ),
  person(
    'Zechariah',
    d(70, 'BCE', ['approximate'], '70* B.C.E.'),
    d(2, 'BCE', ['after'], 'after 2 B.C.E.'),
    '',
    3
  ),
  person(
    'Elizabeth',
    d(70, 'BCE', ['approximate'], '70* B.C.E.'),
    d(2, 'BCE', ['after'], 'after 2 B.C.E.'),
    '',
    3
  ),
  person(
    "Mary (Jesus' mother)",
    d(20, 'BCE', ['approximate'], '20* B.C.E.'),
    d(33, 'CE', ['after'], 'after 33 C.E.'),
    '',
    3
  ),
  person(
    'Joseph (husband of Mary)',
    d(25, 'BCE', ['approximate'], '25* B.C.E.'),
    d(11, 'CE', ['after'], 'after 11 C.E.'),
    '',
    3
  ),
  person(
    'John the Baptist',
    d(2, 'BCE'),
    d(32, 'CE', ['approximate'], '32* C.E.'),
    '',
    3
  ),
  person('Jesus', d(2, 'BCE'), d(33, 'CE'), '', 3),
  person(
    'Peter',
    d(5, 'BCE', ['approximate'], '5* B.C.E.'),
    d(64, 'CE', ['after'], 'after 64 C.E.'),
    '',
    3
  ),
  person(
    'Mary Magdalene',
    d(5, 'BCE', ['approximate'], '5* B.C.E.'),
    d(33, 'CE', ['after'], 'after 33 C.E.'),
    '',
    3
  ),
  person(
    "Mary (Lazarus' sister)",
    d(15, 'BCE', ['approximate'], '15* B.C.E.'),
    d(33, 'CE', ['after'], 'after 33 C.E.'),
    '',
    3
  ),
  person(
    'Stephen',
    d(5, 'BCE', ['approximate'], '5* B.C.E.'),
    d(33, 'CE', ['approximate', 'alternative'], '33/34* C.E.', 34),
    '',
    3
  ),
  person(
    'Paul (Saul of Tarsus)',
    d(3, 'CE', ['approximate'], '3* C.E.'),
    d(65, 'CE', ['approximate'], '65* C.E.'),
    '',
    3
  ),
  person(
    'Barnabas',
    d(5, 'BCE', ['approximate'], '5* B.C.E.'),
    d(55, 'CE', ['after'], 'after 55 C.E.'),
    '',
    3
  ),
  person(
    'Mark',
    d(15, 'CE', ['approximate'], '15* C.E.'),
    d(65, 'CE', ['after', 'approximate'], 'after 65* C.E.'),
    '',
    3
  ),
  person(
    'Apostle John',
    d(5, 'BCE', ['approximate'], '5* B.C.E.'),
    d(100, 'CE', ['approximate'], '100* C.E.'),
    '',
    3
  )
]

const event = (
  id: string,
  name: string,
  date: HistoricalDate,
  section: 1 | 2 | 3,
  periodId?: string
): TimelineEvent => ({
  id: `event-${id}`,
  type: 'event',
  name,
  date,
  periodId,
  tags: [],
  sources: [source(section)],
  scriptureReferences: []
})

const events: TimelineEvent[] = [
  event('global-deluge', 'Global deluge', d(2370, 'BCE'), 1, 'period-pre-flood'),
  event(
    'abrahamic-covenant',
    'Abrahamic covenant in effect',
    d(1943, 'BCE'),
    1,
    'period-post-flood'
  ),
  event(
    'jacob-enters-egypt',
    "Jacob's family enters Egypt",
    d(1728, 'BCE'),
    1,
    'period-post-flood'
  ),
  event('exodus', 'Exodus from Egypt', d(1513, 'BCE'), 1, 'period-post-flood'),
  event(
    'canaan',
    'Israel enters Canaan',
    d(1473, 'BCE'),
    1,
    'period-post-flood'
  ),
  event(
    'saul-anointed',
    'Samuel anoints Saul as king',
    d(1117, 'BCE'),
    1,
    'period-judges'
  ),
  event(
    'solomons-temple',
    "Solomon's temple completed",
    d(1027, 'BCE'),
    2,
    'period-united-kingdom'
  ),
  event(
    'kingdom-divided',
    'Israel divided into two kingdoms',
    d(997, 'BCE'),
    2,
    'period-united-kingdom'
  ),
  event(
    'assyria-defeats-israel',
    'Assyria defeats the ten-tribe kingdom',
    d(740, 'BCE'),
    2,
    'period-divided-kingdom'
  ),
  event(
    'jerusalem-destroyed',
    'Nebuchadnezzar destroys Jerusalem',
    d(607, 'BCE'),
    2,
    'period-divided-kingdom'
  ),
  event(
    'jews-released',
    'Jews released from Babylon',
    d(537, 'BCE'),
    2,
    'period-babylonian-exile'
  ),
  event(
    'temple-rebuilt',
    'Temple rebuilt in Jerusalem',
    d(515, 'BCE'),
    2,
    'period-postexilic'
  ),
  event(
    'walls-completed',
    "Jerusalem's walls completed",
    d(455, 'BCE'),
    2,
    'period-postexilic'
  ),
  event('pentecost', 'Holy spirit poured out at Pentecost', d(33, 'CE'), 3),
  event('gentiles-baptized', 'First uncircumcised Gentiles baptized', d(36, 'CE'), 3),
  event(
    'matthew-gospel',
    'Matthew writes first Gospel',
    d(41, 'CE', ['approximate'], '41* C.E.'),
    3
  ),
  event(
    'jerusalem-70',
    'Jerusalem and its temple destroyed',
    d(70, 'CE'),
    3
  ),
  event(
    'bible-completed',
    'Bible writing completed',
    d(98, 'CE', ['approximate'], '98* C.E.'),
    3
  )
]

const power = (
  id: string,
  name: string,
  start: HistoricalDate,
  end: HistoricalDate | undefined,
  section: 1 | 2 | 3,
  color: string
): WorldPower => ({
  id: `power-${id}`,
  type: 'power',
  name,
  start,
  end,
  color,
  tags: [],
  sources: [source(section)]
})

const powers: WorldPower[] = [
  power(
    'egypt',
    'Egypt',
    d(1600, 'BCE', ['approximate'], '1600* B.C.E.'),
    d(874, 'BCE', ['after'], 'after 874 B.C.E.'),
    1,
    '#b9802b'
  ),
  power(
    'assyria',
    'Assyria',
    d(874, 'BCE', ['after'], 'after 874 B.C.E.'),
    d(625, 'BCE'),
    2,
    '#183c3e'
  ),
  power('babylon', 'Babylon', d(625, 'BCE'), d(539, 'BCE'), 2, '#c95628'),
  power(
    'medo-persia',
    'Medo-Persia',
    d(539, 'BCE'),
    d(332, 'BCE', ['approximate'], '332* B.C.E.'),
    2,
    '#3973a7'
  ),
  power(
    'greece',
    'Greece',
    d(332, 'BCE', ['approximate'], '332* B.C.E.'),
    d(30, 'BCE', ['transition'], '63–30 B.C.E. transition'),
    3,
    '#3d6fa9'
  ),
  power(
    'rome',
    'Rome',
    d(63, 'BCE', ['transition'], '63–30 B.C.E. transition'),
    undefined,
    3,
    '#b75e4f'
  )
]

export const starterDataset: TimelineDataset = {
  schemaVersion: 1,
  items: [...periods, ...powers, ...people, ...events]
}

export const sourceUrls = urls
