import { ImagePlus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { resizeImage } from '../backup'
import type {
  DateQualifier,
  Era,
  HistoricalDate,
  ItemType,
  Person,
  SourceRef,
  TimelineItem
} from '../types'

type Props = {
  item?: TimelineItem
  isNew?: boolean
  people: Person[]
  onSave: (item: TimelineItem) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

type DraftDate = {
  year: string
  era: Era
  relation: 'exact' | 'after' | 'before' | 'transition'
  approximate: boolean
  alternativeYear: string
}

type Draft = {
  id: string
  type: ItemType
  name: string
  description: string
  notes: string
  tags: string
  color: string
  image?: string
  periodId: string
  start: DraftDate
  end: DraftDate
  date: DraftDate
  scriptures: string
  relationships: string
  sections: number[]
  otherSources: SourceRef[]
  aliases: string[]
  relatedPersonIds: string[]
  publicationReferences: string[]
}

const emptyDate = (): DraftDate => ({
  year: '',
  era: 'BCE',
  relation: 'exact',
  approximate: false,
  alternativeYear: ''
})

function toDraftDate(date?: HistoricalDate): DraftDate {
  if (!date) return emptyDate()
  const relation =
    date.qualifiers?.find((value) =>
      ['after', 'before', 'transition'].includes(value)
    ) as DraftDate['relation'] | undefined
  return {
    year: String(date.year),
    era: date.era,
    relation: relation ?? 'exact',
    approximate: date.qualifiers?.includes('approximate') ?? false,
    alternativeYear: date.alternativeYear ? String(date.alternativeYear) : ''
  }
}

function initialDraft(item?: TimelineItem): Draft {
  return {
    id: item?.id ?? crypto.randomUUID(),
    type: item?.type ?? 'person',
    name: item?.name ?? '',
    description: item?.description ?? '',
    notes: item?.notes ?? '',
    tags: item?.tags.join(', ') ?? '',
    color: item?.color ?? '',
    image: item?.image,
    periodId: 'periodId' in (item ?? {}) ? (item as Person).periodId ?? '' : '',
    start: toDraftDate(item && 'start' in item ? item.start : undefined),
    end: toDraftDate(
      item?.type === 'event'
        ? item.endDate
        : item && 'end' in item
          ? item.end
          : undefined
    ),
    date: toDraftDate(item?.type === 'event' ? item.date : undefined),
    scriptures:
      item && 'scriptureReferences' in item
        ? item.scriptureReferences.join(', ')
        : '',
    relationships:
      item?.type === 'person'
        ? item.relationships.map((relation) => `${relation.personId}:${relation.type}`).join('\n')
        : '',
    sections:
      item?.sources
        .map((source) => source.section)
        .filter((section): section is 1 | 2 | 3 => section !== undefined) ?? [],
    otherSources:
      item?.sources.filter((source) => source.section === undefined) ?? [],
    aliases: item?.aliases ?? [],
    relatedPersonIds: item?.type === 'event' ? item.relatedPersonIds ?? [] : [],
    publicationReferences:
      item?.type === 'event' ? item.publicationReferences ?? [] : []
  }
}

export function ItemEditor({
  item,
  isNew = false,
  people,
  onSave,
  onDelete,
  onClose
}: Props) {
  const [draft, setDraft] = useState(() => initialDraft(item))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setDraft(initialDraft(item)), [item])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      setSaving(true)
      await onSave(buildItem(draft))
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save this item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="editor" onSubmit={submit}>
        <div className="editor-header">
          <div><p className="eyebrow">{item && !isNew ? 'Edit item' : 'New item'}</p><h2>{draft.name || 'Timeline item'}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close editor"><X /></button>
        </div>

        <div className="form-grid">
          <label>Type
            <select
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value as ItemType })}
              disabled={Boolean(item && !isNew)}
            >
              <option value="person">Person</option>
              <option value="event">Event</option>
              <option value="period">Historical period</option>
              <option value="power">World power</option>
            </select>
          </label>
          <label>Name
            <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
        </div>

        {draft.type === 'event' ? (
          <div className="form-grid">
            <DateInput title="Date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            <DateInput title="End" value={draft.end} onChange={(end) => setDraft({ ...draft, end })} optional />
          </div>
        ) : (
          <div className="form-grid">
            <DateInput title="Start" value={draft.start} onChange={(start) => setDraft({ ...draft, start })} />
            <DateInput title="End" value={draft.end} onChange={(end) => setDraft({ ...draft, end })} optional={draft.type !== 'person'} />
          </div>
        )}

        <label>Description / biography
          <textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
        <label>Notes
          <textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>
        <div className="form-grid">
          <label>Tags <small>Comma separated</small>
            <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
          </label>
          <label>Color
            <input type="color" value={draft.color || '#3d7b69'} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
          </label>
        </div>
        {(draft.type === 'person' || draft.type === 'event') && (
          <label>Scripture references <small>Comma separated</small>
            <input value={draft.scriptures} onChange={(event) => setDraft({ ...draft, scriptures: event.target.value })} />
          </label>
        )}
        {draft.type === 'person' && (
          <label>Relationships <small>One per line as person-id:type</small>
            <textarea
              rows={3}
              value={draft.relationships}
              onChange={(event) => setDraft({ ...draft, relationships: event.target.value })}
              placeholder={people.slice(0, 2).map((person) => `${person.id}:family`).join('\n')}
            />
          </label>
        )}
        <fieldset>
          <legend>Source sections</legend>
          {[1, 2, 3].map((section) => (
            <label className="checkbox" key={section}>
              <input
                type="checkbox"
                checked={draft.sections.includes(section)}
                onChange={() =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.includes(section)
                      ? draft.sections.filter((value) => value !== section)
                      : [...draft.sections, section]
                  })
                }
              />
              Section {section}
            </label>
          ))}
        </fieldset>
        <label className="image-upload">
          <ImagePlus /> {draft.image ? 'Replace local image' : 'Attach a local image'}
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) setDraft({ ...draft, image: await resizeImage(file) })
            }}
          />
        </label>
        {draft.image && (
          <div className="image-preview">
            <img src={draft.image} alt="Attached preview" />
            <button type="button" onClick={() => setDraft({ ...draft, image: undefined })}>Remove image</button>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="editor-footer">
          {item && !isNew && (
            <button
              type="button"
              className="danger"
              onClick={async () => {
                if (confirm(`Delete “${item.name}”?`)) {
                  await onDelete(item.id)
                  onClose()
                }
              }}
            >
              <Trash2 /> Delete
            </button>
          )}
          <span />
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save item'}</button>
        </div>
      </form>
    </div>
  )
}

