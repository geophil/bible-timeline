import { BookOpen, DatabaseBackup, Filter, Menu, Plus, RotateCcw, Search, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadBackup, readBackupFile } from './backup'
import {
  applyChronologyEnrichments,
  duplicateChronologyEvent,
  EXPANDED_CHRONOLOGY_STORAGE_KEY,
  loadExpandedChronology
} from './chronology'
import { DetailDrawer, EventGroupDrawer } from './components/DetailDrawer'
import { ItemEditor } from './components/ItemEditor'
import { Timeline } from './components/Timeline'
import { deleteItem, factoryReset, initializeDatabase, mergeAll, replaceAll, saveItem } from './db'
import { filterItems } from './filter'
import { sourceUrls } from './seed'
import type {
  ExpandedChronologyBundle,
  ItemType,
  Person,
  TimelineEvent,
  TimelineFilters,
  TimelineItem
} from './types'
import './styles.css'

const defaultFilters: TimelineFilters = {
  query: '',
  types: [],
  sections: [],
  periodId: '',
  certainty: 'all',
  tag: ''
}

function immersiveFromUrl() {
  const value = new URLSearchParams(window.location.search).get('immersive')
  return value === '1' || value === 'true'
}

function expandedChronologyFromStorage() {
  return localStorage.getItem(EXPANDED_CHRONOLOGY_STORAGE_KEY) === '1'
}

