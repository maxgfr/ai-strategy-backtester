import type { Candle } from './types'

interface SumResultItem {
  time: Candle['time']
  value: number
}

export function Sum({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  let result: SumResultItem[] = []
  const window: number[] = []
  let rollingSum = 0
  let prevWindow: number[] = []
  let prevSum = 0

  function calculate(candle: Candle): SumResultItem | undefined {
    prevWindow = [...window]
    prevSum = rollingSum

    window.push(candle.close)
    rollingSum += candle.close

    if (window.length > period) {
      rollingSum -= window.shift() ?? 0
    }

    if (window.length < period) return undefined
    return { time: candle.time, value: rollingSum }
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
        window.length = 0
        for (const v of prevWindow) window.push(v)
        rollingSum = prevSum
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}
