import type { CandleStick } from '../types'

// Range Action Verification Index (RAVI)
// Measures the distance between a short and long SMA as a % of the long SMA.
// Trending when |RAVI| > 3%, ranging when < 3%.
export function ravi(
  candles: CandleStick[],
  shortPeriod = 7,
  longPeriod = 65,
): number[] {
  const result: number[] = []
  for (let i = longPeriod - 1; i < candles.length; i++) {
    const window = candles.slice(i + 1 - longPeriod, i + 1)
    const longSma = window.reduce((s, c) => s + c.close, 0) / longPeriod
    const shortSma =
      window.slice(longPeriod - shortPeriod).reduce((s, c) => s + c.close, 0) /
      shortPeriod
    result.push(
      longSma === 0 ? 0 : Math.abs((shortSma - longSma) / longSma) * 100,
    )
  }
  return result
}
