import type { CandleStick } from '../types'

export function donchian(
  candles: CandleStick[],
  period = 20,
): Array<{ upper: number; lower: number; middle: number }> {
  const result: Array<{ upper: number; lower: number; middle: number }> = []
  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i + 1 - period, i + 1)
    const upper = Math.max(...window.map((c) => c.high))
    const lower = Math.min(...window.map((c) => c.low))
    result.push({ upper, lower, middle: (upper + lower) / 2 })
  }
  return result
}
