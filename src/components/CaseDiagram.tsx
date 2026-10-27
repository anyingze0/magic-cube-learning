import type { AlgCase } from '../data'
const palette: Record<string, string> = { U: '#ffd333', R: '#e9483f', F: '#36a869', D: '#f4f1e9', L: '#ff8a32', B: '#3976d6' }
export function CaseDiagram({ item, size = 116 }: { item: AlgCase; size?: number }) {
  const faces = item.facelets
  const cell = 12
  const gap = 1.5
  const x0 = 31
  const y0 = 31
  const stickers: Array<{ x: number; y: number; face: string }> = []
  for (let i = 0; i < 9; i++) stickers.push({ x: x0 + (i % 3) * (cell + gap), y: y0 + Math.floor(i / 3) * (cell + gap), face: faces[i] })
  // Adjacent top-layer bands: B above, R right, F below, L left.
  for (let i = 0; i < 3; i++) {
    stickers.push({ x: x0 + i * (cell + gap), y: y0 - cell - gap, face: faces[45 + i] })
    stickers.push({ x: x0 + 3 * (cell + gap), y: y0 + i * (cell + gap), face: faces[9 + i] })
    stickers.push({ x: x0 + (2 - i) * (cell + gap), y: y0 + 3 * (cell + gap), face: faces[18 + i] })
    stickers.push({ x: x0 - cell - gap, y: y0 + (2 - i) * (cell + gap), face: faces[36 + i] })
  }
  return <svg className="case-diagram" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={item.code + ' 魔方顶层示意图'}>
    <rect x="13" y="13" width="74" height="74" rx="10" fill="#1c1e20" />
    {stickers.map((sticker, i) => <rect key={i} x={sticker.x} y={sticker.y} width={cell} height={cell} rx="2.4" fill={palette[sticker.face] || '#ccc'} stroke="#141516" strokeWidth="1.2" />)}
  </svg>
}
