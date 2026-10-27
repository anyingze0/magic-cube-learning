import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'
import * as THREE from 'three'
import { Alg, Move } from 'cubing/alg'
import { applyAlg, solvedCube, toFacelets } from '@moishy/cubing-core'

// Transpile into the ignored dependency cache; no browser or WebGL is required.
const cache = new URL('../node_modules/.cache/cube-flow-checks/', import.meta.url)
await mkdir(cache, { recursive: true })
async function compile(source, target) {
  const text = await readFile(new URL(source, import.meta.url), 'utf8')
  const result = await transformWithOxc(text, source)
  const output = new URL(target, cache)
  await writeFile(output, result.code)
  return import(output.href)
}
const { ThreeCube } = await compile('../src/components/CubeView.tsx', 'CubeView.mjs')
const { ALL_CASES } = await compile('../src/data.ts', 'data.mjs')
const split = source => Array.from(new Alg(source).experimentalExpand()).filter(move => move instanceof Move).map(move => move.toString())
const cube = new ThreeCube(new THREE.Scene())

// Read actual sticker transforms and compare with an independent cube engine.
const normals = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] }
const byColor = { ffd331: 'U', ff8b38: 'R', '25a96a': 'F', f8f7f1: 'D', e84b42: 'L', '3477d3': 'B' }
function facelets() {
  const faces = Object.fromEntries(Object.keys(normals).map(face => [face, Array(9)]))
  for (const cubie of cube.cubies) {
    const [x, y, z] = cubie.coord.toArray()
    for (const sticker of cubie.group.children.slice(1)) {
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(sticker.quaternion).applyQuaternion(cubie.group.quaternion).round().toArray()
      const face = Object.keys(normals).find(key => normals[key].every((v, i) => v === normal[i]))
      const [row, col] = face === 'U' ? [z + 1, x + 1] : face === 'D' ? [1 - z, x + 1]
        : face === 'F' ? [1 - y, x + 1] : face === 'B' ? [1 - y, 1 - x]
        : face === 'R' ? [1 - y, 1 - z] : [1 - y, z + 1]
      faces[face][row * 3 + col] = byColor[sticker.material.color.getHexString()]
    }
  }
  return Object.values(faces).flat().join('')
}
function run(moves, speed = 1) {
  let done = 0, completed = 0
  cube.play(moves, step => { completed = step }, () => { done++ })
  for (let frame = 0; frame < moves.length * 120 + 1 && !done; frame++) cube.update(16, speed, false)
  assert.equal(done, 1)
  assert.equal(completed, moves.length)
}
function transforms() {
  return cube.cubies.map(({ group }) => [...group.position.toArray(), ...group.quaternion.toArray()])
}

let forms = 0
for (const family of [...Object.keys(normals), 'M', 'E', 'S', 'r', 'l', 'u', 'd', 'f', 'b', 'x', 'y', 'z', 'Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw']) {
  for (const suffix of ['', "'", '2', "2'"]) {
    const move = family + suffix
    cube.reset(); run([move])
    const referenceMove = move.replace(/^([RLUDFB])w/, (_, face) => face.toLowerCase())
    assert.equal(facelets(), toFacelets(applyAlg(solvedCube(), referenceMove)), move)
    forms++
  }
}

let variants = 0
for (const item of ALL_CASES) for (const algorithm of item.alts) {
  const inverse = new Alg(algorithm).invert().toString()
  cube.reset(); run(split(inverse), 2)
  assert.equal(facelets(), toFacelets(applyAlg(solvedCube(), inverse)), item.id + ' inverse')
  for (const cubie of cube.cubies) assert.ok(cubie.group.position.distanceTo(cubie.coord.clone().multiplyScalar(1.05)) < 1e-10)
  run(split(algorithm), 2)
  assert.equal(facelets(), toFacelets(solvedCube()), item.id + ' round trip')
  // Forward playback initializes the case instantly and queues only the solution.
  cube.setAlgorithm(inverse)
  assert.equal(facelets(), toFacelets(applyAlg(solvedCube(), inverse)), item.id + ' instant setup')
  const forward = split(algorithm)
  let forwardSteps = 0, forwardDone = 0
  cube.play(forward, step => { forwardSteps = step }, () => forwardDone++)
  assert.equal(forwardSteps, 0, item.id + ' forward starts at zero')
  cube.update(450, 1, false)
  assert.equal(forwardSteps, 1, item.id + ' first callback must be forward step one')
  assert.equal(facelets(), toFacelets(applyAlg(solvedCube(), inverse + ' ' + forward[0])), item.id + ' first animation is forward move')
  for (let frame = 0; frame < forward.length * 120 + 1 && !forwardDone; frame++) cube.update(16, 2, false)
  assert.equal(forwardDone, 1, item.id + ' forward completion fires once')
  assert.equal(forwardSteps, forward.length, item.id + ' only forward moves are counted')
  assert.equal(facelets(), toFacelets(solvedCube()), item.id + ' instant setup followed by solution')
  variants++
}

for (const speed of [0.25, 1, 2]) {
  cube.reset()
  let finished = false
  cube.play(['R'], () => {}, () => { finished = true })
  cube.update(450 / speed - 1, speed, false)
  assert.equal(finished, false, 'turn must not complete early at ' + speed)
  cube.update(1, speed, false)
  assert.equal(finished, true, 'each turn must take 450ms / speed')
}

cube.reset()
const moving = cube.cubies.find(cubie => cubie.coord.equals(new THREE.Vector3(1, 1, 0)))
const fixed = cube.cubies.find(cubie => cubie.coord.equals(new THREE.Vector3(-1, 1, 0)))
const fixedPosition = fixed.group.position.clone()
cube.play(['R'], () => {}, () => {})
cube.update(225, 1, false)
const halfway = new THREE.Vector3(1.05, 1.05, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 4)
assert.ok(moving.group.position.distanceTo(halfway) < 1e-10, 'halfway must visibly rotate the R layer')
assert.ok(fixed.group.position.equals(fixedPosition), 'other layers must remain fixed')

cube.reset()
let done = 0
cube.play(['R'], () => {}, () => done++)
cube.update(100, 1, false)
const partial = transforms()
cube.update(5000, 2, true)
assert.deepEqual(transforms(), partial, 'pause must freeze a partial turn')
cube.update(174, 2, false)
assert.equal(done, 0)
cube.update(1, 2, false)
assert.equal(done, 1, 'speed must change the remaining duration immediately')
assert.equal(facelets(), toFacelets(applyAlg(solvedCube(), 'R')))

cube.play(['U', 'F'], () => {}, () => done++)
cube.update(100, 1, false)
cube.reset()
cube.update(5000, 1, false)
assert.equal(done, 1, 'reset must cancel old completion callbacks')
assert.equal(facelets(), toFacelets(solvedCube()))

const moves = split(ALL_CASES[0].alg)
cube.reset(); run(moves.slice(0, 5))
run(split(new Alg(moves.slice(2, 5).join(' ')).invert().toString()))
assert.equal(facelets(), toFacelets(applyAlg(solvedCube(), moves.slice(0, 2).join(' '))), 'backward jump')
cube.dispose()
console.log('PASS: ' + forms + ' move forms; ' + ALL_CASES.length + ' cases / ' + variants + ' variants; instant forward setup, first forward move, exact progress, pause, live speed, reset cancellation and backward jump.')
