import { oll } from '@moishy/algsets/oll'
import { pll } from '@moishy/algsets/pll'
import { toFacelets } from '@moishy/cubing-core'

export type Stage = 'oll' | 'pll'
export type AlgCase = { id: string; code: string; stage: Stage; name: string; group: string; alg: string; alts: string[]; tip: string; facelets: string }
const subsetLabels: Record<string, string> = { dot: '点形', square: '方块', 'lightning-bolt': '闪电', 'fish-shape': '鱼形', 'knight-shape': '骑士', cross: '十字', 'corners-oriented': '角块定向', 'awkward-shape': '异形', 'p-shape': 'P 形', 't-shape': 'T 形', 'c-shape': 'C 形', 'w-shape': 'W 形', 'l-shape': 'L 形', 'i-shape': 'I 形' }
const subsetTips: Record<string, string> = { dot: '顶层只有少量朝上的块，先观察角块与棱块的相对位置。', square: '顶层形成方块轮廓，确认缺口方向后再起手。', 'lightning-bolt': '顶层像闪电折线，先找拐角朝向。', 'fish-shape': '顶层像一条鱼，鱼头方向是识别关键。', 'knight-shape': '像骑士头的转角形状，观察两块相邻的黄色贴纸。', cross: '四条棱块都已朝上，只需要处理四个角块。', 'corners-oriented': '角块已完成定向，注意棱块的剩余朝向。', 'awkward-shape': '形状不规则，先找一组连续的黄色贴纸作为锚点。', 'p-shape': '像字母 P，观察竖边位于左侧还是右侧。', 't-shape': '像字母 T，横杠方向决定起手手型。', 'c-shape': '像字母 C，缺口方向决定观察角度。', 'w-shape': '像字母 W，先确认左右是否镜像。', 'l-shape': '像字母 L，找出两条相邻的黄色线。', 'i-shape': '像一条竖线，先确认中心线位置。' }
const pllTips: Record<string, string> = { '角块': '先找已经归位的角块，把它放到后方，再确认起手方向。', '棱块': '先观察顶层四条棱的循环方向，保持手法节奏。', '复合': '同时观察角块与棱块，先用已知块建立参照。' }
function compressMoves(moves: Array<{ family: string; amount: number }>) {
  const out: Array<{ family: string; amount: number }> = []
  for (const move of moves) { const last = out[out.length - 1]; if (last && last.family === move.family) { const amount = (last.amount + move.amount) % 4; out.pop(); if (amount) out.push({ family: move.family, amount }) } else out.push({ family: move.family, amount: move.amount }) }
  return out
}
function algString(variant: { moves: Array<{ family: string; amount: number }> }) { return compressMoves(variant.moves).map(move => move.family + (move.amount === 2 ? '2' : move.amount === 3 ? "'" : '')).join(' ') }
export const OLL_CASES: AlgCase[] = oll.cases.map((item, index) => {
  const group = subsetLabels[item.subset ?? ''] ?? item.subset ?? 'OLL'
  const algs = item.algs.map(algString)
  return { id: 'OLL-' + String(index + 1).padStart(2, '0'), code: 'OLL ' + String(index + 1).padStart(2, '0'), stage: 'oll', name: group, group, alg: algs[0], alts: algs, tip: subsetTips[item.subset ?? ''] ?? '先确认顶层形状，再开始公式。', facelets: toFacelets(oll.recognitionState(item.id)) }
})
const pllNames: Record<string, [string, string]> = { aa: ['角块三循环 A', '角块'], ab: ['角块三循环 B', '角块'], e: ['对角交换', '角块'], f: ['F 形复合', '复合'], ga: ['G 形 A', '复合'], gb: ['G 形 B', '复合'], gc: ['G 形 C', '复合'], gd: ['G 形 D', '复合'], h: ['四棱对换', '棱块'], ja: ['J 形 A', '复合'], jb: ['J 形 B', '复合'], na: ['N 形 A', '复合'], nb: ['N 形 B', '复合'], ra: ['R 形 A', '复合'], rb: ['R 形 B', '复合'], t: ['T 形', '复合'], ua: ['U 形 A', '棱块'], ub: ['U 形 B', '棱块'], v: ['V 形', '复合'], U: ['Y 形', '复合'], z: ['Z 形', '棱块'] }
export const PLL_CASES: AlgCase[] = pll.cases.map(item => {
  const pair = pllNames[item.id] ?? [item.name ?? item.id, '复合']
  const algs = item.algs.map(algString)
  return { id: 'PLL-' + item.id, code: 'PLL · ' + item.id.toUpperCase(), stage: 'pll', name: pair[0], group: pair[1], alg: algs[0], alts: algs, tip: pllTips[pair[1]] ?? pllTips.复合, facelets: toFacelets(pll.recognitionState(item.id)) }
})
export const ALL_CASES: AlgCase[] = [...OLL_CASES, ...PLL_CASES]
export const CASE_BY_ID = Object.fromEntries(ALL_CASES.map(item => [item.id, item])) as Record<string, AlgCase>
