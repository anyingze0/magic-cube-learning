import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Use a locally installed Playwright or set PLAYWRIGHT_MODULE_PATH to a bundled installation.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const baseURL = process.env.CUBE_TEST_URL || 'http://127.0.0.1:5173/'
const output = new URL('../artifacts/notation-checks/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.CUBE_TEST_BROWSER || 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const storageKey = 'cube-flow.notation.v1'
const originalProgress = { mastered: ['OLL-01'], review: ['OLL-02'], lastCase: 'OLL-01' }
const preferences = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
const openSettings = async () => {
  await page.getByRole('button', { name: '公式设置', exact: true }).first().click()
  await page.getByRole('dialog', { name: '公式设置', exact: true }).waitFor()
}
const closeSettings = async name => {
  await page.getByRole('button', { name, exact: true }).click()
  await page.getByRole('dialog', { name: '公式设置', exact: true }).waitFor({ state: 'detached' })
}
const labelInput = token => page.getByRole('textbox', { name: token + ' 中文口令', exact: true })
const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'page must fit viewport')
const poll = async predicate => {
  await page.waitForFunction(predicate, null, { timeout: 30000 })
}
try {
  await page.goto(baseURL)
  await page.evaluate(progress => localStorage.setItem('cube-flow.progress.v1', JSON.stringify(progress)), originalProgress)
  await page.goto(baseURL + '#/learn/oll')
  await page.reload()
  await page.locator('.detail-alg h3').waitFor()
  const original = await page.locator('.detail-alg h3').textContent()
  assert.equal(await page.getByRole('button', { name: '原式', exact: true }).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: '中文', exact: true }).click()
  assert.match(await page.locator('.detail-alg h3').textContent(), /上 · 顶面转180° · 右右 · 顺/)
  assert.notEqual(await page.locator('.detail-alg h3').textContent(), original)
  await openSettings()
  assert.match(await page.locator('.notation-preview').textContent(), /顺 · 右 · 上 · 下 · 右右/)
  assert.equal(await page.locator('.notation-field-row input').count(), 54)
  await labelInput('R').fill('自定义抬手')
  assert.match(await page.locator('.notation-preview').textContent(), /自定义抬手 · 下 · 右右/)
  await closeSettings('取消')
  assert.equal((await preferences()).labels.R, undefined, 'cancel must not save drafts')
  await openSettings()
  await labelInput('R').fill('自定义抬手')
  await labelInput("R'").fill('自定义下压')
  await labelInput('R2').fill('双右')
  await labelInput('M').fill('中层自定义')
  await closeSettings('保存')
  assert.deepEqual((await preferences()).labels, { R: '自定义抬手', "R'": '自定义下压', R2: '双右', M: '中层自定义' })
  await page.getByRole('button', { name: '练习当前案例', exact: true }).click()
  await poll(() => !document.querySelector('.playback-primary')?.disabled)
  assert.match(await page.locator('.solve-alg strong').textContent(), /自定义抬手/)
  assert.match(await page.locator('.move-guide .move-chips').textContent(), /自定义下压/)
  assert.equal(await page.locator('.formula-mode button[aria-pressed=true]').count(), 2)
  await page.reload()
  await poll(() => !document.querySelector('.playback-primary')?.disabled)
  assert.match(await page.locator('.solve-alg strong').textContent(), /自定义抬手/)
  const savedProgress = await page.evaluate(() => JSON.parse(localStorage.getItem('cube-flow.progress.v1')))
  assert.deepEqual(savedProgress.mastered, originalProgress.mastered)
  assert.deepEqual(savedProgress.review, originalProgress.review)

  // Instrument the real renderer in this isolated browser context, without altering application code.
  await page.evaluate(async () => {
    const { ThreeCube } = await import('/src/components/CubeView.tsx')
    window.__cubeCheck = { setups: [], queues: [], cube: null, speed: 1, paused: false }
    const setAlgorithm = ThreeCube.prototype.setAlgorithm
    const play = ThreeCube.prototype.play
    const update = ThreeCube.prototype.update
    ThreeCube.prototype.setAlgorithm = function (source) { window.__cubeCheck.setups.push(source); return setAlgorithm.call(this, source) }
    ThreeCube.prototype.play = function (moves, ...callbacks) { window.__cubeCheck.cube = this; window.__cubeCheck.queues.push([...moves]); return play.call(this, moves, ...callbacks) }
    ThreeCube.prototype.update = function (delta, speed, paused) {
      window.__cubeCheck.speed = speed; window.__cubeCheck.paused = paused
      return update.call(this, delta, speed, paused)
    }
  })
  const getCommands = () => page.evaluate(() => ({ setups: window.__cubeCheck.setups, queues: window.__cubeCheck.queues }))
  // Advance the same renderer without depending on software GPU frame throughput in headless Chrome.
  const finishMoves = async () => page.evaluate(() => {
    const check = window.__cubeCheck
    check.cube.update(60000, check.speed, check.paused)
  })
  const reset = async () => page.getByRole('button', { name: '停止重置', exact: true }).click()
  const forward = async () => {
    await page.getByRole('button', { name: '播放正公式', exact: true }).click()
    await poll(() => window.__cubeCheck.queues.length > 0)
    const commands = await getCommands()
    assert.ok(commands.setups.at(-1).length > 0, 'forward must initialize the case instantly')
    const forwardCount = await page.locator('.solve-move-chips>span').count()
    assert.equal(commands.queues.at(-1).length, forwardCount, 'forward queue must contain only solution moves')
    const original = await page.locator('.solve-alg strong').getAttribute('title')
    assert.equal(commands.queues.at(-1)[0], original.split(' ')[0], 'first animation must be the first forward move')
    assert.match(await page.locator('.trainer-count').textContent(), /正公式/)
    assert.equal(await page.locator('.solve-move-chips .active').count(), 1)
    return commands
  }
  await page.locator('#turn-speed').fill('0.25')
  await forward()
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  const pausedCount = await page.locator('.trainer-count').textContent()
  const queuesBefore = (await getCommands()).queues.length
  await page.getByRole('button', { name: '原式', exact: true }).first().click()
  await page.waitForTimeout(250)
  assert.equal(await page.locator('.trainer-count').textContent(), pausedCount)
  assert.equal((await getCommands()).queues.length, queuesBefore, 'display switch must not restart animation')
  await page.getByRole('button', { name: '继续', exact: true }).click()
  await page.locator('#turn-speed').fill('2')
  await poll(() => window.__cubeCheck.speed === 2 && !window.__cubeCheck.paused)
  await finishMoves()
  await poll(() => document.querySelector('.playback-status')?.textContent.includes('魔方已还原'))
  assert.equal(await page.locator('.solve-move-chips .active').count(), 0)
  const allSteps = await page.locator('.solve-move-chips>span').count()
  assert.equal(await page.locator('.solve-move-chips .played').count(), allSteps)
  assert.equal(await page.locator('.trainer-count>span').textContent(), String(allSteps))
  assert.match(await page.locator('.trainer-count small').textContent(), new RegExp('/ ' + allSteps + ' 正公式'))
  assert.equal(await page.locator('.move-guide .played').count(), 0, 'forward must not advance inverse guide')
  await forward()
  await reset()
  assert.equal(await page.locator('.trainer-count>span').textContent(), '0')
  assert.equal((await getCommands()).setups.at(-1), '')
  assert.equal(await page.locator('.solve-move-chips').count(), 0)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await finishMoves()
  await poll(() => !document.querySelector('.playback-primary')?.disabled)
  assert.equal(await page.locator('.trainer-count>span').textContent(), '1')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await finishMoves()
  await poll(() => !document.querySelector('.playback-primary')?.disabled)
  assert.equal(await page.locator('.trainer-count>span').textContent(), '0')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await finishMoves()
  await poll(() => !document.querySelector('.playback-primary')?.disabled)
  const fromPartial = await forward()
  assert.ok(fromPartial.setups.at(-1).split(' ').length > 1, 'partial inverse state must be replaced by full case setup')
  await reset()
  await page.getByRole('button', { name: '播放逆公式', exact: true }).click()
  await finishMoves()
  await poll(() => document.querySelector('.playback-status')?.textContent.includes('目标情况已做出'))
  await forward()
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  await reset()
  await page.waitForTimeout(300)
  assert.equal(await page.locator('.trainer-count>span').textContent(), '0', 'reset must cancel paused playback')

  // Editing, cancellation, restoration and responsive layout share the same real UI.
  await page.getByRole('button', { name: '中文', exact: true }).first().click()
  await openSettings()
  await page.getByRole('button', { name: '恢复默认', exact: true }).click()
  assert.match(await page.locator('.notation-preview').textContent(), /顺 · 右 · 上 · 下 · 右右/)
  await closeSettings('取消')
  assert.equal((await preferences()).labels.R, '自定义抬手')
  await openSettings()
  await page.getByRole('button', { name: '恢复默认', exact: true }).click()
  await closeSettings('保存')
  assert.deepEqual((await preferences()).labels, {})
  await openSettings()
  await labelInput('R').fill('测试长中文口令右手向上转动并保持持握方向')
  await closeSettings('保存')
  await noOverflow()
  await page.screenshot({ path: fileURLToPath(new URL('practice-desktop.png', output)), fullPage: true })
  await openSettings()
  await page.screenshot({ path: fileURLToPath(new URL('settings-desktop.png', output)) })
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0)
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await noOverflow()
    await page.screenshot({ path: fileURLToPath(new URL('practice-mobile-' + width + '.png', output)), fullPage: true })
    await openSettings()
    assert.equal(await page.locator('dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth), true)
    await page.screenshot({ path: fileURLToPath(new URL('settings-mobile-' + width + '.png', output)) })
    await closeSettings('取消')
  }
  await page.getByRole('button', { name: '返回案例库', exact: true }).click()
  assert.match(await page.locator('.detail-alg h3').textContent(), /测试长中文口令/)
  await noOverflow()
  await page.screenshot({ path: fileURLToPath(new URL('library-mobile.png', output)), fullPage: true })
  assert.deepEqual(errors, [], 'browser must not report uncaught errors')
  console.log('PASS: real browser persistence, independent overrides, cancel/restore, page sync, direct forward start, completion, replay, partial/complete inverse starts, pause, speed, reset; desktop/390px/320px layout. Screenshots: artifacts/notation-checks/')
} catch (error) {
  console.error('UI failure state:', { status: await page.locator('.playback-status').textContent().catch(() => ''), counter: await page.locator('.trainer-count').textContent().catch(() => ''), errors })
  throw error
} finally { await browser.close() }
