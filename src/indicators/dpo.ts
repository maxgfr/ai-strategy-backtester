import type { CandleStick } from '../types'
import { SMA } from './primitives/sma'

// Detrended Price Oscillator (DPO)
// DPO[i] = close[i - period/2 - 1] - SMA(period)[i]
// Removes the trend component to isolate price cycles.
// Useful for identifying overbought/oversold levels without trend bias.
export function dpo(candles: CandleStick[], period = 20): number[] {
  const results: number[] = new Array(candles.length).fill(0)
  const shift = Math.floor(period / 2) + 1

  const sma = SMA({ candles: [], period })
  const smaValues: number[] = new Array(candles.length).fill(0)

  for (let i = 0; i < candles.length; i++) {
    const r = sma.update({ time: i, close: candles[i].close })
    if (r) {
      smaValues[i] = r.value
    }
  }

  for (let i = shift; i < candles.length; i++) {
    if (smaValues[i] !== 0) {
      results[i] = candles[i - shift].close - smaValues[i]
    }
  }

  return results
}
