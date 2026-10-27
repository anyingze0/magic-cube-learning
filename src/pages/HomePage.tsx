import { ArrowRight, BookOpen, Check, CirclePlay, Flame, RotateCcw, Sparkles, Target, Timer, Trophy } from 'lucide-react'
import type { Progress } from '../lib/progress'
import { CubeView } from '../components/CubeView'

type Props = { progress: Progress; onNavigate: (path: string) => void }
const stages = [
  { id: 'cross', n: '01', code: 'CROSS', title: '底层十字', text: '从中心出发，建立空间感。', tint: 'stage-peach', count: '2 个单元' },
  { id: 'f2l', n: '02', code: 'F2L', title: '前两层', text: '观察配对，一次插入。', tint: 'stage-lime', count: '41 个案例' },
  { id: 'oll', n: '03', code: 'OLL', title: '顶层朝向', text: '让顶面颜色统一。', tint: 'stage-blue', count: '57 个案例' },
  { id: 'pll', n: '04', code: 'PLL', title: '顶层排列', text: '把每一块送回位置。', tint: 'stage-orange', count: '21 个案例' },
]
export function HomePage({ progress, onNavigate }: Props) {
  const masteredCount = progress.mastered.length
  const percent = Math.round(masteredCount / 78 * 100)
  const lastStage = progress.lastCase.startsWith('PLL') ? 'pll' : 'oll'
  return <main className="home page-wrap">
    <section className="hero-panel">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={14} /> SPEEDCUBING, MADE CLEAR</div>
        <h1>每一次转动，<br /><span>都更有把握。</span></h1>
        <p className="hero-lede">从第一个十字，到最后一个 PLL。用清晰的 CFOP 路径，把公式练成直觉。</p>
        <div className="hero-actions">
          <button className="button button-dark" onClick={() => onNavigate('/practice/' + lastStage + '?case=' + progress.lastCase)}><CirclePlay size={17} />继续上次练习</button>
          <button className="button button-plain" onClick={() => onNavigate('/learn/cross')}>浏览学习路径 <ArrowRight size={16} /></button>
        </div>
        <div className="hero-metrics">
          <div><strong>78</strong><span>OLL + PLL 案例</span></div><i />
          <div><strong>{masteredCount}</strong><span>已掌握案例</span></div><i />
          <div><strong>{percent}<small>%</small></strong><span>训练进度</span></div>
        </div>
      </div>
      <div className="hero-product">
        <span className="product-index">CFOP / 3×3×3</span>
        <CubeView className="hero-cube" />
        <span className="product-caption">TURN WITH INTENTION <b>✳</b> LEARN WITH FLOW</span>
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      </div>
      <span className="hero-vertical">CUBE FLOW · TRAINING SYSTEM</span>
    </section>

    <section className="section-heading">
      <div><span className="eyebrow">THE METHOD / 01—04</span><h2>四步，建立你的速拧系统。</h2></div>
      <span className="section-aside">从理解结构，到稳定输出</span>
    </section>
    <section className="stage-grid">
      {stages.map(item => <button className={'stage-card ' + item.tint} key={item.id} onClick={() => onNavigate('/learn/' + item.id)}>
        <div className="stage-card-top"><span>{item.n}</span><span>{item.code}</span></div>
        <h3>{item.title}</h3><p>{item.text}</p>
        <div className="stage-card-bottom"><span>{item.count}</span><ArrowRight size={17} /></div>
      </button>)}
    </section>

    <section className="home-bottom">
      <div className="inverse-promo">
        <div className="promo-index">A BETTER WAY TO PRACTICE <span>02 / 03</span></div>
        <h2>别只背公式。<br /><em>先把情况做出来。</em></h2>
        <p>选一个 OLL 或 PLL，跟着逆公式一步一步转出目标情况，再用正公式练习还原。</p>
        <button className="button button-paper" onClick={() => onNavigate('/learn/oll')}>探索案例库 <ArrowRight size={16} /></button>
        <span className="promo-mark">CF</span>
      </div>
      <div className="progress-panel">
        <div className="progress-panel-head"><div><span className="eyebrow">YOUR FLOW</span><h3>进度，正在发生。</h3></div><span className="progress-percent">{percent}<small>%</small></span></div>
        <div className="progress-track"><i style={{ width: Math.max(percent, masteredCount ? 4 : 0) + '%' }} /></div>
        <div className="progress-label"><span>{masteredCount} / 78 个案例已掌握</span><span><Flame size={16} /> KEEP GOING</span></div>
        <div className="progress-links">
          <button onClick={() => onNavigate('/learn/oll')}><span className="progress-icon orange"><Target size={17} /></span><span><b>OLL 案例</b><small>57 种顶层朝向</small></span><ArrowRight size={15} /></button>
          <button onClick={() => onNavigate('/learn/pll')}><span className="progress-icon green"><Trophy size={17} /></span><span><b>PLL 案例</b><small>21 种顶层排列</small></span><ArrowRight size={15} /></button>
          <button onClick={() => onNavigate('/practice/' + lastStage + '?case=' + progress.lastCase)}><span className="progress-icon blue"><RotateCcw size={17} /></span><span><b>回到上次练习</b><small>{progress.lastCase.replace('-', ' ')}</small></span><ArrowRight size={15} /></button>
        </div>
        <div className="progress-foot"><BookOpen size={14} /> 学习记录保存在当前设备</div>
      </div>
    </section>
    <section className="bottom-note"><span>DESIGNED FOR THE NEXT PB</span><span><Timer size={14} /> 小步练习，持续进步</span></section>
  </main>
}
