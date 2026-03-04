import type { CandleStick } from '../types'

// Range Action Verification Index (RAVI)
// Measures the distance between a short and long SMA as a % of the long SMA.
// Trending when |RAVI| > 3%, ranging when < 3%.
export function ravi(
  candles: CandleStick[],
  shortPeriod = 7,
  longPeriod = 65,
): number[] {
  return candles.reduce<number[]>((acc, _, i) => {
    if (i < longPeriod - 1) return acc
    const window = candles.slice(i + 1 - longPeriod, i + 1)
    const longSma = window.reduce((s, c) => s + c.close, 0) / longPeriod
    const shortSma =
      window.slice(longPeriod - shortPeriod).reduce((s, c) => s + c.close, 0) /
      shortPeriod
    return [...acc, longSma === 0 ? 0 : Math.abs((shortSma - longSma) / longSma) * 100]
  }, [])
}
