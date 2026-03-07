import type { CandleStick } from '../types'
import { AD } from './ad'
import { EMA } from './ema'
import type { Candle } from './primitives/types'

// Chaikin Oscillator (CHO) by Marc Chaikin
// CHO = EMA(fastPeriod, AD) - EMA(slowPeriod, AD)
// Measures momentum of Accumulation/Distribution line.
// Crossover above 0 = bullish, below 0 = bearish.
export function chaikinOscillator(
  candles: CandleStick[],
  fastPeriod = 3,
  slowPeriod = 10,
): number[] {
  const adFactory = AD({ candles: [] })
  const fastEma = EMA({ candles: [], period: fastPeriod })
  const slowEma = EMA({ candles: [], period: slowPeriod })

  const results: number[] = new Array(candles.length).fill(0)

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    const adResult = adFactory.update({
      time: c.time,
      close: c.close,
      high: c.high,
      low: c.low,
      volume: c.volume,
    })

    const adCandle: Candle = { time: c.time, close: adResult.value }
    const fastResult = fastEma.update(adCandle)
    const slowResult = slowEma.update(adCandle)

    if (fastResult && slowResult) {
      results[i] = fastResult.value - slowResult.value
    }
  }

  return results
}
