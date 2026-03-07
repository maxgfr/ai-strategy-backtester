import type { CandleStick } from '../types'

// McGinley Dynamic by John McGinley
// MD = MD_prev + (close - MD_prev) / (N × (close / MD_prev)^4)
// Auto-adjusting moving average that speeds up in downtrends and slows in uptrends.
// Smoother than EMA with less whipsaw.
export function mcginleyDynamic(candles: CandleStick[], period = 14): number[] {
  const results: number[] = new Array(candles.length).fill(0)
  if (candles.length === 0) return results

  let md = candles[0].close
  results[0] = md

  for (let i = 1; i < candles.length; i++) {
    const close = candles[i].close
    if (md === 0) {
      md = close
    } else {
      const ratio = close / md
      const denominator = period * ratio ** 4
      md = denominator === 0 ? close : md + (close - md) / denominator
    }
    results[i] = md
  }

  return results
}
