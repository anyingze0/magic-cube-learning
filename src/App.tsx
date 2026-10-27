import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CircleHelp, Home, Target } from 'lucide-react'
import { HomePage } from './pages/HomePage'
import { LearnPage } from './pages/LearnPage'
import { PracticePage } from './pages/PracticePage'
import { useProgress } from './lib/progress'
import { NotationProvider } from './components/NotationSettings'
import { SpaceEffects } from './components/SpaceEffects'

function currentPath() { return window.location.hash.replace(/^#/, '') || '/' }
export default function App() {
  const [path, setPath] = useState(currentPath)
  const { progress, setLastCase, markCase, recordTiming } = useProgress()
  useEffect(() => { const onHash = () => setPath(currentPath()); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash) }, [])
  const navigate = (next: string) => { if (next === path) return; window.location.hash = next; setPath(next) }
  const [pathname, query] = path.split('?')
  const params = useMemo(() => new URLSearchParams(query ?? ''), [query])
  const isHome = pathname === '/'
  const learnKind = pathname.startsWith('/learn/') ? pathname.slice('/learn/'.length) : ''
  const practiceStage = pathname.startsWith('/practice/') ? pathname.slice('/practice/'.length) : ''
  return <NotationProvider><div className="app-shell">
    <SpaceEffects />
    <header className="topbar"><button className="brand" onClick={() => navigate('/')}><span className="brand-mark"><i /><i /><i /><i /></span><span className="brand-name">CUBE FLOW</span></button><nav className="main-nav"><button className={isHome ? 'active' : ''} onClick={() => navigate('/')}><Home size={15} />首页</button><button className={learnKind ? 'active' : ''} onClick={() => navigate('/learn/oll')}><BookOpen size={15} />教程</button><button className={practiceStage ? 'active' : ''} onClick={() => navigate('/practice/oll')}><Target size={15} />练习</button></nav><div className="topbar-meta"><span className="top-progress"><i style={{ width: Math.max(progress.mastered.length ? 4 : 0, Math.round(progress.mastered.length / 78 * 100)) + '%' }} /></span><span>{progress.mastered.length}/78</span><button className="help-button" aria-label="帮助"><CircleHelp size={18} /></button></div></header>
    {isHome && <HomePage progress={progress} onNavigate={navigate} />}
    {(learnKind === 'cross' || learnKind === 'f2l' || learnKind === 'oll' || learnKind === 'pll') && <LearnPage kind={learnKind} progress={progress} onNavigate={navigate} />}
    {(practiceStage === 'oll' || practiceStage === 'pll') && <PracticePage key={practiceStage} stage={practiceStage} initialCaseId={params.get('case') ?? undefined} progress={progress} setLastCase={setLastCase} markCase={markCase} recordTiming={recordTiming} onNavigate={navigate} />}
    <footer className="site-footer"><span>© 2026 CUBE FLOW</span><span>LEARN WITH INTENTION <b>✳</b> TURN WITH FLOW</span><span>LOCAL PROGRESS / NO ACCOUNT</span></footer>
  </div></NotationProvider>
}
