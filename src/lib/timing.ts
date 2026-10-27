export type FormulaTiming = {
  lastMs: number
  bestMs: number
  totalMs: number
  attempts: number
}

export function formulaTimingKey(caseId: string, algorithm: string) {
  return caseId + '::' + algorithm
}

export function addFormulaTiming(previous: FormulaTiming | undefined, durationMs: number): FormulaTiming {
  const safeDuration = Math.max(1, Math.round(Number.isFinite(durationMs) ? durationMs : 0))
  return {
    lastMs: safeDuration,
    bestMs: previous ? Math.min(previous.bestMs, safeDuration) : safeDuration,
    totalMs: (previous?.totalMs ?? 0) + safeDuration,
    attempts: (previous?.attempts ?? 0) + 1,
  }
}

export function formatDuration(durationMs: number) {
  const totalCentiseconds = Math.max(0, Math.floor((Number.isFinite(durationMs) ? durationMs : 0) / 10))
  const centiseconds = totalCentiseconds % 100
  const totalSeconds = Math.floor(totalCentiseconds / 100)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  const tail = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(centiseconds).padStart(2, '0')
  return hours > 0 ? hours + ':' + tail : tail
}
