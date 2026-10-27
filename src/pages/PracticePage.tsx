import { ArrowLeft, ArrowRight, Check, ChevronRight, Info, Pause, Play, RotateCcw, Shuffle, Sparkles, Square, Timer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CASE_BY_ID, OLL_CASES, PLL_CASES, type AlgCase, type Stage } from '../data'
import { CaseDiagram } from '../components/CaseDiagram'
import { CubeView, type CubeMotion } from '../components/CubeView'
import { invertAlg, splitMoves } from '../lib/cube'
import type { Progress } from '../lib/progress'
import { FormulaControls, useNotation } from '../components/NotationSettings'
import { formatDuration, formulaTimingKey } from '../lib/timing'

type Props = { stage: Stage; initialCaseId?: string; progress: Progress; setLastCase: (id: string) => void; markCase: (id: string, mastered: boolean) => void; recordTiming: (caseId: string, algorithm: string, durationMs: number) => void; onNavigate: (path: string) => void }
type Playback = {
  setup: string; motion?: CubeMotion; kind: 'inverse' | 'forward' | 'manual'
  status: 'idle' | 'playing' | 'paused' | 'complete'; completed: number; from: number; target: number
}
type TimerState = { startedAt: number | null; now: number; resultMs: number | null }
const idlePlayback: Playback = { setup: '', kind: 'manual', status: 'idle', completed: 0, from: 0, target: 0 }
const idleTimer: TimerState = { startedAt: null, now: 0, resultMs: null }
export function PracticePage({ stage, initialCaseId, progress, setLastCase, markCase, recordTiming, onNavigate }: Props) {
  const { displayMode, formatMove, formatAlgorithm } = useNotation()
  const items = stage === 'oll' ? OLL_CASES : PLL_CASES
  const [selectedId, setSelectedId] = useState(initialCaseId && CASE_BY_ID[initialCaseId]?.stage === stage ? initialCaseId : items[0].id)
  const [step, setStep] = useState(0)
  const [variant, setVariant] = useState(0)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [speed, setSpeed] = useState(1)
  const [ready, setReady] = useState<boolean | null>(null)
  const [playback, setPlayback] = useState<Playback>(idlePlayback)
  const [timer, setTimer] = useState<TimerState>(idleTimer)
  const sequence = useRef(0)
  const selected = CASE_BY_ID[selectedId] ?? items[0]
  const algorithm = selected.alts[variant] ?? selected.alg
  const timingKey = formulaTimingKey(selected.id, algorithm)
  const timing = progress.timings?.[timingKey]
  const timerRunning = timer.startedAt !== null
  const displayedMs = timerRunning ? Math.max(0, timer.now - (timer.startedAt ?? timer.now)) : timer.resultMs ?? 0
  const averageMs = timing?.attempts ? timing.totalMs / timing.attempts : null
  const inverse = useMemo(() => invertAlg(algorithm), [algorithm])
  const inverseMoves = useMemo(() => splitMoves(inverse), [inverse])
  const forwardMoves = useMemo(() => splitMoves(algorithm), [algorithm])
  const locked = playback.status === 'playing' || playback.status === 'paused'
  const busy = locked || timerRunning
  const solving = playback.kind === 'forward'
  const solveStep = solving ? playback.completed : 0
  const count = solving ? solveStep : step
  const total = solving ? forwardMoves.length : inverseMoves.length
  const mastered = new Set(progress.mastered)
  const visible = items.filter(item => item.code.toLowerCase().includes(query.toLowerCase()) || item.name.includes(query))

  useEffect(() => {
    setLastCase(selected.id)
    window.history.replaceState(null, '', '#/practice/' + stage + '?case=' + selected.id)
  }, [selected.id, setLastCase, stage])
  useEffect(() => { setTimer(idleTimer) }, [timingKey])
  useEffect(() => {
    if (!timerRunning) return
    const interval = window.setInterval(() => setTimer(value => value.startedAt === null ? value : { ...value, now: performance.now() }), 50)
    return () => window.clearInterval(interval)
  }, [timerRunning])
  const reset = () => { sequence.current++; setPlayback({ ...idlePlayback }); setStep(0) }
  const choose = (item: AlgCase) => {
    if (busy) return
    reset(); setTimer(idleTimer); setSelectedId(item.id); setVariant(0); setNotice('')
  }
  const changeVariant = (next: number) => {
    if (busy) return
    reset(); setTimer(idleTimer); setVariant(next); setNotice('')
  }
  const start = (kind: 'inverse' | 'forward') => {
    if (busy || !ready) return
    setStep(0)
    setPlayback({ setup: kind === 'forward' ? inverse : '', motion: { id: ++sequence.current, moves: kind === 'inverse' ? inverseMoves : forwardMoves }, kind, status: 'playing', completed: 0, from: 0, target: kind === 'inverse' ? inverseMoves.length : 0 })
  }
  const goToStep = (target: number) => {
    if (busy || target === step || !ready) return
    const moves = target > step ? inverseMoves.slice(step, target) : splitMoves(invertAlg(inverseMoves.slice(target, step).join(' ')))
    setPlayback({ setup: inverseMoves.slice(0, step).join(' '), motion: { id: ++sequence.current, moves }, kind: 'manual', status: 'playing', completed: 0, from: step, target })
  }
  const onProgress = (id: number, completed: number) => {
    if (id !== sequence.current) return
    setPlayback(value => ({ ...value, completed }))
    if (playback.kind === 'manual') setStep(playback.from + Math.sign(playback.target - playback.from) * completed)
    else if (playback.kind === 'inverse') setStep(Math.min(completed, inverseMoves.length))
  }
  const onComplete = (id: number) => {
    if (id !== sequence.current) return
    setPlayback(value => ({ ...value, status: 'complete' }))
    setStep(playback.target)
  }
  const togglePause = () => setPlayback(value => ({ ...value, status: value.status === 'paused' ? 'playing' : 'paused' }))
  const startTimer = () => {
    if (locked || timerRunning) return
    const startedAt = performance.now()
    setTimer({ startedAt, now: startedAt, resultMs: null })
  }
  const stopTimer = () => {
    if (timer.startedAt === null) return
    const finishedAt = performance.now()
    const durationMs = Math.max(0, finishedAt - timer.startedAt)
    setTimer({ startedAt: null, now: finishedAt, resultMs: durationMs })
    recordTiming(selected.id, algorithm, durationMs)
  }
  const toggleTimer = () => { if (timerRunning) stopTimer(); else startTimer() }
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return
      if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="button"], [role="textbox"], [role="combobox"]')) return
      if (!timerRunning && locked) return
      event.preventDefault()
      if (timerRunning) stopTimer()
      else startTimer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [algorithm, locked, recordTiming, selected.id, timer.startedAt, timerRunning])
  const status = ready === false ? '当前浏览器无法启用 3D 动画，请使用支持 WebGL 的浏览器。'
    : ready === null ? '正在准备 3D 魔方…'
    : playback.status === 'paused' ? '已暂停 · 点击继续播放'
    : locked ? playback.kind === 'manual' ? '逐步转动中' : solving ? '正在播放正公式 · 从目标情况开始还原' : '正在播放逆公式 · 做出案例'
    : playback.status === 'complete' && playback.kind === 'forward' ? '正公式播放完成 · 魔方已还原'
    : step === inverseMoves.length ? '逆公式已完成 · 目标情况已做出' : '选择播放，或按下一步跟着做'
  const random = () => choose(items[Math.floor(Math.random() * items.length)])
  const mark = (didMaster: boolean) => { markCase(selected.id, didMaster); setNotice(didMaster ? '已记入掌握清单。保持这个节奏！' : '已标记为再练，下一轮会优先复习。') }
  return <main className="page-wrap inner-page practice-page">
    <div className="page-breadcrumb"><button onClick={() => onNavigate('/learn/' + stage)}><ArrowLeft size={15} />返回案例库</button><span>TRAIN / {stage.toUpperCase()} / {selected.code}</span></div>
    <section className="practice-heading"><div><span className="eyebrow">REVERSE GUIDANCE / STEP BY STEP</span><h1>{stage.toUpperCase()} · 逆公式练习</h1><p>逆公式从复原状态做出目标情况；正公式直接从目标情况开始还原。</p></div><button className="button button-plain" disabled={busy} onClick={random}><Shuffle size={16} />随机抽一个</button></section>
    <div className="practice-layout"><aside className="practice-sidebar"><div className="practice-side-head"><span>案例库</span><b>{items.length} CASES</b></div><input className="case-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索案例或形状" /><div className="practice-list">{visible.map(item => <button key={item.id} disabled={busy} className={'practice-row ' + (item.id === selected.id ? 'current' : '')} onClick={() => choose(item)}><span className="row-code">{item.code}</span><span className="row-name">{item.name}</span>{mastered.has(item.id) && <Check size={14} />}</button>)}</div><div className="side-progress"><span>本阶段进度</span><div><i style={{ width: Math.max(4, items.filter(item => mastered.has(item.id)).length / items.length * 100) + '%' }} /></div><small>{items.filter(item => mastered.has(item.id)).length} / {items.length} 已掌握</small></div></aside>
      <section className="trainer-panel">
        <div className="trainer-top"><div><span className="eyebrow">NOW TRAINING</span><h2>{selected.code} <small>{selected.name}</small></h2></div><div className="trainer-count"><span>{count}</span><small>/ {total} {solving ? '正公式' : '逆公式'} MOVES</small></div></div>
        <div className={'cube-training ' + (!locked && step === inverseMoves.length ? 'complete' : '')}>
          <CubeView setupAlg={playback.setup} motion={playback.motion} speed={speed} paused={playback.status === 'paused'} onProgress={onProgress} onComplete={onComplete} onReady={setReady} />
          <div className="cube-training-meta"><span><span className="status-dot" />{locked ? playback.status === 'paused' ? '已暂停' : solving ? '正在还原' : '正在转动' : solving ? '魔方已还原' : step === inverseMoves.length ? '目标情况已做出' : '跟着公式，慢慢转'}</span><span>DRAG TO ROTATE</span></div>
        </div>
        <div className="playback-panel" aria-label="公式动画播放控制">
          <div className="playback-actions">
            <button className="control-button playback-primary" disabled={busy || !ready} onClick={() => start('inverse')}><Play size={14} />播放逆公式</button>
            <button className="control-button" disabled={busy || !ready} onClick={() => start('forward')}><Play size={14} />播放正公式</button>
            <button className="control-button" disabled={!locked} onClick={togglePause}>{playback.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}{playback.status === 'paused' ? '继续' : '暂停'}</button>
            <button className="control-button" disabled={timerRunning} onClick={reset}><RotateCcw size={14} />停止重置</button>
          </div>
          <div className="playback-speed"><label htmlFor="turn-speed">转动速率</label><span>0.25×</span><input id="turn-speed" type="range" min="0.25" max="2" step="0.05" value={speed} disabled={timerRunning} onChange={event => setSpeed(Number(event.target.value))} aria-valuetext={speed.toFixed(2) + ' 倍速'} /><span>2×</span><output htmlFor="turn-speed">{speed.toFixed(2)}×</output></div>
          <p className="playback-status" role="status">{status}</p>
          <p className="playback-hint">正公式直接从目标情况开始还原；播放中可随时暂停和调速。</p>
        </div>
        <div className="move-guide">
          <div className="guide-head"><div><span className="eyebrow">逆公式引导</span><h3>先做出这个情况</h3></div><span className="guide-step">{step === inverseMoves.length ? 'READY' : 'STEP ' + String(step + 1).padStart(2, '0')}</span></div>
          <p>{selected.tip}</p>
          <FormulaControls />
          <div className={'move-chips' + (displayMode === 'chinese' ? ' chinese-move-chips' : '')}>{inverseMoves.map((move, index) => <button key={index} disabled={busy || !ready} className={index < step ? 'played' : index === step ? 'active' : ''} title={move} aria-label={'转到逆公式第 ' + (index + 1) + ' 步之前：' + move + '，' + formatMove(move)} onClick={() => goToStep(index)}>{formatMove(move)}</button>)}</div>
          <div className="guide-controls"><button className="control-button" disabled={busy || !ready || step === 0} onClick={() => goToStep(step - 1)}><ArrowLeft size={15} />上一步</button><button className="control-button" disabled={timerRunning} onClick={reset}><RotateCcw size={15} />重置</button><button className="control-button control-next" disabled={busy || !ready || step === inverseMoves.length} onClick={() => goToStep(step + 1)}>{step === inverseMoves.length ? '已完成' : '下一步'}<ArrowRight size={15} /></button></div>
        </div>
        <div className="solve-card">
          <div className="solve-card-top"><div><span className="eyebrow">NOW SOLVE IT</span><h3>用正公式，还原这个情况。</h3></div><CaseDiagram item={selected} size={82} /></div>
          <FormulaControls />
          <div className="solve-alg"><span>公式 {variant + 1} / {selected.alts.length}</span><strong title={algorithm}>{formatAlgorithm(algorithm)}</strong><div className="alg-switch"><button aria-label="上一条公式" disabled={busy || variant === 0} onClick={() => changeVariant(variant - 1)}><ArrowLeft size={14} /></button><button aria-label="下一条公式" disabled={busy || variant === selected.alts.length - 1} onClick={() => changeVariant(variant + 1)}><ArrowRight size={14} /></button></div></div>
          <section className={'formula-timer ' + (timerRunning ? 'running' : '')} aria-label="本公式计时">
            <div className="formula-timer-head"><span><Timer size={14} />本公式计时</span><small>公式 {variant + 1} · 独立记录</small></div>
            <div className="formula-timer-main">
              <output className="formula-timer-display" aria-label={'当前计时 ' + formatDuration(displayedMs)}>{formatDuration(displayedMs)}</output>
              <button type="button" className={'formula-timer-toggle ' + (timerRunning ? 'stop' : '')} disabled={!timerRunning && locked} onClick={toggleTimer}>
                {timerRunning ? <Square size={14} fill="currentColor" /> : <Timer size={15} />}
                {timerRunning ? '停止计时' : '开始计时'}
              </button>
            </div>
            <dl className="formula-timer-stats">
              <div><dt>上次</dt><dd>{timing ? formatDuration(timing.lastMs) : '--'}</dd></div>
              <div><dt>最佳</dt><dd>{timing ? formatDuration(timing.bestMs) : '--'}</dd></div>
              <div><dt>平均</dt><dd>{averageMs === null ? '--' : formatDuration(averageMs)}</dd></div>
              <div><dt>次数</dt><dd>{timing?.attempts ?? 0}</dd></div>
            </dl>
            <p>{timerRunning ? '计时中 · 按空格键或点击按钮完成本次记录。' : '按空格键或点击开始计时 · 成绩只记录到当前公式。'}</p>
          </section>
          {solving && <div className={'move-chips solve-move-chips' + (displayMode === 'chinese' ? ' chinese-move-chips' : '')} aria-label="正公式播放进度">{forwardMoves.map((move, index) => <span key={index} title={move} className={index < solveStep ? 'played' : index === solveStep ? 'active' : ''}>{formatMove(move)}</span>)}</div>}
          <div className="self-rate"><span>{timerRunning ? '先停止计时，再记录掌握情况。' : '这次练习完成了吗？'}</span><button disabled={timerRunning} onClick={() => mark(false)}>再练一次</button><button className="button button-dark" disabled={timerRunning} onClick={() => mark(true)}><Check size={15} />我会了</button></div>
          {notice && <div className="practice-notice"><Sparkles size={15} />{notice}</div>}
        </div>
        <div className="trainer-note"><Info size={15} /><span>小提示：用鼠标拖动魔方可以改变视角。逆公式负责做出情况，正公式负责还原。</span><button onClick={() => onNavigate('/learn/' + stage)}>查看识别图 <ChevronRight size={14} /></button></div>
      </section>
    </div>
  </main>
}
