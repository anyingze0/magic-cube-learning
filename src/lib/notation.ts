export type DisplayMode = 'original' | 'chinese'
export type MoveLabels = Record<string, string>
export type NotationPreferences = { displayMode: DisplayMode; labels: MoveLabels }
export const NOTATION_STORAGE_KEY = 'cube-flow.notation.v1'

export const NOTATION_GROUPS = [
  { name: '面层', families: ['F', 'B', 'U', 'D', 'R', 'L'] },
  { name: '宽层', families: ['f', 'b', 'u', 'd', 'r', 'l'] },
  { name: '中层', families: ['M', 'E', 'S'] },
  { name: '整体转体', families: ['x', 'y', 'z'] },
]
const faceNames: MoveLabels = { F: '前面', B: '后面', U: '顶面', D: '底面', R: '右面', L: '左面' }
const layerNames: MoveLabels = {
  ...faceNames, f: '前两层', b: '后两层', u: '顶两层', d: '底两层', r: '右两层', l: '左两层',
  M: '左右中层（按左面方向）', E: '上下中层（按底面方向）', S: '前后中层（按前面方向）',
  x: '整体（按右面方向）', y: '整体（按顶面方向）', z: '整体（按前面方向）',
}
export const MOVE_TOKENS = NOTATION_GROUPS.flatMap(group => group.families.flatMap(family => [family, family + "'", family + '2']))
export const DEFAULT_MOVE_LABELS: MoveLabels = Object.fromEntries(MOVE_TOKENS.map(token => {
  const family = token.replace(/['2]/g, '')
  const direction = token.endsWith('2') ? '转180°' : token.endsWith("'") ? '逆时针' : '顺时针'
  return [token, layerNames[family] + direction]
}))
Object.assign(DEFAULT_MOVE_LABELS, { F: '顺', U: '右', R: '上', "R'": '下', R2: '右右' })

export function normalizeMoveToken(token: string) {
  return token.replace(/[’‘′]/g, "'").replace(/^([FBUDRL])w/, (_, face: string) => face.toLowerCase()).replace(/2'$/, '2')
}

export function chineseMove(token: string, labels: MoveLabels = {}) {
  const key = normalizeMoveToken(token)
  return labels[key] || DEFAULT_MOVE_LABELS[key] || token
}

export function cleanMoveLabels(value: unknown): MoveLabels {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([token, label]) =>
    MOVE_TOKENS.includes(token) && typeof label === 'string' && label.trim() && label.trim().length <= 40
  ).map(([token, label]) => [token, (label as string).trim()]))
}

export function parseNotationPreferences(raw: string | null): NotationPreferences {
  try {
    const parsed = raw ? JSON.parse(raw) as Partial<NotationPreferences> | null : null
    return { displayMode: parsed?.displayMode === 'chinese' ? 'chinese' : 'original', labels: cleanMoveLabels(parsed?.labels) }
  } catch { return { displayMode: 'original', labels: {} } }
}
