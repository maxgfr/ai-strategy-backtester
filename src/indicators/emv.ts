import type { CandleStick } from '../types'
import { SMA } from './primitives/sma'

// Ease of Movement (EMV) by Richard Arms
// EMV = distance / box_ratio where:
//   distance = (high + low) / 2 - prev(high + low) / 2
//   box_ratio = (volume / 10000) / (high - low)
// Smoothed with SMA. Positive = easy upward movement, negative = easy downward.
export function emv(candles: CandleStick[], period = 14): number[] {
  const results: number[] = new Array(candles.length).fill(0)
  if (candles.length < 2) return results

  const sma = SMA({ candles: [], period })

  for (let i = 1; i < candles.length; i++) {
    const midCurr = (candles[i].high + candles[i].low) / 2
    const midPrev = (candles[i - 1].high + candles[i - 1].low) / 2
    const distance = midCurr - midPrev

    const range = candles[i].high - candles[i].low
    // Normalize volume to avoid extreme values
    const boxRatio = range === 0 ? 0 : candles[i].volume / 10000 / range
    const rawEmv = boxRatio === 0 ? 0 : distance / boxRatio

    const r = sma.update({ time: i, close: rawEmv })
    if (r) {
      results[i] = r.value
    }
  }

  return results
}
