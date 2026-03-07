import type { CandleStick } from '../types'
import { EMA } from './ema'

// Force Index by Alexander Elder
// FI = EMA(period, (close - prevClose) × volume)
// Combines price movement with volume to measure the power behind a move.
// Positive = bulls in control, negative = bears in control.
export function forceIndex(candles: CandleStick[], period = 13): number[] {
  const results: number[] = new Array(candles.length).fill(0)
  if (candles.length < 2) return results

  const ema = EMA({ candles: [], period })

  for (let i = 1; i < candles.length; i++) {
    const rawForce =
      (candles[i].close - candles[i - 1].close) * candles[i].volume
    const r = ema.update({ time: i, close: rawForce })
    if (r) {
      results[i] = r.value
    }
  }

  return results
}
