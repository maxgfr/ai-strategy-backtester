import type { CandleStick } from '../types'

export function donchian(
  candles: CandleStick[],
  period = 20,
): Array<{ upper: number; lower: number; middle: number }> {
  return candles.reduce<
    Array<{ upper: number; lower: number; middle: number }>
  >((acc, _, i) => {
    if (i < period - 1) return acc
    const window = candles.slice(i + 1 - period, i + 1)
    const upper = Math.max(...window.map((c) => c.high))
    const lower = Math.min(...window.map((c) => c.low))
    return [...acc, { upper, lower, middle: (upper + lower) / 2 }]
  }, [])
}
