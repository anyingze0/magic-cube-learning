import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Alg, Move } from 'cubing/alg'

type PlayerMove = { family: string; amount: number }
type MoveSpec = { axis: 'x' | 'y' | 'z'; layers: number[]; direction: number }
type Cubie = { group: THREE.Group; coord: THREE.Vector3 }
export type CubeMotion = { id: number; moves: string[] }
type CubeViewProps = {
  setupAlg?: string; className?: string; motion?: CubeMotion; speed?: number; paused?: boolean
  onProgress?: (id: number, completed: number) => void
  onComplete?: (id: number) => void
  onReady?: (ready: boolean) => void
}
type Turn = { move: PlayerMove; axis: THREE.Vector3; angle: number; elapsed: number; starts: { cubie: Cubie; position: THREE.Vector3; quaternion: THREE.Quaternion }[] }

const spacing = 1.05
const bodySize = 0.94
const colors: Record<string, number> = {
  U: 0xffd331,
  D: 0xf8f7f1,
  // 标准配色在“黄顶、绿前”的教学持握方式下：右橙、左红、底白。
  R: 0xff8b38,
  L: 0xe84b42,
  F: 0x25a96a,
  B: 0x3477d3,
}

function parseMoves(source: string): PlayerMove[] {
  if (!source.trim()) return []
  return Array.from(new Alg(source).experimentalExpand())
    .filter((item): item is Move => item instanceof Move)
    .map(move => ({ family: move.family, amount: move.amount }))
}

function moveSpec(family: string): MoveSpec | null {
  const key = family === 'Rw' ? 'r' : family === 'Lw' ? 'l' : family === 'Uw' ? 'u' : family === 'Dw' ? 'd' : family === 'Fw' ? 'f' : family === 'Bw' ? 'b' : family
  const specs: Record<string, MoveSpec> = {
    R: { axis: 'x', layers: [1], direction: -1 }, L: { axis: 'x', layers: [-1], direction: 1 },
    U: { axis: 'y', layers: [1], direction: -1 }, D: { axis: 'y', layers: [-1], direction: 1 },
    F: { axis: 'z', layers: [1], direction: -1 }, B: { axis: 'z', layers: [-1], direction: 1 },
    M: { axis: 'x', layers: [0], direction: 1 }, E: { axis: 'y', layers: [0], direction: 1 }, S: { axis: 'z', layers: [0], direction: -1 },
    r: { axis: 'x', layers: [0, 1], direction: -1 }, l: { axis: 'x', layers: [-1, 0], direction: 1 },
    u: { axis: 'y', layers: [0, 1], direction: -1 }, d: { axis: 'y', layers: [-1, 0], direction: 1 },
    f: { axis: 'z', layers: [0, 1], direction: -1 }, b: { axis: 'z', layers: [-1, 0], direction: 1 },
    x: { axis: 'x', layers: [-1, 0, 1], direction: -1 }, y: { axis: 'y', layers: [-1, 0, 1], direction: -1 }, z: { axis: 'z', layers: [-1, 0, 1], direction: -1 },
  }
  return specs[key] ?? null
}

