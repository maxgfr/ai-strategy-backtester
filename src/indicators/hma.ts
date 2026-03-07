import type { CandleStick } from '../types'
import type { Candle } from './primitives/types'
import { WMA } from './primitives/wma'

// Hull Moving Average (HMA) by Alan Hull
// HMA = WMA(2 × WMA(n/2) - WMA(n), √n)
// Reduces lag significantly compared to EMA/SMA while keeping smoothness.
export function hma(candles: CandleStick[], period = 16): number[] {
  const halfPeriod = Math.max(2, Math.round(period / 2))
  const sqrtPeriod = Math.max(2, Math.round(Math.sqrt(period)))

  const wmaFull = WMA({ candles: [], period })
  const wmaHalf = WMA({ candles: [], period: halfPeriod })

  const intermediateValues: Array<{ time: number; close: number }> = []

  for (const c of candles) {
    const candle: Candle = { time: c.time, close: c.close }
    const fullResult = wmaFull.update(candle)
    const halfResult = wmaHalf.update(candle)
    if (fullResult && halfResult) {
      intermediateValues.push({
        time: c.time,
        close: 2 * halfResult.value - fullResult.value,
      })
    }
  }

  const wmaFinal = WMA({ candles: [], period: sqrtPeriod })
  const results: number[] = new Array(candles.length).fill(0)
  const startIndex = candles.length - intermediateValues.length

  for (let i = 0; i < intermediateValues.length; i++) {
    const r = wmaFinal.update(intermediateValues[i])
    if (r) {
      results[startIndex + i] = r.value
    }
  }

  return results
}
