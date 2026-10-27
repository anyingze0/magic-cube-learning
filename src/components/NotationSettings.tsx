import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Settings2, X } from 'lucide-react'
import { splitMoves } from '../lib/cube'
import { chineseMove, cleanMoveLabels, DEFAULT_MOVE_LABELS, NOTATION_GROUPS, NOTATION_STORAGE_KEY, parseNotationPreferences, type DisplayMode, type MoveLabels } from '../lib/notation'

type NotationContextValue = {
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
  formatMove: (move: string) => string
  formatAlgorithm: (algorithm: string) => string
  openSettings: () => void
}
const NotationContext = createContext<NotationContextValue | null>(null)
export function useNotation() {
  const value = useContext(NotationContext)
  if (!value) throw new Error('useNotation requires NotationProvider')
  return value
}

export function NotationProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => {
    try { return parseNotationPreferences(localStorage.getItem(NOTATION_STORAGE_KEY)) }
    catch { return parseNotationPreferences(null) }
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(NOTATION_STORAGE_KEY, JSON.stringify(preferences))
      setStorageError(false)
    } catch { setStorageError(true) }
  }, [preferences])
  const value = useMemo<NotationContextValue>(() => ({
    displayMode: preferences.displayMode,
    setDisplayMode: mode => setPreferences(current => ({ ...current, displayMode: mode })),
    formatMove: move => preferences.displayMode === 'chinese' ? chineseMove(move, preferences.labels) : move,
    formatAlgorithm: algorithm => preferences.displayMode === 'chinese'
      ? splitMoves(algorithm).map(move => chineseMove(move, preferences.labels)).join(' · ') : algorithm,
    openSettings: () => setSettingsOpen(true),
  }), [preferences])
  return <NotationContext.Provider value={value}>
    {children}
    {settingsOpen && <NotationDialog labels={preferences.labels} storageError={storageError}
      onClose={() => setSettingsOpen(false)}
      onSave={labels => { setPreferences(current => ({ ...current, labels: cleanMoveLabels(labels) })); setSettingsOpen(false) }} />}
    {storageError && <p className="notation-storage-warning" role="status">浏览器无法保存公式偏好；当前设置仅在本次打开期间有效。</p>}
  </NotationContext.Provider>
}

export function FormulaControls() {
  const { displayMode, setDisplayMode, openSettings } = useNotation()
  return <div className="formula-controls">
    <div className="formula-mode" role="group" aria-label="公式显示方式">
      <button type="button" aria-pressed={displayMode === 'original'} onClick={() => setDisplayMode('original')}>原式</button>
      <button type="button" aria-pressed={displayMode === 'chinese'} onClick={() => setDisplayMode('chinese')}>中文</button>
    </div>
    <button type="button" className="formula-settings-button" onClick={openSettings}><Settings2 size={13} />公式设置</button>
  </div>
}

function NotationDialog({ labels, storageError, onClose, onSave }: {
  labels: MoveLabels; storageError: boolean; onClose: () => void; onSave: (labels: MoveLabels) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<MoveLabels>(() => ({ ...labels }))
  const sample = ['F', 'U', 'R', "R'", 'R2']
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
      trigger?.focus()
    }
  }, [])
  return <dialog ref={ref} className="notation-dialog" aria-labelledby="notation-title" aria-describedby="notation-description"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <form className="notation-form" onSubmit={event => { event.preventDefault(); onSave(draft) }}>
      <div className="notation-dialog-head">
        <div><span className="eyebrow">YOUR OWN NOTATION</span><h2 id="notation-title">公式设置</h2></div>
        <button type="button" className="notation-close" aria-label="关闭公式设置" onClick={onClose} autoFocus><X size={19} /></button>
      </div>
      <p id="notation-description">每个动作独立命名。R、R'、R2 可分别设为“上、下、右右”；只改变文字，不改变动画。留空使用默认口令。</p>
      <div className="notation-fields">
        {NOTATION_GROUPS.map(group => <fieldset key={group.name}>
          <legend>{group.name}</legend>
          <div className="notation-column-labels" aria-hidden="true"><span>正常</span><span>反向 '</span><span>180° · 2</span></div>
          {group.families.map(family => <div className="notation-field-row" key={family}>
            {['', "'", '2'].map(suffix => {
              const token = family + suffix
              return <label key={token}><code>{token}</code>
                <input aria-label={token + ' 中文口令'} maxLength={40} value={draft[token] ?? ''} placeholder={DEFAULT_MOVE_LABELS[token]}
                  onChange={event => setDraft(current => ({ ...current, [token]: event.target.value }))} />
              </label>
            })}
          </div>)}
        </fieldset>)}
      </div>
      <div className="notation-preview"><span>即时预览 · {sample.join(' ')}</span><p>{sample.map(move => chineseMove(move, cleanMoveLabels(draft))).join(' · ')}</p></div>
      {storageError && <p className="notation-save-warning">本地存储不可用，保存后仅在本次打开期间生效。</p>}
      <div className="notation-dialog-actions">
        <button type="button" className="control-button notation-restore" onClick={() => setDraft({})}>恢复默认</button>
        <button type="button" className="button button-plain" onClick={onClose}>取消</button>
        <button type="submit" className="button button-dark">保存</button>
      </div>
    </form>
  </dialog>
}