export class ThreeCube {
  private scene: THREE.Scene
  private root = new THREE.Group()
  private cubies: Cubie[] = []
  private pending: PlayerMove[] = []
  private turn: Turn | null = null
  private completed = 0
  private onStep?: (completed: number) => void
  private onDone?: () => void
  private bodyGeometry = new THREE.BoxGeometry(bodySize, bodySize, bodySize)
  private stickerGeometry = new THREE.PlaneGeometry(0.72, 0.72)
  private bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x141615, roughness: 0.32, metalness: 0.18 })
  private stickerMaterials = Object.fromEntries(Object.entries(colors).map(([face, color]) => [face, new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.04 })])) as Record<string, THREE.MeshStandardMaterial>

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.root.rotation.set(0.06, -0.08, 0)
    this.scene.add(this.root)
    this.reset()
  }

  reset() {
    this.pending = []
    this.turn = null
    this.onStep = undefined
    this.onDone = undefined
    this.root.clear()
    this.cubies = []
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (x === 0 && y === 0 && z === 0) continue
      const group = new THREE.Group()
      group.position.set(x * spacing, y * spacing, z * spacing)
      group.add(new THREE.Mesh(this.bodyGeometry, this.bodyMaterial))
      if (x === 1) this.addSticker(group, new THREE.Vector3(1, 0, 0), 'R')
      if (x === -1) this.addSticker(group, new THREE.Vector3(-1, 0, 0), 'L')
      if (y === 1) this.addSticker(group, new THREE.Vector3(0, 1, 0), 'U')
      if (y === -1) this.addSticker(group, new THREE.Vector3(0, -1, 0), 'D')
      if (z === 1) this.addSticker(group, new THREE.Vector3(0, 0, 1), 'F')
      if (z === -1) this.addSticker(group, new THREE.Vector3(0, 0, -1), 'B')
      this.root.add(group)
      this.cubies.push({ group, coord: new THREE.Vector3(x, y, z) })
    }
  }

  setAlgorithm(source: string) {
    this.reset()
    for (const move of parseMoves(source)) this.apply(move)
  }

  private addSticker(group: THREE.Group, normal: THREE.Vector3, face: string) {
    const sticker = new THREE.Mesh(this.stickerGeometry, this.stickerMaterials[face])
    sticker.position.copy(normal.clone().multiplyScalar(bodySize / 2 + 0.006))
    sticker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    group.add(sticker)
  }

  play(moves: string[], onStep: (completed: number) => void, onDone: () => void) {
    this.pending = moves.flatMap(parseMoves)
    this.completed = 0
    this.onStep = onStep
    this.onDone = onDone
  }

  update(delta: number, speed: number, paused: boolean) {
    if (paused || !this.onDone) return
    // Consume time at the current rate so changing speed preserves turn progress.
    let remaining = delta * speed
    do {
      if (!this.turn) {
        const move = this.pending.shift()
        if (!move) {
          const done = this.onDone
          this.onStep = undefined
          this.onDone = undefined
          done?.()
          return
        }
        const spec = moveSpec(move.family)
        if (!spec) throw new Error('Unsupported move: ' + move.family)
        const amount = move.amount % 4
        const turns = amount > 2 ? amount - 4 : amount < -2 ? amount + 4 : amount
        const axis = new THREE.Vector3(spec.axis === 'x' ? 1 : 0, spec.axis === 'y' ? 1 : 0, spec.axis === 'z' ? 1 : 0)
        this.turn = { move, axis, angle: spec.direction * turns * Math.PI / 2, elapsed: 0, starts: this.cubies
          .filter(cubie => spec.layers.includes(cubie.coord[spec.axis]))
          .map(cubie => ({ cubie, position: cubie.group.position.clone(), quaternion: cubie.group.quaternion.clone() })) }
      }
      const turn = this.turn
      const elapsed = Math.min(remaining, 450 - turn.elapsed)
      turn.elapsed += elapsed
      remaining -= elapsed
      const t = turn.elapsed / 450
      const eased = t * t * (3 - 2 * t)
      const rotation = new THREE.Quaternion().setFromAxisAngle(turn.axis, turn.angle * eased)
      for (const { cubie, position, quaternion } of turn.starts) {
        cubie.group.position.copy(position).applyQuaternion(rotation)
        cubie.group.quaternion.copy(quaternion).premultiply(rotation)
      }
      if (t < 1) return
      // Commit from exact starting transforms to avoid accumulated position drift.
      for (const { cubie, position, quaternion } of turn.starts) {
        cubie.group.position.copy(position)
        cubie.group.quaternion.copy(quaternion)
      }
      this.apply(turn.move)
      this.turn = null
      this.onStep?.(++this.completed)
    } while (remaining >= 0 && this.onDone)
  }

  private apply(move: PlayerMove) {
    const spec = moveSpec(move.family)
    if (!spec) return
    const amount = move.amount % 4
    const turns = amount > 2 ? amount - 4 : amount < -2 ? amount + 4 : amount
    if (turns === 0) return
    const axisVector = spec.axis === 'x' ? new THREE.Vector3(1, 0, 0) : spec.axis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axisVector, spec.direction * turns * Math.PI / 2)
    const component = spec.axis === 'x' ? 'x' : spec.axis === 'y' ? 'y' : 'z'
    for (const cubie of this.cubies.filter(item => spec.layers.includes(Math.round(item.coord[component])))) {
      cubie.coord.applyQuaternion(quaternion).round()
      cubie.group.position.copy(cubie.coord).multiplyScalar(spacing)
      cubie.group.quaternion.premultiply(quaternion).normalize()
    }
  }

  dispose() {
    this.pending = []
    this.turn = null
    this.onStep = undefined
    this.onDone = undefined
    this.bodyGeometry.dispose()
    this.stickerGeometry.dispose()
    this.bodyMaterial.dispose()
    Object.values(this.stickerMaterials).forEach(material => material.dispose())
    this.scene.remove(this.root)
  }
}

