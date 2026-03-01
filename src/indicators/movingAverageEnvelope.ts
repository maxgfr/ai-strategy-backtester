import type { CandleStick } from '../types'
import { EMA } from './ema'
import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

export function movingAverageEnvelope(
  candles: CandleStick[],
  period = 20,
  percentage = 2.5,
  type: 'ema' | 'sma' = 'sma',
): Array<{ upper: number; middle: number; lower: number }> {
  const ma =
    type === 'sma' ? SMA({ candles: [], period }) : EMA({ candles: [], period })

  const factor = percentage / 100
  const result: Array<{ upper: number; middle: number; lower: number }> = []

  for (const candle of candles) {
    const r = ma.update(candle as Candle)
    if (r === undefined) continue
    result.push({
      upper: r.value * (1 + factor),
      middle: r.value,
      lower: r.value * (1 - factor),
    })
  }

  return result
}
