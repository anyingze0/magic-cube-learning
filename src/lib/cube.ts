import { Alg, Move } from 'cubing/alg'
export const invertAlg = (source: string) => new Alg(source).invert().toString()
export const splitMoves = (source: string) => Array.from(new Alg(source).experimentalExpand())
  .filter((item): item is Move => item instanceof Move)
  .map(move => {
    const amount = (move.amount % 4 + 4) % 4
    return move.family + (amount === 2 ? '2' : amount === 3 ? "'" : '')
  })
