import { SMA } from './sma'
import type { Candle } from './types'

interface RMAResultItem {
  time: Candle['time']
  value: number
}

export function RMA({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  let result: RMAResultItem[] = []
  let prevPrevSum: number | undefined
  let prevSum: number | undefined
  let sum: number | undefined = 0
  const sma = SMA({ candles: [], period })
  const exponent = 1 / period

  function calculate(candle: Candle): RMAResultItem | undefined {
    if (prevSum === undefined || Number.isNaN(prevSum)) {
      sum = sma.update(candle)?.value
    } else {
      sum = exponent * candle.close + (1 - exponent) * (prevSum ?? 0)
    }

    prevPrevSum = prevSum
    prevSum = sum

    if (sum !== undefined && !Number.isNaN(sum)) {
      return { time: candle.time, value: sum }
    }
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
        prevSum = prevPrevSum
      }

      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}
