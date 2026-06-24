import { z } from 'zod'

const dateSchema = z.object({
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

const sourceSchema = z.object({
  section: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  url: z.string().url()
})

const base = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()),
  color: z.string().optional(),
  image: z.string().optional(),
  sources: z.array(sourceSchema)
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
  periodId: z.string().optional(),
  scriptureReferences: z.array(z.string())
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
  schemaVersion: z.literal(1),
  exportedAt: z.string().optional(),
  items: z.array(timelineItemSchema)
})
