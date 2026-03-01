import type { CandleStick } from '../types'
import { EMA } from './ema'
import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'
import { WMA } from './primitives/wma'

export function movingAverage(
  candles: CandleStick[],
  period = 20,
  type: 'ema' | 'sma' | 'wma' = 'ema',
): number[] {
  const factories = {
    sma: () => SMA({ candles: [], period }),
    ema: () => EMA({ candles: [], period }),
    wma: () => WMA({ candles: [], period }),
  }
  const ma = factories[type]()

  const result: number[] = []
  for (const candle of candles) {
    const r = ma.update(candle as Candle)
    if (r !== undefined) result.push(r.value)
  }
  return result
}