function DateInput({
  title,
  value,
  onChange,
  optional = false
}: {
  title: string
  value: DraftDate
  onChange: (date: DraftDate) => void
  optional?: boolean
}) {
  return (
    <fieldset className="date-input">
      <legend>{title}{optional ? ' (optional)' : ''}</legend>
      <input
        type="number"
        min="1"
        placeholder="Year"
        required={!optional}
        value={value.year}
        onChange={(event) => onChange({ ...value, year: event.target.value })}
      />
      <select value={value.era} onChange={(event) => onChange({ ...value, era: event.target.value as Era })}>
        <option>BCE</option><option>CE</option>
      </select>
      <select value={value.relation} onChange={(event) => onChange({ ...value, relation: event.target.value as DraftDate['relation'] })}>
        <option value="exact">Exact</option>
        <option value="after">After</option>
        <option value="before">Before</option>
        <option value="transition">Transition</option>
      </select>
      <label className="checkbox">
        <input type="checkbox" checked={value.approximate} onChange={(event) => onChange({ ...value, approximate: event.target.checked })} />
        Approx.
      </label>
      <input
        type="number"
        min="1"
        placeholder="Alt. year"
        value={value.alternativeYear}
        onChange={(event) => onChange({ ...value, alternativeYear: event.target.value })}
      />
    </fieldset>
  )
}

function buildDate(value: DraftDate, optional = false): HistoricalDate | undefined {
  if (!value.year && optional) return undefined
  const year = Number(value.year)
  if (!Number.isInteger(year) || year < 1) throw new Error('Every required date needs a positive whole-number year.')
  const qualifiers: DateQualifier[] = []
  if (value.relation !== 'exact') qualifiers.push(value.relation)
  if (value.approximate) qualifiers.push('approximate')
  if (value.alternativeYear) qualifiers.push('alternative')
  return {
    year,
    era: value.era,
    qualifiers,
    alternativeYear: value.alternativeYear ? Number(value.alternativeYear) : undefined
  }
}

function buildItem(draft: Draft): TimelineItem {
  const base = {
    id: draft.id,
    type: draft.type,
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    tags: draft.tags.split(',').map((value) => value.trim()).filter(Boolean),
    color: draft.color || undefined,
    image: draft.image,
    aliases: draft.aliases,
    sources: [
      ...draft.otherSources,
      ...draft.sections.map((section) => ({
        id: `timeline-section-${section}`,
        label: `Source section ${section}`,
        section: section as 1 | 2 | 3,
        url: section === 1
          ? 'https://wol.jw.org/en/wol/d/r1/lp-e/1102025962'
          : section === 2
            ? 'https://wol.jw.org/en/wol/d/r1/lp-e/1102025964'
            : 'https://wol.jw.org/en/wol/d/r1/lp-e/1102025966'
      }))
    ]
  }
  if (draft.type === 'event') {
    return {
      ...base,
      type: 'event',
      date: buildDate(draft.date)!,
      endDate: buildDate(draft.end, true),
      periodId: draft.periodId || undefined,
      scriptureReferences: splitList(draft.scriptures),
      publicationReferences: draft.publicationReferences,
      relatedPersonIds: draft.relatedPersonIds,
      importance: 'major'
    }
  }
  const start = buildDate(draft.start)!
  const end = buildDate(draft.end, draft.type !== 'person')
  if (draft.type === 'person') {
    if (!end) throw new Error('A person requires both lifespan endpoints.')
    return {
      ...base,
      type: 'person',
      start,
      end,
      periodId: draft.periodId || undefined,
      scriptureReferences: splitList(draft.scriptures),
      relationships: draft.relationships
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [personId, ...type] = line.split(':')
          return { personId: personId.trim(), type: type.join(':').trim() || 'related' }
        })
    }
  }
  return { ...base, type: draft.type, start, end }
}

const splitList = (value: string) =>
  value.split(',').map((entry) => entry.trim()).filter(Boolean)
