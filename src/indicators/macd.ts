import type { CandleStick } from '../types'
import { EMA } from './ema'
import type { Candle } from './primitives/types'

interface MACDResultItem {
  time: Candle['time']
  macd: number
  signal: number | undefined
  histogram: number | undefined
}

export function MACD({
  candles,
  fastPeriod,
  slowPeriod,
  signalPeriod,
}: {
  candles: Candle[]
  fastPeriod: number
  slowPeriod: number
  signalPeriod: number
}) {
  let result: MACDResultItem[] = []
  const fastEma = EMA({ candles: [], period: fastPeriod })
  const slowEma = EMA({ candles: [], period: slowPeriod })
  const signalEma = EMA({ candles: [], period: signalPeriod })

  function calculate(candle: Candle): MACDResultItem | undefined {
    const fast = fastEma.update(candle)
    const slow = slowEma.update(candle)
    if (fast === undefined || slow === undefined) return undefined

    const macdValue = fast.value - slow.value
    const signalResult = signalEma.update({
      time: candle.time,
      close: macdValue,
    })
    const signal = signalResult?.value
    const histogram = signal !== undefined ? macdValue - signal : undefined

    return { time: candle.time, macd: macdValue, signal, histogram }
  }

  for (const c of candles) {
    const res = calculate(c)
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

export function macd(
  candles: CandleStick[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): Array<{
  macd: number
  signal: number | undefined
  histogram: number | undefined
}> {
  return MACD({
    candles: candles as Candle[],
    fastPeriod,
    slowPeriod,
    signalPeriod,
  })
    .result()
    .map(({ macd: macdVal, signal, histogram }) => ({
      macd: macdVal,
      signal,
      histogram,
    }))
}
