import { datasetSchema } from './schema'
import type { TimelineDataset, TimelineItem } from './types'

export function createBackup(items: TimelineItem[]): TimelineDataset {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    items
  }
}

export function parseBackup(value: unknown): TimelineDataset {
  return datasetSchema.parse(value)
}

export function downloadBackup(items: TimelineItem[]) {
  const data = JSON.stringify(createBackup(items), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `bible-timeline-${new Date().toISOString().slice(0, 10)}.bible-timeline.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readBackupFile(file: File) {
  return parseBackup(JSON.parse(await file.text()))
}

export async function resizeImage(file: File, maxSize = 1200): Promise<string> {
  const source = await fileToDataUrl(file)
  const image = await loadImage(source)
  const ratio = Math.min(1, maxSize / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * ratio))
  canvas.height = Math.max(1, Math.round(image.height * ratio))
  const context = canvas.getContext('2d')
  if (!context) return source
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.84)
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = source
  })
}
