import { RMA } from './primitives/rma'
import { trueRange } from './primitives/trueRange'
import type { Candle } from './primitives/types'

interface ATRResultItem {
  time: Candle['time']
  value: number
}

export function ATR({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  let result: ATRResultItem[] = []
  const tr = trueRange({ candles: [] })
  const rma = RMA({ candles: [], period })

  function calculate(candle: Candle): ATRResultItem | undefined {
    const tRange = tr.update(candle)
    if (!tRange) return undefined

    const tRangeRMA = rma.update({ time: candle.time, close: tRange.value })
    if (!tRangeRMA) return undefined

    return { time: candle.time, value: tRangeRMA.value }
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
