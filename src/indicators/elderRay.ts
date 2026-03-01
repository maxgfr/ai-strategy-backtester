import type { CandleStick } from '../types'
import { EMA } from './ema'
import type { Candle } from './primitives/types'

export function elderRay(
  candles: CandleStick[],
  period = 13,
): Array<{ bullPower: number; bearPower: number }> {
  const ema = EMA({ candles: [], period })
  const result: Array<{ bullPower: number; bearPower: number }> = []

  for (const candle of candles) {
    const emaResult = ema.update(candle as Candle)
    if (emaResult === undefined) continue
    result.push({
      bullPower: candle.high - emaResult.value,
      bearPower: candle.low - emaResult.value,
    })
  }

  return result
}