export default function App() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [editing, setEditing] = useState<TimelineItem | 'new'>()
  const [editingAsNew, setEditingAsNew] = useState(false)
  const [filters, setFilters] = useState(defaultFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [immersive, setImmersive] = useState(immersiveFromUrl)
  const [expandedChronology, setExpandedChronology] = useState(
    expandedChronologyFromStorage
  )
  const [chronologyBundle, setChronologyBundle] =
    useState<ExpandedChronologyBundle>()
  const [chronologyLoading, setChronologyLoading] = useState(false)
  const [eventGroup, setEventGroup] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initializeDatabase()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.body.classList.toggle('immersive-active', immersive)
    const url = new URL(window.location.href)
    if (immersive) {
      url.searchParams.set('immersive', '1')
    } else {
      url.searchParams.delete('immersive')
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImmersive(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('immersive-active')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [immersive])

  useEffect(() => {
    localStorage.setItem(
      EXPANDED_CHRONOLOGY_STORAGE_KEY,
      expandedChronology ? '1' : '0'
    )
    if (!expandedChronology || chronologyBundle || chronologyLoading) return
    setChronologyLoading(true)
    loadExpandedChronology()
      .then(setChronologyBundle)
      .catch(() => {
        setExpandedChronology(false)
        flash('Unable to load expanded chronology.')
      })
      .finally(() => setChronologyLoading(false))
  }, [chronologyBundle, chronologyLoading, expandedChronology])

  useEffect(() => {
    if (expandedChronology) return
    if (selectedId?.startsWith('chronology-')) setSelectedId(undefined)
    setEventGroup([])
  }, [expandedChronology, selectedId])

  const combinedItems = useMemo(() => {
    if (!expandedChronology || !chronologyBundle) return items
    return [
      ...applyChronologyEnrichments(items, chronologyBundle),
      ...chronologyBundle.events
    ]
  }, [chronologyBundle, expandedChronology, items])
  const selected = combinedItems.find((item) => item.id === selectedId)
  const visibleItems = useMemo(
    () => filterItems(combinedItems, filters),
    [combinedItems, filters]
  )
  const people = items.filter((item): item is Person => item.type === 'person')
  const periods = combinedItems.filter((item) => item.type === 'period')
  const tags = [...new Set(combinedItems.flatMap((item) => item.tags))].sort()

  const persist = async (item: TimelineItem) => {
    await saveItem(item)
    setItems((current) => {
      const exists = current.some((entry) => entry.id === item.id)
      return exists
        ? current.map((entry) => (entry.id === item.id ? item : entry))
        : [...current, item]
    })
    setSelectedId(item.id)
    flash('Item saved locally.')
  }

  const remove = async (id: string) => {
    await deleteItem(id)
    setItems((current) => current.filter((item) => item.id !== id))
    setSelectedId(undefined)
    flash('Item deleted.')
  }

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const importFile = async (file: File) => {
    try {
      const dataset = await readBackupFile(file)
      const mode = confirm(
        `Import ${dataset.items.length} items?\n\nOK: merge and overwrite matching IDs.\nCancel: replace the current timeline after a second confirmation.`
      )
        ? 'merge'
        : confirm('Replace the entire current timeline with this backup?')
          ? 'replace'
          : 'cancel'
      if (mode === 'cancel') return
      downloadBackup(items)
      if (mode === 'merge') {
        await mergeAll(dataset.items)
        const map = new Map(items.map((item) => [item.id, item]))
        dataset.items.forEach((item) => map.set(item.id, item))
        setItems([...map.values()])
      } else {
        await replaceAll(dataset.items)
        setItems(dataset.items)
      }
      flash(`Imported ${dataset.items.length} items.`)
    } catch (error) {
      alert(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed.')
    }
  }

  if (loading) return <main className="loading"><BookOpen /><p>Opening your timeline…</p></main>

  return (
    <div className={`app-shell ${immersive ? 'immersive' : ''}`}>
      <header className="app-header">
        <div className="brand"><BookOpen /><div><p>Explore the chronology</p><h1>Bible Timeline</h1></div></div>
        <div className="header-actions">
          <button className="primary" onClick={() => {
            setEditingAsNew(true)
            setEditing('new')
          }}><Plus /> Add point</button>
          <button onClick={() => setDataOpen(!dataOpen)}><Menu /> Data</button>
        </div>
      </header>

      <section className="toolbar">
        <label className="search-box">
          <Search />
          <input
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Find a person, event, tag…"
            aria-label="Search timeline"
          />
          {filters.query && <button onClick={() => setFilters({ ...filters, query: '' })} aria-label="Clear search"><X /></button>}
        </label>
        <button className={hasFilters(filters) || expandedChronology ? 'active' : ''} onClick={() => setFiltersOpen(!filtersOpen)}>
          <Filter /> Filters {(hasFilters(filters) || expandedChronology) && <span className="filter-dot" />}
        </button>
        <div className="stats">
          <strong>{visibleItems.filter((item) => item.type === 'person').length}</strong> people
          <strong>{visibleItems.filter((item) => item.type === 'event' && item.importance !== 'secondary').length}</strong> events
          {expandedChronology && (
            <>
              <strong>{visibleItems.filter((item) => item.type === 'event' && item.importance === 'secondary').length}</strong> chronology
            </>
          )}
        </div>
      </section>

      {filtersOpen && (
        <section className="filter-panel">
          <label className="layer-toggle">
            <input
              type="checkbox"
              checked={expandedChronology}
              onChange={(event) => setExpandedChronology(event.target.checked)}
            />
            Expanded chronology
            {chronologyLoading && <small>Loading…</small>}
          </label>
          <div>
            <span>Types</span>
            {(['person', 'event', 'period', 'power'] as ItemType[]).map((type) => (
              <button key={type} className={filters.types.includes(type) ? 'selected-chip' : ''} onClick={() => setFilters({ ...filters, types: toggle(filters.types, type) })}>{type}</button>
            ))}
          </div>
          <label>Source
            <select value={filters.sections[0] ?? ''} onChange={(event) => setFilters({ ...filters, sections: event.target.value ? [Number(event.target.value)] : [] })}>
              <option value="">All sections</option><option value="1">Section 1</option><option value="2">Section 2</option><option value="3">Section 3</option>
            </select>
          </label>
          <label>Period
            <select value={filters.periodId} onChange={(event) => setFilters({ ...filters, periodId: event.target.value })}>
              <option value="">All periods</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
            </select>
          </label>
          <label>Dates
            <select value={filters.certainty} onChange={(event) => setFilters({ ...filters, certainty: event.target.value as TimelineFilters['certainty'] })}>
              <option value="all">Any certainty</option><option value="exact">Exact only</option><option value="uncertain">Uncertain only</option>
            </select>
          </label>
          <label>Tag
            <select value={filters.tag} onChange={(event) => setFilters({ ...filters, tag: event.target.value })}>
              <option value="">All tags</option>{tags.map((tag) => <option key={tag}>{tag}</option>)}
            </select>
          </label>
          <button onClick={() => setFilters(defaultFilters)}>Reset</button>
        </section>
      )}

      {dataOpen && (
        <section className="data-menu">
          <button onClick={() => downloadBackup(items)}><DatabaseBackup /> Export backup</button>
          <button onClick={() => importRef.current?.click()}><Upload /> Import backup</button>
          <button onClick={async () => {
            if (confirm('Restore the original timeline? Your current data will be downloaded first.')) {
              downloadBackup(items)
              setItems(await factoryReset())
              setSelectedId(undefined)
              flash('Starter timeline restored.')
            }
          }}><RotateCcw /> Restore starter data</button>
          <input ref={importRef} hidden type="file" accept=".json,.bible-timeline.json,application/json" onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
            event.target.value = ''
          }} />
        </section>
      )}

      <main>
        <Timeline
          items={visibleItems}
          selectedId={selectedId}
          immersive={immersive}
          onToggleImmersive={() => {
            setFiltersOpen(false)
            setDataOpen(false)
            setImmersive((current) => !current)
          }}
          onSelect={(item) => setSelectedId(item.id)}
          onSelectGroup={(events) => {
            setSelectedId(undefined)
            setEventGroup(events)
          }}
        />
        <footer className="source-footer">
          <p>Chronology derived from the cited factual date tables. Artwork is not redistributed.</p>
          <div>
            {([1, 2, 3] as const).map((section) => <a key={section} href={sourceUrls[section]} target="_blank" rel="noreferrer">Section {section}</a>)}
            {expandedChronology && chronologyBundle && (
              <a href={chronologyBundle.source.url} target="_blank" rel="noreferrer">
                Expanded chronology
              </a>
            )}
          </div>
        </footer>
      </main>

      <DetailDrawer
        item={selected}
        allItems={combinedItems}
        onClose={() => setSelectedId(undefined)}
        onEdit={(item) => {
          const editable = items.find((entry) => entry.id === item.id)
          if (editable) setEditing(editable)
        }}
        onDuplicate={(event) => {
          setEditing(duplicateChronologyEvent(event))
          setEditingAsNew(true)
          setSelectedId(undefined)
        }}
        onSelect={(item) => setSelectedId(item.id)}
      />
      {eventGroup.length > 0 && (
        <EventGroupDrawer
          events={eventGroup}
          onClose={() => setEventGroup([])}
          onSelect={(event) => {
            setEventGroup([])
            setSelectedId(event.id)
          }}
        />
      )}
      {editing && (
        <ItemEditor
          item={editing === 'new' ? undefined : editing}
          isNew={editing === 'new' || editingAsNew}
          people={people}
          onSave={persist}
          onDelete={remove}
          onClose={() => {
            setEditing(undefined)
            setEditingAsNew(false)
          }}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

function hasFilters(filters: TimelineFilters) {
  return Boolean(filters.types.length || filters.sections.length || filters.periodId || filters.certainty !== 'all' || filters.tag)
}
