import type { CandleStick } from '../types'
import { EMA } from './ema'

// Mass Index by Donald Dorsey
// MI = Σ(EMA(emaPeriod, high-low) / EMA(emaPeriod, EMA(emaPeriod, high-low))) over sumPeriod
// Default: emaPeriod=9, sumPeriod=25. A "reversal bulge" occurs when MI > 27 then drops below 26.5.
// Higher values indicate range expansion → potential trend reversal.
export function massIndex(
  candles: CandleStick[],
  emaPeriod = 9,
  sumPeriod = 25,
): number[] {
  const results: number[] = new Array(candles.length).fill(0)

  const singleEma = EMA({ candles: [], period: emaPeriod })
  const doubleEma = EMA({ candles: [], period: emaPeriod })

  const ratios: number[] = []

  for (let i = 0; i < candles.length; i++) {
    const range = candles[i].high - candles[i].low
    const single = singleEma.update({ time: i, close: range })
    if (!single) continue

    const double = doubleEma.update({ time: i, close: single.value })
    if (!double || double.value === 0) {
      ratios.push(0)
      continue
    }

    ratios.push(single.value / double.value)

    if (ratios.length >= sumPeriod) {
      let sum = 0
      for (let j = ratios.length - sumPeriod; j < ratios.length; j++) {
        sum += ratios[j]
      }
      results[i] = sum
    }
  }

  return results
}
