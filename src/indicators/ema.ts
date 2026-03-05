import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

interface EMAResultItem {
  time: Candle['time']
  value: number
}

export function EMA({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: EMAResultItem[] = []
  const sma = SMA({ candles: [], period })
  const exponent = 2 / (period + 1)
  let prevPrevEma: number | undefined
  let prevEma: number | undefined

  function calculate(candle: Candle): EMAResultItem | undefined {
    prevPrevEma = prevEma

    if (prevEma !== undefined) {
      prevEma = (candle.close - prevEma) * exponent + prevEma
      return { value: prevEma, time: candle.time }
    }

    prevEma = sma.update(candle)?.value
    if (prevEma !== undefined) return { value: prevEma, time: candle.time }

    return undefined
  }

  for (const item of candles) {
    const res = calculate(item)
    if (res) result.push(res)
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
        prevEma = prevPrevEma
      }

      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function ema(
  initialArray: Array<{
    high: number
    low: number
    close: number
  }>,
  emaPeriod: number,
): number[] {
  const candles = initialArray.map((c, i) => ({ time: i, close: c.close }))
  return EMA({ candles, period: emaPeriod })
    .result()
    .map((x) => x.value)
}
