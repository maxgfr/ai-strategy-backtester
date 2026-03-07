import type { CandleStick } from '../types'

// Volume Weighted Moving Average (VWMA)
// VWMA = Σ(close × volume) / Σ(volume) over period
// Like SMA but gives more weight to high-volume bars.
// Price above VWMA with rising volume = bullish confirmation.
export function vwma(candles: CandleStick[], period = 20): number[] {
  const results: number[] = new Array(candles.length).fill(0)

  for (let i = period - 1; i < candles.length; i++) {
    let sumCV = 0
    let sumV = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumCV += candles[j].close * candles[j].volume
      sumV += candles[j].volume
    }
    results[i] = sumV === 0 ? 0 : sumCV / sumV
  }

  return results
}
