import { expect, test } from '@playwright/test'

test('search, select, zoom, and open the editor', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bible Timeline' })).toBeVisible()
  await page.getByLabel('Search timeline').fill('Jesus')
  await expect(page.getByText('2 people')).toBeVisible()
  await page.getByRole('button', { name: 'Jesus', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Jesus details' })).toBeVisible()
  await page.getByRole('button', { name: /Edit/ }).click()
  await expect(page.getByText('Edit item')).toBeVisible()
})

test('opens data controls and add form on tablet', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Data/ }).click()
  await expect(page.getByRole('button', { name: /Export backup/ })).toBeVisible()
  await page.getByRole('button', { name: /Add point/ }).click()
  await expect(page.getByText('New item')).toBeVisible()
})

test('keeps context fixed while characters scroll both directions', async ({ page }) => {
  await page.goto('/')
  const context = page.getByTestId('timeline-context')
  const people = page.getByTestId('people-scroll')
  const contextTop = (await context.boundingBox())?.y

  await people.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect.poll(() => people.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect((await context.boundingBox())?.y).toBe(contextTop)

  await people.evaluate((element) => {
    element.scrollTop = 0
  })
  await expect.poll(() => people.evaluate((element) => element.scrollTop)).toBe(0)
  expect((await context.boundingBox())?.y).toBe(contextTop)
})

test('zooms from the character canvas without disabling vertical scrolling', async ({ page }) => {
  await page.goto('/')
  const people = page.getByTestId('people-scroll')
  const canvas = page.getByTestId('people-canvas')
  const firstBar = page.locator('.person rect').first()
  const before = Number(await firstBar.getAttribute('x'))
  await canvas.evaluate((element) => {
    element.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 400,
        clientY: 240,
        ctrlKey: true,
        deltaY: -40
      })
    )
  })
  await expect.poll(async () => Number(await firstBar.getAttribute('x'))).not.toBe(before)

  await people.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect.poll(() => people.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
})

test('pans the shared timeline by dragging the character canvas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(300)

  const canvas = page.getByTestId('people-canvas')
  const firstBar = page.locator('.person rect').first()
  const before = Number(await firstBar.getAttribute('x'))
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()

  await page.mouse.move(bounds!.x + 280, bounds!.y + 180)
  await page.mouse.down()
  await page.mouse.move(bounds!.x + 460, bounds!.y + 180, { steps: 4 })
  await page.mouse.up()

  await expect.poll(async () => Number(await firstBar.getAttribute('x'))).not.toBe(before)
})

test('enters an immersive full-viewport timeline and exits with Escape', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter immersive mode' }).click()

  await expect(page.locator('.app-shell')).toHaveClass(/immersive/)
  await expect(page.getByRole('heading', { name: 'Bible Timeline' })).toBeHidden()
  await expect(page.getByLabel('Search timeline')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Exit immersive mode' })).toBeVisible()
  await expect
    .poll(() => page.getByRole('region', { name: 'Interactive timeline' }).evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(700)

  await page.keyboard.press('Escape')
  await expect(page.locator('.app-shell')).not.toHaveClass(/immersive/)
  await expect(page.getByRole('heading', { name: 'Bible Timeline' })).toBeVisible()
})

test('opens directly in immersive mode from a shareable query parameter', async ({ page }) => {
  await page.goto('/?immersive=1&view=timeline')

  await expect(page.locator('.app-shell')).toHaveClass(/immersive/)
  await expect(page.getByRole('button', { name: 'Exit immersive mode' })).toBeVisible()
  await expect(page).toHaveURL(/immersive=1/)
  await expect(page).toHaveURL(/view=timeline/)

  await page.getByRole('button', { name: 'Exit immersive mode' }).click()
  await expect(page.locator('.app-shell')).not.toHaveClass(/immersive/)
  await expect(page).not.toHaveURL(/immersive=/)
  await expect(page).toHaveURL(/view=timeline/)
})

test('keeps timeline controls below the fixed context labels', async ({ page }) => {
  await page.goto('/')
  const controls = page.locator('.timeline-controls')
  const context = page.getByTestId('timeline-context')
  const card = page.getByRole('region', { name: 'Interactive timeline' })
  const controlBox = await controls.boundingBox()
  const contextBox = await context.boundingBox()
  const cardBox = await card.boundingBox()

  expect(controlBox).not.toBeNull()
  expect(contextBox).not.toBeNull()
  expect(cardBox).not.toBeNull()
  expect(controlBox!.y).toBeGreaterThan(contextBox!.y + contextBox!.height)
  expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width)
})

test('keeps interaction help outside the fixed time context', async ({ page }) => {
  await page.goto('/')
  const help = page.locator('.timeline-help')
  const context = page.getByTestId('timeline-context')
  const card = page.getByRole('region', { name: 'Interactive timeline' })
  const helpBox = await help.boundingBox()
  const contextBox = await context.boundingBox()
  const cardBox = await card.boundingBox()

  expect(helpBox).not.toBeNull()
  expect(contextBox).not.toBeNull()
  expect(cardBox).not.toBeNull()
  expect(helpBox!.y).toBeGreaterThan(contextBox!.y + contextBox!.height)
  expect(helpBox!.x).toBeGreaterThanOrEqual(cardBox!.x)
})

test('keeps a person name, bar, and dates in one compact block', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search timeline').fill('Asa')
  const person = page.getByRole('button', { name: 'Asa', exact: true })
  const name = person.locator('.person-name')
  const bar = person.locator('rect')
  const dates = person.locator('.date-label')

  await expect(name).toBeVisible()
  await expect(dates).toBeVisible()
  const nameY = Number(await name.getAttribute('y'))
  const barY = Number(await bar.getAttribute('y'))
  const dateY = Number(await dates.getAttribute('y'))

  expect(barY - nameY).toBe(3)
  expect(dateY - barY).toBe(16)
})

test('keeps first-row names visible after scrolling back to the top', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(300)
  const people = page.getByTestId('people-scroll')
  await people.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await people.evaluate((element) => {
    element.scrollTop = 0
  })

  await expect(page.locator('.people-scroll-hint')).toHaveCount(0)
  await expect(page.locator('.person-name').first()).toBeVisible()
})
