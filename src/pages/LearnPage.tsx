import { ArrowLeft, ArrowRight, Check, ChevronRight, Lightbulb, Play, RotateCcw, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ALL_CASES, CASE_BY_ID, OLL_CASES, PLL_CASES, type AlgCase, type Stage } from '../data'
import { CaseDiagram } from '../components/CaseDiagram'
import { CubeView } from '../components/CubeView'
import type { Progress } from '../lib/progress'
import { FormulaControls, useNotation } from '../components/NotationSettings'

type Props = { kind: 'cross' | 'f2l' | Stage; progress: Progress; onNavigate: (path: string) => void }
const phaseCopy = {
  cross: { kicker: 'FOUNDATION / 01', title: 'Cross · 底层十字', lede: '从中心出发，建立你的第一层空间感。', label: 'THE FIRST LAYER', heading: '先找白色棱块，建立十字。', text: '以白色中心块为参照，先观察四个棱块的位置，再用最少的转动把它们送回底层。Cross 的目标是让每一条棱块的侧面颜色也和中心对齐。', points: ['中心块不会移动，是你的坐标系。', '先观察再转动，尽量减少底层重组。', '完成后检查四条侧边颜色是否对齐。'], next: 'f2l' as const },
  f2l: { kicker: 'PAIR & INSERT / 02', title: 'F2L · 前两层', lede: '找到一对，配好它，一次插入。', label: 'PAIR & INSERT', heading: '把角块和棱块配成一对。', text: 'F2L 的核心不是背公式，而是观察。找到一组角块和棱块，先在顶层配对，再从正确的槽位插入。熟悉后，你会开始在上一组插入时寻找下一组。', points: ['先找角块，再追踪对应棱块。', '配对动作尽量在顶层完成。', '插入后马上开始预判下一组。'], next: 'oll' as const },
}
export function LearnPage({ kind, progress, onNavigate }: Props) {
  if (kind === 'cross' || kind === 'f2l') {
    const copy = phaseCopy[kind]
    return <main className="page-wrap inner-page lesson-page">
      <div className="page-breadcrumb"><button onClick={() => onNavigate('/')}><ArrowLeft size={15} />返回首页</button><span>CFOP / {kind === 'cross' ? 'CROSS' : 'F2L'}</span></div>
      <section className="lesson-hero"><div className="lesson-heading"><span className="eyebrow">{copy.kicker}</span><h1>{copy.title}</h1><p>{copy.lede}</p></div><div className="lesson-counter"><span>STEP</span><b>{kind === 'cross' ? '01' : '02'}</b><i>/ 04</i></div></section>
      <section className="lesson-main"><div className="lesson-visual"><CubeView /><div className="visual-label"><span>DRAG TO ROTATE</span><span>3×3×3 / TRAINING VIEW</span></div></div><div className="lesson-content"><span className="eyebrow">{copy.label}</span><h2>{copy.heading}</h2><p>{copy.text}</p><div className="lesson-points">{copy.points.map((point, index) => <div key={point}><span>0{index + 1}</span><p>{point}</p></div>)}</div><div className="lesson-tip"><Lightbulb size={17} /><span><b>练习提示</b> 先慢一点，确保每次转动都知道自己在改变什么。</span></div><button className="button button-dark" onClick={() => onNavigate('/learn/' + copy.next)}>进入下一节 <ArrowRight size={16} /></button></div></section>
      <section className="lesson-footer"><span>下一步 / {copy.next.toUpperCase()}</span><span>{kind === 'cross' ? '从十字到配对' : '从配对到顶层朝向'} <ChevronRight size={14} /></span></section>
    </main>
  }
  return <CaseLibrary stage={kind} progress={progress} onNavigate={onNavigate} />
}

function CaseLibrary({ stage, progress, onNavigate }: { stage: Stage; progress: Progress; onNavigate: (path: string) => void }) {
  const { formatAlgorithm } = useNotation()
  const items = stage === 'oll' ? OLL_CASES : PLL_CASES
  const [selectedId, setSelectedId] = useState(items[0].id)
  const [filter, setFilter] = useState('全部')
  const selected = CASE_BY_ID[selectedId] ?? items[0]
  const filters = ['全部', ...Array.from(new Set(items.map(item => item.group)))]
  const visible = useMemo(() => items.filter(item => filter === '全部' || item.group === filter), [filter, items])
  const mastered = new Set(progress.mastered)
  return <main className="page-wrap inner-page library-page">
    <div className="page-breadcrumb"><button onClick={() => onNavigate('/')}><ArrowLeft size={15} />返回首页</button><span>CFOP / {stage.toUpperCase()} / CASE LIBRARY</span></div>
    <section className="library-heading"><div><span className="eyebrow">CASE LIBRARY / {stage === 'oll' ? '57 CASES' : '21 CASES'}</span><h1>{stage.toUpperCase()} · {stage === 'oll' ? '顶层朝向' : '顶层排列'}</h1><p>先看懂情况，再选择一条属于你的公式。每个案例都可以直接进入逆公式练习。</p></div><button className="button button-dark" onClick={() => onNavigate('/practice/' + stage + '?case=' + selected.id)}><Play size={16} fill="currentColor" />练习当前案例</button></section>
    <div className="library-layout"><aside className="library-sidebar"><div className="sidebar-title"><span>案例筛选</span><b>{items.length} CASES</b></div><div className="filter-chips">{filters.map(item => <button className={filter === item ? 'selected' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="case-grid">{visible.map(item => <button key={item.id} className={'case-tile ' + (selected.id === item.id ? 'selected' : '')} onClick={() => setSelectedId(item.id)}><CaseDiagram item={item} size={84} /><div className="case-tile-meta"><span>{item.code}</span><small>{item.name}</small>{mastered.has(item.id) && <Check size={13} />}</div></button>)}</div></aside><section className="case-detail"><div className="detail-top"><div><span className="eyebrow">{selected.code} / {selected.name}</span><h2>{selected.group}</h2></div><span className="detail-count">{items.findIndex(item => item.id === selected.id) + 1} <small>/ {items.length}</small></span></div><div className="detail-visual"><CaseDiagram item={selected} size={218} /><div><span className="diagram-caption">CASE RECOGNITION</span><p>{selected.tip}</p><div className="diagram-key"><span><i className="key-yellow" />顶层朝向</span><span><i className="key-band" />侧面颜色</span></div></div></div><div className="detail-alg"><div><span className="eyebrow">PRIMARY ALGORITHM</span><FormulaControls /><h3 title={selected.alg}>{formatAlgorithm(selected.alg)}</h3></div><button className="icon-button" onClick={() => onNavigate('/practice/' + stage + '?case=' + selected.id)}><Play size={16} /></button></div><div className="detail-footer"><span>{selected.alts.length} 条可选公式 · 先选最顺手的一条</span><button className="text-button" onClick={() => onNavigate('/practice/' + stage + '?case=' + selected.id)}>进入逆公式练习 <ArrowRight size={15} /></button></div></section></div>
    <div className="library-note"><Sparkles size={15} /><span>练习建议：先固定一个识别方向，连续练 5 次，再换下一个案例。</span><button onClick={() => onNavigate('/practice/' + stage + '?case=' + selected.id)}>开始练习 <ArrowRight size={14} /></button></div>
  </main>
}
