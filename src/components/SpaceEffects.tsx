import { useEffect, useRef } from 'react'

type Star = { x: number; y: number; radius: number; phase: number; speed: number }
type Meteor = { x: number; y: number; distance: number; speed: number; length: number; life: number }
type Spark = { x: number; y: number; vx: number; vy: number; size: number; rotation: number; age: number; life: number; color: string }
const colors = ['#77f7ff', '#c4a0ff', '#ffade9', '#e9fbff']

/** Decorative canvases never participate in hit testing or React's render loop. */
export function SpaceEffects() {
  const skyRef = useRef<HTMLCanvasElement>(null)
  const trailRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const sky = skyRef.current
    const trail = trailRef.current
    const background = sky?.getContext('2d')
    const foreground = trail?.getContext('2d')
    if (!sky || !trail || !background || !foreground) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(any-pointer: fine)')
    let width = 0, height = 0, frame = 0, lastTime = 0, elapsed = 0, nextMeteor = 1.2
    let stars: Star[] = []
    let meteors: Meteor[] = []
    let sparks: Spark[] = []
    let previous: { x: number; y: number } | null = null
    let lastEmission = 0

    const drawSky = () => {
      background.clearRect(0, 0, width, height)
      for (const star of stars) {
        const alpha = 0.32 + (Math.sin(elapsed * star.speed + star.phase) + 1) * 0.28
        background.fillStyle = 'rgba(198, 220, 255, ' + alpha + ')'
        background.beginPath()
        background.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        background.fill()
        if (star.radius > 1.3) {
          background.strokeStyle = 'rgba(174, 216, 255, ' + alpha * 0.38 + ')'
          background.lineWidth = 0.6
          background.beginPath()
          background.moveTo(star.x - 4, star.y)
          background.lineTo(star.x + 4, star.y)
          background.moveTo(star.x, star.y - 4)
          background.lineTo(star.x, star.y + 4)
          background.stroke()
        }
      }
      for (const meteor of meteors) {
        const x = meteor.x - meteor.distance * 0.8
        const y = meteor.y + meteor.distance * 0.6
        const glow = background.createLinearGradient(x, y, x + meteor.length * 0.8, y - meteor.length * 0.6)
        glow.addColorStop(0, '#e3ffff')
        glow.addColorStop(0.15, '#86e8ffb0')
        glow.addColorStop(1, '#ac7aff00')
        background.strokeStyle = glow
        background.lineWidth = 1.7
        background.beginPath()
        background.moveTo(x, y)
        background.lineTo(x + meteor.length * 0.8, y - meteor.length * 0.6)
        background.stroke()
        background.fillStyle = '#efffff'
        background.beginPath()
        background.arc(x, y, 1.8, 0, Math.PI * 2)
        background.fill()
      }
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      for (const [canvas, context] of [[sky, background], [trail, foreground]] as const) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
        context.setTransform(ratio, 0, 0, ratio, 0, 0)
      }
      const count = Math.min(width < 720 ? 70 : 180, Math.round(width * height / 6500))
      stars = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.25 + 0.35, phase: Math.random() * Math.PI * 2, speed: Math.random() * 1.2 + 0.4 }))
      sparks = []
      previous = null
      drawSky()
    }

    const emit = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches || document.hidden) return
      const now = performance.now()
      if (now - lastEmission < 14) return
      const { clientX: x, clientY: y } = event
      const start = previous ?? { x, y }
      const distance = Math.hypot(x - start.x, y - start.y)
      const steps = Math.min(8, Math.max(1, Math.ceil(distance / 9)))
      for (let i = 1; i <= steps; i++) {
        // Do not bridge the viewport when the cursor returns from another window.
        const t = distance > 240 ? 1 : i / steps
        sparks.push({ x: start.x + (x - start.x) * t + (Math.random() - 0.5) * 8, y: start.y + (y - start.y) * t + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 30, vy: Math.random() * 20 + 8, size: Math.random() * 3.5 + 2, rotation: Math.random() * Math.PI, age: 0, life: Math.random() * 0.4 + 0.6, color: colors[Math.floor(Math.random() * colors.length)] })
      }
      if (sparks.length > 150) sparks.splice(0, sparks.length - 150)
      previous = { x, y }
      lastEmission = now
    }

    const render = (now: number) => {
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0
      lastTime = now
      elapsed += delta
      if (elapsed >= nextMeteor) {
        if (meteors.length < (width < 720 ? 1 : 2)) meteors.push({ x: width * (0.25 + Math.random() * 0.85), y: -40 + Math.random() * height * 0.15, distance: 0, speed: 480 + Math.random() * 220, length: 130 + Math.random() * 120, life: 1.8 })
        nextMeteor = elapsed + 3 + Math.random() * 3 + (width < 720 ? 2 : 0)
      }
      for (const meteor of meteors) { meteor.distance += delta * meteor.speed; meteor.life -= delta }
      meteors = meteors.filter(meteor => meteor.life > 0)
      drawSky()
      foreground.clearRect(0, 0, width, height)
      for (const spark of sparks) {
        spark.age += delta
        spark.x += spark.vx * delta
        spark.y += spark.vy * delta
        spark.rotation += delta * 0.7
        const remaining = Math.max(0, 1 - spark.age / spark.life)
        const size = spark.size * remaining
        foreground.save()
        foreground.translate(spark.x, spark.y)
        foreground.rotate(spark.rotation)
        foreground.globalAlpha = remaining
        foreground.fillStyle = spark.color
        foreground.shadowColor = spark.color
        foreground.shadowBlur = 9
        foreground.beginPath()
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4
          const radius = i % 2 === 0 ? size * 1.7 : size * 0.38
          const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius
          if (i === 0) foreground.moveTo(x, y); else foreground.lineTo(x, y)
        }
        foreground.closePath()
        foreground.fill()
        foreground.restore()
      }
      sparks = sparks.filter(spark => spark.age < spark.life)
      frame = requestAnimationFrame(render)
    }

    const syncAnimation = () => {
      cancelAnimationFrame(frame)
      lastTime = 0
      sparks = []
      meteors = []
      previous = null
      foreground.clearRect(0, 0, width, height)
      if (!document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(render)
      else drawSky()
    }
    const resetPointer = () => { previous = null }
    const onPointerOut = (event: PointerEvent) => { if (!event.relatedTarget) resetPointer() }
    resize()
    syncAnimation()
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('pointermove', emit, { passive: true, capture: true })
    window.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('blur', resetPointer)
    document.addEventListener('visibilitychange', syncAnimation)
    reducedMotion.addEventListener('change', syncAnimation)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', emit, true)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('blur', resetPointer)
      document.removeEventListener('visibilitychange', syncAnimation)
      reducedMotion.removeEventListener('change', syncAnimation)
    }
  }, [])

  return <>
    <div className="space-background" aria-hidden="true">
      <div className="aurora aurora-purple" /><div className="aurora aurora-cyan" /><div className="aurora aurora-pink" />
      <canvas ref={skyRef} className="star-field" />
    </div>
    <canvas ref={trailRef} className="star-trail" aria-hidden="true" />
  </>
}
