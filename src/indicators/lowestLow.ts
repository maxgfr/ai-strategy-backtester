import type { CandleStick } from '../types'

export function lowestLow(candles: CandleStick[], period = 14): number[] {
  return candles.reduce<number[]>((acc, _, i) => {
    if (i < period - 1) return acc
    const window = candles.slice(i + 1 - period, i + 1)
    return [...acc, Math.min(...window.map((c) => c.low))]
  }, [])
}