export function CubeView({ setupAlg = '', className = '', motion, speed = 1, paused = false, onProgress, onComplete, onReady }: CubeViewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<ThreeCube | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const liveRef = useRef({ speed, paused, onProgress, onComplete, onReady })
  liveRef.current = { speed, paused, onProgress, onComplete, onReady }
  const [webglReady, setWebglReady] = useState(false)
  const [view, setView] = useState<'yellow-top' | 'white-bottom'>('yellow-top')
  const step = useMemo(() => setupAlg.trim() ? parseMoves(setupAlg).length : 0, [setupAlg])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let frame = 0
    let disposed = false
    let renderer: THREE.WebGLRenderer | null = null
    let controls: OrbitControls | null = null
    let cube: ThreeCube | null = null
    let observer: ResizeObserver | null = null
    try {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
      camera.position.set(4.7, 4.3, 5.6)
      cameraRef.current = camera
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.className = 'three-canvas'
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.touchAction = 'none'
      host.replaceChildren(renderer.domElement)
      scene.add(new THREE.HemisphereLight(0xffffff, 0x111412, 2.5))
      const key = new THREE.DirectionalLight(0xffffff, 2.4)
      key.position.set(4, 6, 5)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0x8cb8ff, 1.3)
      rim.position.set(-5, 2, -4)
      scene.add(rim)
      cube = new ThreeCube(scene)
      rendererRef.current = cube
      controls = new OrbitControls(camera, renderer.domElement)
      controlsRef.current = controls
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.enablePan = false
      controls.minDistance = 5.1
      controls.maxDistance = 8
      controls.target.set(0, 0, 0)
      const resize = () => {
        const width = Math.max(host.clientWidth, 1)
        const height = Math.max(host.clientHeight, 1)
        renderer?.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()
      let lastTime: number | undefined
      const render = (now: number) => {
        if (disposed || !renderer || !controls) return
        const delta = lastTime === undefined ? 0 : Math.min(now - lastTime, 100)
        lastTime = now
        cube?.update(delta, liveRef.current.speed, liveRef.current.paused)
        controls.update()
        renderer.render(scene, camera)
        frame = requestAnimationFrame(render)
      }
      frame = requestAnimationFrame(render)
      setWebglReady(true)
      liveRef.current.onReady?.(true)
    } catch {
      setWebglReady(false)
      liveRef.current.onReady?.(false)
    }
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      controls?.dispose()
      cameraRef.current = null
      controlsRef.current = null
      cube?.dispose()
      renderer?.dispose()
      rendererRef.current = null
      if (host) host.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const cube = rendererRef.current
    if (!cube) return
    cube.setAlgorithm(setupAlg)
    if (motion) cube.play(motion.moves, completed => liveRef.current.onProgress?.(motion.id, completed), () => liveRef.current.onComplete?.(motion.id))
  }, [setupAlg, motion])

  useEffect(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    camera.position.set(4.7, view === 'yellow-top' ? 4.3 : -4.3, 5.6)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [view])

  const stickers = Array.from({ length: 9 }, (_, index) => index)
  return <div className={'cube-view ' + className + (webglReady ? ' webgl-ready' : '')} aria-label="可拖动旋转的真实 3D 三阶魔方">
    <div className="cube-fallback" aria-hidden="true">
      <div className="css-cube" style={{ transform: 'rotateX(-18deg) rotateY(' + (35 + step * 7) + 'deg)' }}>
        <div className="css-face css-front">{stickers.map(index => <i key={index} className={index === 4 ? 'sticker-orange' : index % 2 ? 'sticker-blue' : 'sticker-green'} />)}</div>
        <div className="css-face css-right">{stickers.map(index => <i key={index} className={index === 4 ? 'sticker-red' : index % 2 ? 'sticker-yellow' : 'sticker-green'} />)}</div>
        <div className="css-face css-top">{stickers.map(index => <i key={index} className={index === 4 ? 'sticker-yellow' : index % 3 ? 'sticker-white' : 'sticker-orange'} />)}</div>
      </div>
    </div>
    <div ref={hostRef} className="three-host" />
    <div className="cube-view-toggle" aria-label="魔方观察视角">
      <button className={view === 'yellow-top' ? 'active' : ''} aria-pressed={view === 'yellow-top'} onClick={() => setView('yellow-top')}>黄顶</button>
      <button className={view === 'white-bottom' ? 'active' : ''} aria-pressed={view === 'white-bottom'} onClick={() => setView('white-bottom')}>白底</button>
    </div>
  </div>
}
