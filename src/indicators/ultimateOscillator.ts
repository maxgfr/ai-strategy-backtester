import type { CandleStick } from '../types'

// Ultimate Oscillator (UO) by Larry Williams
// Combines three timeframes (7, 14, 28) with weighted average.
// Range: 0-100. Buy < 30, Sell > 70. Less false signals than RSI.
export function ultimateOscillator(
  candles: CandleStick[],
  period1 = 7,
  period2 = 14,
  period3 = 28,
): number[] {
  const results: number[] = new Array(candles.length).fill(0)
  const maxPeriod = Math.max(period1, period2, period3)

  if (candles.length < 2) return results

  // Compute buying pressure (BP) and true range (TR) for each bar
  const bp: number[] = new Array(candles.length).fill(0)
  const tr: number[] = new Array(candles.length).fill(0)

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const close = candles[i].close
    const prevClose = candles[i - 1].close

    const trueLow = Math.min(low, prevClose)
    const trueHigh = Math.max(high, prevClose)

    bp[i] = close - trueLow
    tr[i] = trueHigh - trueLow
  }

  for (let i = maxPeriod; i < candles.length; i++) {
    let bpSum1 = 0
    let trSum1 = 0
    let bpSum2 = 0
    let trSum2 = 0
    let bpSum3 = 0
    let trSum3 = 0

    for (let j = i - period1 + 1; j <= i; j++) {
      bpSum1 += bp[j]
      trSum1 += tr[j]
    }
    for (let j = i - period2 + 1; j <= i; j++) {
      bpSum2 += bp[j]
      trSum2 += tr[j]
    }
    for (let j = i - period3 + 1; j <= i; j++) {
      bpSum3 += bp[j]
      trSum3 += tr[j]
    }

    const avg1 = trSum1 === 0 ? 0 : bpSum1 / trSum1
    const avg2 = trSum2 === 0 ? 0 : bpSum2 / trSum2
    const avg3 = trSum3 === 0 ? 0 : bpSum3 / trSum3

    // Weighted: 4 × short + 2 × mid + 1 × long, normalized to 0-100
    results[i] = (100 * (4 * avg1 + 2 * avg2 + avg3)) / 7
  }

  return results
}
