import {
  scaleLinear,
  select,
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform
} from 'd3'
import { Focus, Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  dateSpan,
  formatAxisYear,
  formatDate,
  isUncertain,
  MAX_YEAR,
  MIN_YEAR,
  toAxisYear
} from '../date'
import type {
  Period,
  Person,
  TimelineEvent,
  TimelineItem,
  WorldPower
} from '../types'

type Props = {
  items: TimelineItem[]
  selectedId?: string
  immersive: boolean
  onToggleImmersive: () => void
  onSelect: (item: TimelineItem) => void
  onSelectGroup: (items: TimelineEvent[]) => void
}

const colors = {
  person: '#3d7b69',
  event: '#bd623e',
  power: '#264d49'
}

const CONTEXT_HEIGHT = 154
const CHRONOLOGY_LAYER_HEIGHT = 280
const CHRONOLOGY_TOP = 48
const CHRONOLOGY_LANE_HEIGHT = 24
const CHRONOLOGY_LANES = 9
const PEOPLE_TOP = 22
const LANE_HEIGHT = 35
const PERSON_NAME_OFFSET = -3
const PERSON_DATE_OFFSET = 16

function assignLanes(people: Person[]) {
  const lanes: number[] = []
  return [...people]
    .sort((a, b) => dateSpan(a)[0] - dateSpan(b)[0])
    .map((person) => {
      const [start, end] = dateSpan(person)
      let lane = lanes.findIndex((laneEnd) => start > laneEnd + 10)
      if (lane === -1) {
        lane = lanes.length
        lanes.push(end)
      } else {
        lanes[lane] = end
      }
      return { person, lane }
    })
}

