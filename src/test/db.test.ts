import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { db, factoryReset, initializeDatabase, saveItem } from '../db'

describe('local persistence', () => {
  afterEach(async () => {
    await db.items.clear()
  })

  it('initializes and restores the starter dataset', async () => {
    const initial = await initializeDatabase()
    expect(initial).toHaveLength(92)
    await db.items.clear()
    const restored = await factoryReset()
    expect(restored).toHaveLength(92)
  })

  it('persists edits by ID', async () => {
    const [item] = await initializeDatabase()
    await saveItem({ ...item, name: 'Edited name' })
    expect((await db.items.get(item.id))?.name).toBe('Edited name')
  })
})
