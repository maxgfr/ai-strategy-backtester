import type { CandleStick } from '../types'
import { ATR } from './atr'
import type { Candle } from './primitives/types'

export function atrTrailingStop(
  candles: CandleStick[],
  period = 14,
  multiplier = 3,
): Array<{ stop: number; trend: 'bull' | 'bear' }> {
  const atr = ATR({ candles: [], period })
  const result: Array<{ stop: number; trend: 'bull' | 'bear' }> = []

  for (const candle of candles) {
    const atrResult = atr.update(candle as Candle)
    if (atrResult === undefined) continue

    const atrBand = multiplier * atrResult.value
    const prev = result[result.length - 1]

    if (prev === undefined) {
      result.push({ stop: candle.close - atrBand, trend: 'bull' })
      continue
    }

    let stop: number
    let trend: 'bull' | 'bear'

    if (prev.trend === 'bull') {
      const trailed = Math.max(prev.stop, candle.close - atrBand)
      if (candle.close < trailed) {
        trend = 'bear'
        stop = candle.close + atrBand
      } else {
        trend = 'bull'
        stop = trailed
      }
    } else {
      const trailed = Math.min(prev.stop, candle.close + atrBand)
      if (candle.close > trailed) {
        trend = 'bull'
        stop = candle.close - atrBand
      } else {
        trend = 'bear'
        stop = trailed
      }
    }

    result.push({ stop, trend })
  }

  return result
}
