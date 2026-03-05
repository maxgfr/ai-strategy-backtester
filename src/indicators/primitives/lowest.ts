import type { Candle } from './types'

interface LowestResultItem {
  time: Candle['time']
  value: number
}

export function lowest({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: LowestResultItem[] = []
  let candlesStack = [...candles]
  let low: number | null = null
  let prevLow: number | null = null

  function calculate(
    candle: Candle,
    index: number,
  ): LowestResultItem | undefined {
    if (index + 1 < period) return undefined

    prevLow = low
    low = Math.min(
      ...candlesStack
        .slice(index + 1 - period, index + 1)
        .map((item) => item.close),
    )

    return { time: candle.time, value: low }
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
        low = prevLow
      }

      candlesStack.push(candle)

      const item = calculate(candle, candlesStack.length - 1)
      if (item) result.push(item)

      return item
    },
  }
}
