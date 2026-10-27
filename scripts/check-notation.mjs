import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'
const cache = new URL('../node_modules/.cache/cube-flow-checks/', import.meta.url)
await mkdir(cache, { recursive: true })
const source = await readFile(new URL('../src/lib/notation.ts', import.meta.url), 'utf8')
const compiled = await transformWithOxc(source, 'notation.ts')
const target = new URL('notation.mjs', cache)
await writeFile(target, compiled.code)
const { chineseMove, cleanMoveLabels, DEFAULT_MOVE_LABELS, MOVE_TOKENS, normalizeMoveToken, parseNotationPreferences } = await import(target.href)
assert.deepEqual(['F', 'U', 'R', "R'", 'R2'].map(move => chineseMove(move)), ['顺', '右', '上', '下', '右右'])
assert.deepEqual(['R', "R'", 'R2'].map(move => chineseMove(move, { R: '自定义上' })), ['自定义上', '下', '右右'])
assert.equal(chineseMove("L'"), '左面逆时针')
assert.equal(chineseMove('U2'), '顶面转180°')
assert.equal(chineseMove('Rw'), chineseMove('r'))
assert.equal(normalizeMoveToken("Rw2'"), 'r2')
assert.equal(chineseMove('R‘'), '下')
assert.equal(chineseMove("R2'"), '右右')
assert.equal(chineseMove('unknown'), 'unknown')
assert.equal(chineseMove('R', { R: '' }), '上')
for (const move of MOVE_TOKENS) assert.ok(DEFAULT_MOVE_LABELS[move] && chineseMove(move) !== move, move + ' needs a readable fallback')
const labels = cleanMoveLabels({ R: '  手势上  ', "R'": '下压', R2: '双右', U: '', F: 10, bad: 'invalid', M: 'a'.repeat(41) })
assert.deepEqual(labels, { R: '手势上', "R'": '下压', R2: '双右' })
assert.deepEqual(parseNotationPreferences(JSON.stringify({ displayMode: 'chinese', labels })), { displayMode: 'chinese', labels })
for (const raw of [null, '', '{broken', 'null', '42', '[]', '{"labels":null}']) {
  assert.deepEqual(parseNotationPreferences(raw), { displayMode: 'original', labels: {} })
}
assert.deepEqual(parseNotationPreferences('{"displayMode":"bad","labels":{"R":"抬"}}'), { displayMode: 'original', labels: { R: '抬' } })
console.log('PASS: ' + MOVE_TOKENS.length + ' complete move labels; presets, independent overrides, aliases, fallbacks and preference validation.')
