import { useCallback, useEffect, useState } from 'react'
import { addFormulaTiming, formulaTimingKey, type FormulaTiming } from './timing'
const STORAGE_KEY = 'cube-flow.progress.v1'
export type Progress = { mastered: string[]; review: string[]; lastCase: string; timings: Record<string, FormulaTiming> }
const empty: Progress = { mastered: [], review: [], lastCase: 'OLL-01', timings: {} }
function readProgress(): Progress {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return empty
    const parsed = JSON.parse(value) as Partial<Progress>
    return {
      mastered: parsed.mastered ?? [],
      review: parsed.review ?? [],
      lastCase: parsed.lastCase ?? empty.lastCase,
      timings: parsed.timings && typeof parsed.timings === 'object' ? parsed.timings : {},
    }
  } catch { return empty }
}
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(readProgress)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) }, [progress])
  const setLastCase = useCallback((id: string) => setProgress(value => value.lastCase === id ? value : ({ ...value, lastCase: id })), [])
  const markCase = useCallback((id: string, mastered: boolean) => setProgress(value => ({
    ...value,
    mastered: mastered ? Array.from(new Set([...value.mastered, id])) : value.mastered.filter(item => item !== id),
    review: mastered ? value.review.filter(item => item !== id) : Array.from(new Set([...value.review, id])),
  })), [])
  const recordTiming = useCallback((caseId: string, algorithm: string, durationMs: number) => setProgress(value => {
    const key = formulaTimingKey(caseId, algorithm)
    return { ...value, timings: { ...value.timings, [key]: addFormulaTiming(value.timings[key], durationMs) } }
  }), [])
  return { progress, setLastCase, markCase, recordTiming }
}
