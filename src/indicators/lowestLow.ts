import type { CandleStick } from '../types'

export function lowestLow(candles: CandleStick[], period = 14): number[] {
  const result: number[] = []
  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i + 1 - period, i + 1)
    result.push(Math.min(...window.map((c) => c.low)))
  }
  return result
}
