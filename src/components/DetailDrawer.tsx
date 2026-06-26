import { CalendarDays, CopyPlus, ExternalLink, Pencil, Users, X } from 'lucide-react'
import { isChronologyEvent } from '../chronology'
import { dateSpan, formatDate } from '../date'
import type { Person, TimelineEvent, TimelineItem } from '../types'

type Props = {
  item?: TimelineItem
  allItems: TimelineItem[]
  onClose: () => void
  onEdit: (item: TimelineItem) => void
  onDuplicate: (item: TimelineEvent) => void
  onSelect: (item: TimelineItem) => void
}

export function DetailDrawer({
  item,
  allItems,
  onClose,
  onEdit,
  onDuplicate,
  onSelect
}: Props) {
  if (!item) return null
  const people = allItems.filter((entry): entry is Person => entry.type === 'person')
  const contemporaries =
    item.type === 'person'
      ? people
          .filter((person) => {
            const selected = dateSpan(item)
            const candidate = dateSpan(person)
            return person.id !== item.id && candidate[0] <= selected[1] && candidate[1] >= selected[0]
          })
          .slice(0, 12)
      : []
  const relationships =
    item.type === 'person'
      ? item.relationships
          .map((relationship) => ({
            ...relationship,
            person: people.find((person) => person.id === relationship.personId)
          }))
          .filter((relationship) => relationship.person)
      : []

  return (
    <aside className="detail-drawer" aria-label={`${item.name} details`}>
      <div className="drawer-actions">
        {isChronologyEvent(item) ? (
          <button onClick={() => onDuplicate(item)}>
            <CopyPlus /> Duplicate as editable event
          </button>
        ) : (
          <button onClick={() => onEdit(item)}><Pencil /> Edit</button>
        )}
        <button className="icon-button" onClick={onClose} aria-label="Close details"><X /></button>
      </div>
      {item.image && <img className="detail-image" src={item.image} alt="" />}
      <p className="eyebrow">{item.type}</p>
      <h2>{item.name}</h2>
      <p className="date-range"><CalendarDays /> {itemDate(item)}</p>
      {item.description && <p>{item.description}</p>}
      {item.notes && <div className="note"><strong>Notes</strong><p>{item.notes}</p></div>}
      {'consolidatedGroup' in item && item.consolidatedGroup && (
        <div className="note warning"><strong>Shared source range</strong><p>{item.consolidatedGroup}</p></div>
      )}
      {item.tags.length > 0 && (
        <div className="tag-list">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      )}
      {'scriptureReferences' in item && item.scriptureReferences.length > 0 && (
        <section>
          <h3>Scripture references</h3>
          <p>{item.scriptureReferences.join(' · ')}</p>
        </section>
      )}
      {item.type === 'event' && item.relatedPersonIds?.length ? (
        <section>
          <h3><Users /> Related characters</h3>
          <div className="person-links">
            {item.relatedPersonIds
              .map((id) => people.find((person) => person.id === id))
              .filter((person): person is Person => Boolean(person))
              .map((person) => (
                <button key={person.id} onClick={() => onSelect(person)}>
                  {person.name}
                </button>
              ))}
          </div>
        </section>
      ) : null}
      {item.expandedChronology?.length ? (
        <section>
          <h3>Expanded chronology</h3>
          <div className="chronology-details">
            {item.expandedChronology.map((detail) => (
              <article key={detail.id}>
                <strong>{detail.title}</strong>
                <small>{detailDate(detail)}</small>
                {detail.scriptureReferences.length > 0 && (
                  <p>{detail.scriptureReferences.join(' · ')}</p>
                )}
                {detail.publicationReferences.length > 0 && (
                  <details>
                    <summary>Publication references</summary>
                    <p>{detail.publicationReferences.join(' · ')}</p>
                  </details>
                )}
                <a href={detail.source.url} target="_blank" rel="noreferrer">
                  Source {detail.source.locator} <ExternalLink />
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {isChronologyEvent(item) && item.sources[0] && (
        <section>
          <h3>Expanded chronology</h3>
          <p>This is a read-only reference record. Duplicate it to customize it.</p>
          {item.publicationReferences?.length ? (
            <details>
              <summary>Publication references</summary>
              <p>{item.publicationReferences.join(' · ')}</p>
            </details>
          ) : null}
        </section>
      )}
      {relationships.length > 0 && (
        <section>
          <h3><Users /> Relationships</h3>
          <div className="person-links">
            {relationships.map(({ person, type }) => (
              <button key={person!.id} onClick={() => onSelect(person!)}>
                {person!.name} <small>{type}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {contemporaries.length > 0 && (
        <section>
          <h3><Users /> Contemporaries</h3>
          <div className="person-links">
            {contemporaries.map((person) => (
              <button key={person.id} onClick={() => onSelect(person)}>{person.name}</button>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3>Sources</h3>
        {item.sources.map((source) => (
          <a key={`${source.id ?? source.section}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">
            {source.label ?? (source.section ? `Source section ${source.section}` : 'Source')}
            {source.locator ? ` · ${source.locator}` : ''} <ExternalLink />
          </a>
        ))}
      </section>
    </aside>
  )
}

function itemDate(item: TimelineItem) {
  if (item.type === 'event') {
    return item.endDate
      ? `${formatDate(item.date)} – ${formatDate(item.endDate)}`
      : formatDate(item.date)
  }
  return `${formatDate(item.start)} – ${formatDate(item.end)}`
}

function detailDate(detail: {
  date: TimelineEvent['date']
  endDate?: TimelineEvent['endDate']
}) {
  return detail.endDate
    ? `${formatDate(detail.date)} – ${formatDate(detail.endDate)}`
    : formatDate(detail.date)
}

export function EventGroupDrawer({
  events,
  onClose,
  onSelect
}: {
  events: TimelineEvent[]
  onClose: () => void
  onSelect: (event: TimelineEvent) => void
}) {
  return (
    <aside className="detail-drawer" aria-label={`${events.length} chronology events`}>
      <div className="drawer-actions">
        <div>
          <p className="eyebrow">Expanded chronology</p>
          <h2>{events.length} events</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close event list">
          <X />
        </button>
      </div>
      <div className="event-group-list">
        {events.map((event) => (
          <button key={event.id} onClick={() => onSelect(event)}>
            <span>{event.name}</span>
            <small>{itemDate(event)}</small>
          </button>
        ))}
      </div>
    </aside>
  )
}
