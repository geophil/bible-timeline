import { z } from 'zod'

export const dateSchema = z.object({
  year: z.number().int().positive(),
  era: z.enum(['BCE', 'CE']),
  qualifiers: z
    .array(
      z.enum([
        'exact',
        'approximate',
        'after',
        'before',
        'alternative',
        'transition'
      ])
    )
    .optional(),
  alternativeYear: z.number().int().positive().optional(),
  original: z.string().optional()
})

export const sourceSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  url: z.string().url(),
  section: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  locator: z.string().optional()
})

const base = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()),
  color: z.string().optional(),
  image: z.string().optional(),
  sources: z.array(sourceSchema),
  aliases: z.array(z.string()).optional()
}

const personSchema = z.object({
  ...base,
  type: z.literal('person'),
  start: dateSchema,
  end: dateSchema,
  periodId: z.string().optional(),
  consolidatedGroup: z.string().optional(),
  scriptureReferences: z.array(z.string()),
  relationships: z.array(
    z.object({ personId: z.string(), type: z.string().min(1) })
  )
})

const eventSchema = z.object({
  ...base,
  type: z.literal('event'),
  date: dateSchema,
  endDate: dateSchema.optional(),
  periodId: z.string().optional(),
  scriptureReferences: z.array(z.string()),
  publicationReferences: z.array(z.string()).optional(),
  relatedPersonIds: z.array(z.string()).optional(),
  importance: z.enum(['major', 'secondary']).optional(),
  provenance: z
    .object({
      datasetId: z.literal('jw-dates-calendar-bce'),
      sourceRecordId: z.string(),
      sourceParagraph: z.string(),
      dateSourceParagraph: z.string(),
      rowType: z.enum(['dated', 'continuation']),
      immutable: z.literal(true)
    })
    .optional()
})

const rangeSchema = (type: 'period' | 'power') =>
  z.object({
    ...base,
    type: z.literal(type),
    start: dateSchema,
    end: dateSchema.optional()
  })

export const timelineItemSchema = z.discriminatedUnion('type', [
  personSchema,
  eventSchema,
  rangeSchema('period'),
  rangeSchema('power')
])

export const datasetSchema = z.object({
  schemaVersion: z.literal(2),
  exportedAt: z.string().optional(),
  items: z.array(timelineItemSchema)
})

export const legacyDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().optional(),
  items: z.array(timelineItemSchema)
})

const chronologyDetailSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(48),
  date: dateSchema,
  endDate: dateSchema.optional(),
  source: sourceSchema,
  scriptureReferences: z.array(z.string()),
  publicationReferences: z.array(z.string()),
  tags: z.array(z.string())
})

export const expandedChronologyBundleSchema = z.object({
  schemaVersion: z.literal(1),
  datasetId: z.literal('jw-dates-calendar-bce'),
  generatedAt: z.string(),
  source: sourceSchema,
  sourceRecordCount: z.number().int().positive(),
  events: z.array(eventSchema),
  enrichments: z.array(
    chronologyDetailSchema.extend({
      targetItemIds: z.array(z.string()).min(1)
    })
  )
})
