import Dexie, { type EntityTable } from 'dexie'
import { starterDataset } from './seed'
import type { TimelineItem } from './types'

class TimelineDatabase extends Dexie {
  items!: EntityTable<TimelineItem, 'id'>

  constructor() {
    super('bible-timeline')
    this.version(1).stores({
      items: 'id, type, name'
    })
  }
}

export const db = new TimelineDatabase()

export async function initializeDatabase() {
  if ((await db.items.count()) === 0) {
    await db.items.bulkPut(structuredClone(starterDataset.items))
  }
  return db.items.toArray()
}

export async function saveItem(item: TimelineItem) {
  await db.items.put(item)
}

export async function deleteItem(id: string) {
  await db.items.delete(id)
}

export async function replaceAll(items: TimelineItem[]) {
  await db.transaction('rw', db.items, async () => {
    await db.items.clear()
    await db.items.bulkPut(items)
  })
}

export async function mergeAll(items: TimelineItem[]) {
  await db.items.bulkPut(items)
}

export async function factoryReset() {
  await replaceAll(structuredClone(starterDataset.items))
  return db.items.toArray()
}
