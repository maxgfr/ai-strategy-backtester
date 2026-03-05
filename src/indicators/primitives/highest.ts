import type { Candle } from './types'

interface HighestResultItem {
  time: Candle['time']
  value: number
}

export function highest({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: HighestResultItem[] = []
  let candlesStack = [...candles]
  let high: number | null = null
  let prevHigh: number | null = null

  function calculate(
    candle: Candle,
    index: number,
  ): HighestResultItem | undefined {
    if (index + 1 < period) return undefined

    prevHigh = high
    high = Math.max(
      ...candlesStack
        .slice(index + 1 - period, index + 1)
        .map((item) => item.close),
    )

    return { time: candle.time, value: high }
  }

  candlesStack.forEach((item, index) => {
    const res = calculate(item, index)
    if (res) result.push(res)
  })

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
        candlesStack = candlesStack.slice(0, -1)
        high = prevHigh
      }

      candlesStack.push(candle)

      const item = calculate(candle, candlesStack.length - 1)
      if (item) result.push(item)

      return item
    },
  }
}
