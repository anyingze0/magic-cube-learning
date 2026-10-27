import assert from 'node:assert/strict'
import { addFormulaTiming, formatDuration, formulaTimingKey } from '../src/lib/timing.ts'

assert.equal(formatDuration(0), '00:00.00')
assert.equal(formatDuration(9), '00:00.00')
assert.equal(formatDuration(1234), '00:01.23')
assert.equal(formatDuration(61_234), '01:01.23')
assert.equal(formatDuration(3_661_230), '1:01:01.23')
assert.equal(formatDuration(Number.NaN), '00:00.00')

const first = addFormulaTiming(undefined, 1234.6)
assert.deepEqual(first, { lastMs: 1235, bestMs: 1235, totalMs: 1235, attempts: 1 })
const second = addFormulaTiming(first, 800.2)
assert.deepEqual(second, { lastMs: 800, bestMs: 800, totalMs: 2035, attempts: 2 })
const third = addFormulaTiming(second, 2000)
assert.deepEqual(third, { lastMs: 2000, bestMs: 800, totalMs: 4035, attempts: 3 })

assert.notEqual(formulaTimingKey('OLL-01', "R U R'"), formulaTimingKey('OLL-01', "R U2 R'"))
assert.notEqual(formulaTimingKey('OLL-01', "R U R'"), formulaTimingKey('OLL-02', "R U R'"))
console.log('PASS: duration formatting and independent formula timing aggregation.')
