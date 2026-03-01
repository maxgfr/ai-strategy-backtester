import type { CandleStick } from '../types'
import { ATR } from './atr'
import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

export function starcBands(
  candles: CandleStick[],
  smaPeriod = 6,
  atrPeriod = 15,
  multiplier = 1.33,
): Array<{ upper: number; middle: number; lower: number }> {
  const sma = SMA({ candles: [], period: smaPeriod })
  const atr = ATR({ candles: [], period: atrPeriod })
  const result: Array<{ upper: number; middle: number; lower: number }> = []

  for (const candle of candles) {
    const smaResult = sma.update(candle as Candle)
    const atrResult = atr.update(candle as Candle)
    if (smaResult === undefined || atrResult === undefined) continue
    const band = multiplier * atrResult.value
    result.push({
      upper: smaResult.value + band,
      middle: smaResult.value,
      lower: smaResult.value - band,
    })
  }

  return result
}
