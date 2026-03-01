import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

interface AOResultItem {
  time: Candle['time']
  value: number
}

export function AO({
  candles,
  fastPeriod = 5,
  slowPeriod = 34,
}: {
  candles: Candle[]
  fastPeriod?: number
  slowPeriod?: number
}) {
  let result: AOResultItem[] = []
  const fastSma = SMA({ candles: [], period: fastPeriod })
  const slowSma = SMA({ candles: [], period: slowPeriod })

  function calculate(candle: Candle): AOResultItem | undefined {
    const medianPrice =
      ((candle.high ?? candle.close) + (candle.low ?? candle.close)) / 2
    const medianCandle = { time: candle.time, close: medianPrice }
    const fast = fastSma.update(medianCandle)
    const slow = slowSma.update(medianCandle)
    if (fast === undefined || slow === undefined) return undefined
    return { time: candle.time, value: fast.value - slow.value }
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

export function ao(
  candles: Array<{ high: number; low: number; close: number }>,
  fastPeriod = 5,
  slowPeriod = 34,
): number[] {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
  }))
  return AO({ candles: mapped, fastPeriod, slowPeriod })
    .result()
    .map((x) => x.value)
}