export function Timeline({
  items,
  selectedId,
  immersive,
  onToggleImmersive,
  onSelect,
  onSelectGroup
}: Props) {
  const cardRef = useRef<HTMLElement>(null)
  const contextRef = useRef<SVGSVGElement>(null)
  const peopleRef = useRef<SVGSVGElement>(null)
  const peopleScrollRef = useRef<HTMLDivElement>(null)
  const behaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>()
  const wasFocusedRef = useRef(false)
  const [width, setWidth] = useState(1000)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)

  const periods = items.filter((item): item is Period => item.type === 'period')
  const powers = items.filter((item): item is WorldPower => item.type === 'power')
  const events = items.filter((item): item is TimelineEvent => item.type === 'event')
  const majorEvents = events.filter((event) => event.importance !== 'secondary')
  const secondaryEvents = events.filter(
    (event) => event.importance === 'secondary'
  )
  const people = items.filter((item): item is Person => item.type === 'person')
  const laidOutPeople = useMemo(() => assignLanes(people), [people])
  const laneCount = Math.max(1, ...laidOutPeople.map(({ lane }) => lane + 1))
  const chronologyLayerHeight = secondaryEvents.length ? CHRONOLOGY_LAYER_HEIGHT : 0
  const peopleStartY = PEOPLE_TOP + chronologyLayerHeight
  const peopleHeight = Math.max(420, peopleStartY + laneCount * LANE_HEIGHT + 34)
  const baseScale = useMemo(
    () => scaleLinear().domain([MIN_YEAR, MAX_YEAR]).range([52, width - 40]),
    [width]
  )
  const x = (value: number) => transform.applyX(baseScale(value))
  const zoomLevel = transform.k
  const focusedResultSet = items.length > 0 && items.length <= 6
  const selected = people.find((person) => person.id === selectedId)
  const selectedSpan = selected ? dateSpan(selected) : undefined
  const relatedIds = new Set(selected?.relationships.map((relation) => relation.personId))

  useEffect(() => {
    if (!cardRef.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!contextRef.current || !peopleRef.current) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 80])
      .translateExtent([
        [0, 0],
        [width, CONTEXT_HEIGHT]
      ])
      .filter((event) => {
        if (event.type === 'dblclick') return false
        if (
          event.type === 'wheel' &&
          (event.currentTarget as SVGSVGElement).classList.contains('people-svg')
        )
          return false
        return !event.target.closest?.('[data-no-zoom]')
      })
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform(
          zoomIdentity.translate(event.transform.x, 0).scale(event.transform.k)
        )
      })
    behaviorRef.current = behavior
    const contextSelection = select(contextRef.current)
    const peopleSelection = select(peopleRef.current)
    contextSelection.call(behavior)
    peopleSelection.call(behavior)
    return () => {
      contextSelection.on('.zoom', null)
      peopleSelection.on('.zoom', null)
    }
  }, [width])

  useEffect(() => {
    select(contextRef.current).property('__zoom', transform)
    select(peopleRef.current).property('__zoom', transform)
  }, [transform])

  useEffect(() => {
    const scroller = peopleScrollRef.current
    const canvas = peopleRef.current
    if (!scroller || !canvas) return
    const handleWheel = (event: WheelEvent) => {
      const behavior = behaviorRef.current
      if (!behavior) return
      const selection = select(canvas)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        const bounds = canvas.getBoundingClientRect()
        const point: [number, number] = [
          event.clientX - bounds.left,
          event.clientY - bounds.top
        ]
        selection.call(
          behavior.scaleBy,
          Math.exp(-event.deltaY * 0.01),
          point
        )
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault()
        selection.call(behavior.translateBy, -event.deltaX / transform.k, 0)
      }
    }
    scroller.addEventListener('wheel', handleWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', handleWheel)
  }, [transform.k])

  useEffect(() => {
    const scroller = peopleScrollRef.current
    const canvas = peopleRef.current
    if (!scroller || !canvas) return

    let activePointerId: number | undefined
    let startX = 0
    let startY = 0
    let startScrollTop = 0
    let intent: 'pending' | 'horizontal' | 'vertical' = 'pending'

    const reset = () => {
      activePointerId = undefined
      intent = 'pending'
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-no-zoom]')) return
      activePointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      startScrollTop = scroller.scrollTop
      intent = 'pending'
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return
      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY
      if (intent === 'pending') {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 7) return
        intent = Math.abs(deltaY) > Math.abs(deltaX) * 1.15 ? 'vertical' : 'horizontal'
      }
      if (intent !== 'vertical') return
      event.preventDefault()
      event.stopImmediatePropagation()
      scroller.scrollTop = startScrollTop - deltaY
    }

    canvas.addEventListener('pointerdown', handlePointerDown, { capture: true })
    canvas.addEventListener('pointermove', handlePointerMove, {
      capture: true,
      passive: false
    })
    canvas.addEventListener('pointerup', reset, { capture: true })
    canvas.addEventListener('pointercancel', reset, { capture: true })
    canvas.addEventListener('lostpointercapture', reset, { capture: true })
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      canvas.removeEventListener('pointermove', handlePointerMove, { capture: true })
      canvas.removeEventListener('pointerup', reset, { capture: true })
      canvas.removeEventListener('pointercancel', reset, { capture: true })
      canvas.removeEventListener('lostpointercapture', reset, { capture: true })
    }
  }, [])

  const zoomBy = (factor: number) => {
    if (!contextRef.current || !behaviorRef.current) return
    select(contextRef.current)
      .transition()
      .duration(250)
      .call(behaviorRef.current.scaleBy, factor)
  }

  const fitAll = () => {
    if (!contextRef.current || !behaviorRef.current) return
    select(contextRef.current)
      .transition()
      .duration(300)
      .call(behaviorRef.current.transform, zoomIdentity)
  }

  const centerOnAxisYear = (year: number, targetK = transform.k) => {
    if (!contextRef.current || !behaviorRef.current) return
    const translateX = width / 2 - targetK * baseScale(year)
    const next = zoomIdentity.translate(translateX, 0).scale(targetK)
    select(contextRef.current)
      .transition()
      .duration(300)
      .call(behaviorRef.current.transform, next)
  }

  useEffect(() => {
    if (!behaviorRef.current || !contextRef.current) return
    if (!focusedResultSet) {
      if (wasFocusedRef.current) {
        select(contextRef.current)
          .transition()
          .duration(320)
          .call(behaviorRef.current.transform, zoomIdentity)
      }
      wasFocusedRef.current = false
      return
    }
    wasFocusedRef.current = true
    const spans = items.map(dateSpan)
    const start = Math.min(...spans.map((span) => span[0]))
    const end = Math.max(...spans.map((span) => span[1]))
    const center = (start + end) / 2
    const targetK = Math.min(24, Math.max(3, 1800 / Math.max(80, end - start)))
    const translateX = width / 2 - targetK * baseScale(center)
    const next = zoomIdentity.translate(translateX, 0).scale(targetK)
    select(contextRef.current)
      .transition()
      .duration(320)
      .call(behaviorRef.current.transform, next)
  }, [baseScale, focusedResultSet, items, width])

  const ticks = baseScale.ticks(zoomLevel < 2 ? 10 : zoomLevel < 6 ? 18 : 30)
  const eventClusters = clusterEvents(
    majorEvents,
    x,
    zoomLevel < 1.5 ? 34 : 0
  )
  const chronologyClusters = clusterChronologyEvents(
    secondaryEvents,
    x,
    zoomLevel
  )
  const chronologyLayout = layoutChronologyLayer(
    chronologyClusters,
    x,
    width,
    zoomLevel,
    focusedResultSet,
    selectedId
  )
  const eventLabels = layoutEventLabels(
    eventClusters
      .filter((cluster) => cluster.items.length === 1)
      .map((cluster) => ({
        id: cluster.items[0].id,
        x: x(cluster.axisYear),
        date: formatDate(cluster.items[0].date),
        title: cluster.items[0].name
      })),
    width
  )

  return (
    <section ref={cardRef} className="timeline-card" aria-label="Interactive timeline">
      <div className="timeline-help" aria-hidden="true">
        Drag · pinch to zoom · scroll vertically
      </div>
      <div className="timeline-controls" data-no-zoom>
        <button onClick={() => zoomBy(1.6)} aria-label="Zoom in"><Plus /></button>
        <button onClick={() => zoomBy(0.625)} aria-label="Zoom out"><Minus /></button>
        <button onClick={fitAll} aria-label="Fit entire timeline"><Focus /></button>
        <button
          onClick={onToggleImmersive}
          aria-label={immersive ? 'Exit immersive mode' : 'Enter immersive mode'}
          aria-pressed={immersive}
        >
          {immersive ? <Minimize2 /> : <Maximize2 />}
        </button>
      </div>
      <div className="timeline-context" data-testid="timeline-context">
        <svg
          ref={contextRef}
          className="timeline-context-svg"
          height={CONTEXT_HEIGHT}
          role="application"
          aria-label="Drag or pinch the time context to explore dates"
        >
          <defs>
            {periods.map((period, index) => (
              <RangeGradient
                key={period.id}
                id={`context-${period.id}`}
                color={index % 2 ? '#ede4cf' : '#e2d3ad'}
                fuzzyStart={isUncertain(period.start)}
                fuzzyEnd={isUncertain(period.end)}
              />
            ))}
            {powers.map((power) => (
              <RangeGradient
                key={power.id}
                id={`context-${power.id}`}
                color={power.color ?? colors.power}
                fuzzyStart={isUncertain(power.start)}
                fuzzyEnd={isUncertain(power.end)}
              />
            ))}
          </defs>
          <rect width={width} height={CONTEXT_HEIGHT} fill="#fbf8ef" />

          <g className="period-bands">
            {periods.map((period, index) => {
              const [start, end] = dateSpan(period)
              const bandX = x(start)
              const bandWidth = Math.max(2, x(end) - x(start))
              const label = fitSvgLabel(period.name, bandWidth - 12, 5.2)
              return (
                <g
                  key={period.id}
                  aria-label={period.name}
                  onClick={() => onSelect(period)}
                >
                  <title>{period.name}</title>
                  <rect
                    x={bandX}
                    y={8}
                    width={bandWidth}
                    height={22}
                    fill={`url(#${gradientId(`context-${period.id}`)})`}
                  />
                  {label && (
                    <text
                      className="period-label"
                      x={bandX + 6}
                      y={22}
                      textAnchor="start"
                    >
                      {label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          <g className="power-bands">
            {powers.map((power) => {
              const [start, end] = dateSpan(power)
              return (
                <g key={power.id} onClick={() => onSelect(power)}>
                  <rect
                    x={x(start)}
                    y={35}
                    width={Math.max(3, x(end) - x(start))}
                    height={18}
                    rx={3}
                    fill={`url(#${gradientId(`context-${power.id}`)})`}
                  />
                  {x(end) - x(start) > 45 && (
                    <text className="power-label" x={(x(start) + x(end)) / 2} y={48} textAnchor="middle">
                      {power.name}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          <g className="context-axis">
            {ticks.map((tick) => (
              <g key={tick} transform={`translate(${x(tick)},0)`}>
                <line y1={58} y2={CONTEXT_HEIGHT} />
                <text y={70} textAnchor="middle">{formatAxisYear(tick)}</text>
              </g>
            ))}
            <line className="era-line" x1={x(0)} x2={x(0)} y1={55} y2={CONTEXT_HEIGHT} />
          </g>

          <g className="event-rail">
            {eventClusters.map((cluster, index) => {
              const item = cluster.items[0]
              const eventX = x(cluster.axisYear)
              const placement = eventLabels.find((entry) => entry.id === item.id)
              const y = 91 + (placement?.lane ?? index % 3) * 20
              if (cluster.items.length > 1) {
                return (
                  <g
                    key={cluster.items.map((entry) => entry.id).join('-')}
                    role="button"
                    aria-label={`${cluster.items.length} events`}
                    tabIndex={0}
                    onClick={() => centerOnAxisYear(cluster.axisYear, 2.2)}
                  >
                    <circle cx={eventX} cy={y} r={9} fill={colors.event} />
                    <text className="cluster-label" x={eventX} y={y + 3} textAnchor="middle">
                      {cluster.items.length}
                    </text>
                  </g>
                )
              }
              return (
                <g
                  key={item.id}
                  role="button"
                  aria-label={item.name}
                  tabIndex={0}
                  onClick={() => onSelect(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelect(item)
                  }}
                >
                  <circle cx={eventX} cy={y} r={6} fill={colors.event} />
                  {(zoomLevel >= 2.1 || item.id === selectedId) && (
                    <text
                      className="event-label"
                      x={placement?.labelX ?? eventX + 9}
                      y={y + 3}
                      textAnchor={placement?.anchor ?? 'start'}
                    >
                      <tspan className="event-label-date">
                        {placement?.date ?? formatDate(item.date)}
                      </tspan>
                      {placement?.title && (
                        <tspan className="event-label-title">
                          {' · '}{placement.title}
                        </tspan>
                      )}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <div
        ref={peopleScrollRef}
        className="people-scroll"
        data-testid="people-scroll"
        aria-label="Characters; scroll vertically"
      >
        <svg
          ref={peopleRef}
          className="people-svg"
          data-testid="people-canvas"
          width={width}
          height={peopleHeight}
          role="group"
          aria-label="Character lifespans"
        >
          <defs>
            {people.map((person) => (
              <RangeGradient
                key={person.id}
                id={`person-${person.id}`}
                color={person.color ?? (person.consolidatedGroup ? '#a98348' : colors.person)}
                fuzzyStart={isUncertain(person.start)}
                fuzzyEnd={isUncertain(person.end)}
              />
            ))}
          </defs>
          <rect width={width} height={peopleHeight} fill="#fbf8ef" />
          <g className="people-grid">
            {ticks.map((tick) => (
              <line key={tick} x1={x(tick)} x2={x(tick)} y1={0} y2={peopleHeight} />
            ))}
            <line className="era-line" x1={x(0)} x2={x(0)} y1={0} y2={peopleHeight} />
          </g>

          {secondaryEvents.length > 0 && (
            <g
              className="chronology-layer"
              aria-label="Expanded chronology detail layer"
            >
              <rect
                className="chronology-layer-bg"
                x={0}
                y={0}
                width={width}
                height={chronologyLayerHeight - 12}
              />
              <text className="chronology-layer-title" x={28} y={18}>
                Expanded chronology
              </text>
              {chronologyLayout.map((entry) => {
                const { cluster, lane, labelWidth, labelAnchor, showLabel } = entry
                const item = cluster.items[0]
                const eventX = x(cluster.axisYear)
                const y = CHRONOLOGY_TOP + lane * CHRONOLOGY_LANE_HEIGHT
                const isGroup = cluster.items.length > 1
                const isSelected = item.id === selectedId
                const [rangeStart, rangeEnd] = dateSpan(item)
                const rangeWidth = Math.max(3, x(rangeEnd) - x(rangeStart))
                const labelX = labelAnchor === 'end' ? eventX - 8 : eventX + 8
                const chipX =
                  labelAnchor === 'end' ? labelX - labelWidth - 7 : labelX - 7
                const title =
                  isGroup
                    ? `${cluster.items.length} records`
                    : fitSvgLabel(item.name, labelWidth - 48, 4.6)
                const openCluster = () => {
                  if (isGroup && zoomLevel >= 6) {
                    onSelectGroup(cluster.items)
                  } else if (isGroup) {
                    centerOnAxisYear(
                      cluster.axisYear,
                      Math.min(80, Math.max(3, transform.k * 2.2))
                    )
                  } else {
                    onSelect(item)
                  }
                }
                return (
                  <g
                    key={cluster.items.map((entry) => entry.id).join('-')}
                    className={`${isSelected ? 'selected' : ''} ${showLabel ? 'labelled' : ''}`}
                    role="button"
                    aria-label={
                      isGroup
                        ? `${cluster.items.length} chronology events`
                        : item.name
                    }
                    tabIndex={0}
                    onClick={openCluster}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') openCluster()
                    }}
                  >
                    {!isGroup && item.endDate && zoomLevel >= 6 ? (
                      <rect
                        className="chronology-range"
                        x={x(rangeStart)}
                        y={y - 4}
                        width={rangeWidth}
                        height={8}
                        rx={4}
                      />
                    ) : (
                      <circle
                        cx={eventX}
                        cy={y}
                        r={isGroup ? 7 : isSelected ? 5.5 : 3.4}
                      />
                    )}
                    {isGroup && !showLabel && (
                      <text
                        className="cluster-label chronology-cluster-label"
                        x={eventX}
                        y={y + 3}
                        textAnchor="middle"
                      >
                        {cluster.items.length}
                      </text>
                    )}
                    {showLabel && (
                      <>
                        <rect
                          className="chronology-label-chip"
                          x={chipX}
                          y={y - 10}
                          width={labelWidth + 14}
                          height={20}
                          rx={10}
                        />
                        <text
                          className="event-label chronology-event-label"
                          x={labelX}
                          y={y + 3}
                          textAnchor={labelAnchor}
                        >
                          <tspan className="event-label-date">
                            {isGroup ? formatAxisYear(cluster.axisYear) : formatDate(item.date)}
                          </tspan>
                          <tspan className="event-label-title">
                            {' · '}{title}
                          </tspan>
                        </text>
                      </>
                    )}
                  </g>
                )
              })}
            </g>
          )}

          <g className={`people ${zoomLevel < 1.35 ? 'people-overview' : ''}`}>
              {laidOutPeople.map(({ person, lane }) => {
                const [start, end] = dateSpan(person)
                const barX = x(start)
                const barWidth = Math.max(5, x(end) - x(start))
                const y = peopleStartY + lane * LANE_HEIGHT
                const isSelected = person.id === selectedId
                const overlaps =
                  selectedSpan && start <= selectedSpan[1] && end >= selectedSpan[0]
                const isRelated = relatedIds.has(person.id)
                const dimmed = selected && !isSelected && !overlaps && !isRelated
                return (
                  <g
                    key={person.id}
                    className={`person ${isSelected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
                    role="button"
                    aria-label={person.name}
                    tabIndex={0}
                    onClick={() => onSelect(person)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') onSelect(person)
                    }}
                  >
                    <rect
                      x={barX}
                      y={y}
                      width={barWidth}
                      height={isSelected ? 13 : 9}
                      rx={7}
                      fill={`url(#${gradientId(`person-${person.id}`)})`}
                      stroke={isRelated ? '#bd623e' : 'none'}
                      strokeWidth={3}
                    />
                    {(zoomLevel >= 2.2 || isSelected || focusedResultSet) && barWidth > 28 && (
                      <text className="person-name" x={barX + 4} y={y + PERSON_NAME_OFFSET}>
                        {person.name}
                        {person.consolidatedGroup ? ' ◇' : ''}
                      </text>
                    )}
                    {(zoomLevel >= 5 || isSelected) && (
                      <text className="date-label" x={barX + 4} y={y + PERSON_DATE_OFFSET}>
                        {formatDate(person.start)} – {formatDate(person.end)}
                      </text>
                    )}
                  </g>
                )
              })}
              {selected &&
                selected.relationships.map((relationship) => {
                  const from = laidOutPeople.find(({ person }) => person.id === selected.id)
                  const to = laidOutPeople.find(({ person }) => person.id === relationship.personId)
                  if (!from || !to) return null
                  const fromSpan = dateSpan(from.person)
                  const toSpan = dateSpan(to.person)
                  return (
                    <path
                      key={`${selected.id}-${relationship.personId}`}
                      className="relationship-line"
                      d={`M ${x((fromSpan[0] + fromSpan[1]) / 2)} ${peopleStartY + from.lane * LANE_HEIGHT}
                          C ${x((fromSpan[0] + fromSpan[1]) / 2)} ${peopleStartY + from.lane * LANE_HEIGHT - 24},
                            ${x((toSpan[0] + toSpan[1]) / 2)} ${peopleStartY + to.lane * LANE_HEIGHT - 24},
                            ${x((toSpan[0] + toSpan[1]) / 2)} ${peopleStartY + to.lane * LANE_HEIGHT}`}
                    />
                  )
                })}
          </g>
        </svg>
      </div>
    </section>
  )
}

function clusterEvents(
  events: TimelineEvent[],
  x: (value: number) => number,
  threshold: number
) {
  const sorted = [...events].sort((a, b) => eventAxisYear(a) - eventAxisYear(b))
  const clusters: { items: TimelineEvent[]; axisYear: number }[] = []
  sorted.forEach((event) => {
    const axisYear = eventAxisYear(event)
    const last = clusters.at(-1)
    if (last && threshold && Math.abs(x(axisYear) - x(last.axisYear)) < threshold) {
      last.items.push(event)
      last.axisYear =
        last.items.reduce((total, item) => total + eventAxisYear(item), 0) /
        last.items.length
    } else {
      clusters.push({ items: [event], axisYear })
    }
  })
  return clusters
}

function clusterChronologyEvents(
  events: TimelineEvent[],
  x: (value: number) => number,
  zoomLevel: number
) {
  if (zoomLevel >= 8) {
    const byYear = new Map<number, TimelineEvent[]>()
    events.forEach((event) => {
      const year = toAxisYear(event.date)
      const group = byYear.get(year) ?? []
      group.push(event)
      byYear.set(year, group)
    })
    return [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([axisYear, items]) => ({ axisYear, items }))
  }
  return clusterEvents(events, x, zoomLevel < 2 ? 26 : 16)
}

function layoutChronologyLayer(
  clusters: { items: TimelineEvent[]; axisYear: number }[],
  x: (value: number) => number,
  width: number,
  zoomLevel: number,
  focusedResultSet: boolean,
  selectedId?: string
) {
  const showAllLabels = focusedResultSet || zoomLevel >= 12
  const laneEnds = Array.from({ length: CHRONOLOGY_LANES }, () => -Infinity)
  return [...clusters]
    .sort((a, b) => x(a.axisYear) - x(b.axisYear))
    .map((cluster) => {
      const eventX = x(cluster.axisYear)
      const item = cluster.items[0]
      const isGroup = cluster.items.length > 1
      const mustShowLabel = cluster.items.some((entry) => entry.id === selectedId)
      let showLabel = showAllLabels || mustShowLabel
      const rawLabelWidth = isGroup
        ? 74
        : Math.min(
            138,
            Math.max(86, formatDate(item.date).length * 4.6 + item.name.length * 4.2)
          )
      const labelWidth = showLabel ? rawLabelWidth : 0
      const rightSpace = width - eventX - 18
      const leftSpace = eventX - 18
      const labelAnchor =
        rightSpace >= labelWidth || rightSpace >= leftSpace ? 'start' : 'end'
      const labelStart = labelAnchor === 'end' ? eventX - labelWidth - 24 : eventX - 10
      const labelEnd = labelAnchor === 'end' ? eventX + 10 : eventX + labelWidth + 24
      const fitsViewport = labelStart >= 8 && labelEnd <= width - 8
      if (showLabel && !fitsViewport) {
        showLabel = false
      }
      let lane = showLabel
        ? laneEnds.findIndex((laneEnd) => labelStart > laneEnd)
        : -1
      if (showLabel && lane === -1 && !mustShowLabel) {
        showLabel = false
      }
      const footprint = showLabel ? 22 : isGroup ? 26 : 18
      if (lane === -1) {
        lane = laneEnds.findIndex((laneEnd) => eventX - footprint / 2 > laneEnd)
      }
      if (lane === -1) {
        lane = laneEnds.indexOf(Math.min(...laneEnds))
      }
      laneEnds[lane] = showLabel ? labelEnd + 8 : eventX + footprint / 2 + 6
      return { cluster, lane, labelWidth, labelAnchor: labelAnchor as 'start' | 'end', showLabel }
    })
}

function eventAxisYear(event: TimelineEvent) {
  const [start, end] = dateSpan(event)
  return (start + end) / 2
}

export function fitSvgLabel(
  label: string,
  availableWidth: number,
  averageCharacterWidth: number
) {
  const characterLimit = Math.floor(availableWidth / averageCharacterWidth)
  if (characterLimit < 4) return ''
  if (label.length <= characterLimit) return label
  return `${label.slice(0, characterLimit - 1).trimEnd()}…`
}

export function layoutEventLabels(
  labels: { id: string; x: number; date: string; title: string }[],
  width: number
) {
  const sorted = [...labels].sort((a, b) => a.x - b.x)
  const lanes = [[], [], []] as (typeof sorted)[]
  sorted.forEach((entry, index) => lanes[index % lanes.length].push(entry))

  return lanes.flatMap((laneEntries, lane) =>
    laneEntries.map((entry, index) => {
      const previous = laneEntries[index - 1]
      const next = laneEntries[index + 1]
      const cellStart = previous ? (previous.x + entry.x) / 2 + 5 : 8
      const cellEnd = next ? (entry.x + next.x) / 2 - 5 : width - 8
      const rightSpace = cellEnd - (entry.x + 9)
      const leftSpace = entry.x - 9 - cellStart
      const placeLeft = rightSpace < 62 && leftSpace > rightSpace
      const availableWidth = Math.max(0, placeLeft ? leftSpace : rightSpace)
      const dateWidth = entry.date.length * 4.7
      const titleWidth = Math.max(0, availableWidth - dateWidth - 8)
      const title =
        titleWidth >= 18 ? fitSvgLabel(entry.title, titleWidth, 4.7) : ''

      return {
        ...entry,
        title,
        lane,
        cellStart,
        cellEnd,
        labelX: placeLeft ? entry.x - 9 : entry.x + 9,
        anchor: placeLeft ? ('end' as const) : ('start' as const)
      }
    })
  )
}

function gradientId(value: string) {
  return `range-${value.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function RangeGradient({
  id,
  color,
  fuzzyStart,
  fuzzyEnd
}: {
  id: string
  color: string
  fuzzyStart: boolean
  fuzzyEnd: boolean
}) {
  return (
    <linearGradient id={gradientId(id)} x1="0%" x2="100%" y1="0%" y2="0%">
      <stop offset="0%" stopColor={color} stopOpacity={fuzzyStart ? 0 : 1} />
      {fuzzyStart && <stop offset="14%" stopColor={color} stopOpacity={1} />}
      {fuzzyEnd && <stop offset="86%" stopColor={color} stopOpacity={1} />}
      <stop offset="100%" stopColor={color} stopOpacity={fuzzyEnd ? 0 : 1} />
    </linearGradient>
  )
}
