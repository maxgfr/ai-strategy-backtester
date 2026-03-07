import type { CandleStick } from '../types'

// Choppiness Index (CI) by Bill Dreiss
// CI = 100 × log10(Σ ATR(1) over period / (highest high - lowest low)) / log10(period)
// Range: 0-100. > 61.8 = choppy/ranging, < 38.2 = trending.
export function choppinessIndex(candles: CandleStick[], period = 14): number[] {
  const results: number[] = new Array(candles.length).fill(0)
  const logPeriod = Math.log10(period)

  for (let i = period; i < candles.length; i++) {
    let atrSum = 0
    let highestHigh = -Infinity
    let lowestLow = Infinity

    for (let j = i - period + 1; j <= i; j++) {
      const high = candles[j].high
      const low = candles[j].low
      const prevClose = candles[j - 1].close

      // True range for each bar
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose),
      )
      atrSum += tr

      if (high > highestHigh) highestHigh = high
      if (low < lowestLow) lowestLow = low
    }

    const range = highestHigh - lowestLow
    if (range === 0 || logPeriod === 0) {
      results[i] = 0
      continue
    }

    results[i] = (100 * Math.log10(atrSum / range)) / logPeriod
  }

  return results
}
