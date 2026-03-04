import type { CandleStick } from '../types'
import { SMA } from './primitives/sma'
import { STDEV } from './primitives/stdev'
import type { Candle } from './primitives/types'

interface BBResultItem {
  time: Candle['time']
  value: number
  candle: Candle
}

export function BollingerBands({
  candles,
  period,
  stdDev,
}: {
  candles: Candle[]
  period: number
  stdDev: number
}) {
  let result: BBResultItem[] = []

  const sma = SMA({ candles: [], period })
  const stdev = STDEV({ candles: [], period })

  function calculate(candle: Candle): BBResultItem | undefined {
    const basis = sma.update(candle)
    const sd = stdev.update(candle)
    if (!basis || !sd) return undefined

    const dev = stdDev * sd.value
    const upper = basis.value + dev
    const lower = basis.value - dev
    const range = upper - lower
    const bbr = range === 0 ? 0.5 : (candle.close - lower) / range

    return { time: candle.time, value: bbr, candle }
  }

  for (const item of candles) {
    const res = calculate(item)
    if (res) result.push(res)
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result = result.slice(0, -1)
      }

      const item = calculate(candle)
      if (item) result.push(item)

      return item
    },
  }
}

export function bollingerBands(
  candles: CandleStick[],
  period = 20,
  stdDev = 2,
): number[] {
  return BollingerBands({
    candles: candles as Candle[],
    period,
    stdDev,
  })
    .result()
    .map((item) => item.value)
}
