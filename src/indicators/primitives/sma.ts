import type { Candle } from './types'

interface SMAResultItem {
  time: Candle['time']
  value: number
  candle: Candle
}

export function SMA({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: SMAResultItem[] = []
  const list = [0]
  let counter = 1
  let sum = 0
  let shifted: number
  let prevSum: number
  let lastCandle: Candle

  function calculate(candle: Candle): SMAResultItem | undefined {
    const current = candle.close
    lastCandle = candle

    if (counter < period) {
      counter += 1
      list.push(current)
      sum += current
    } else {
      prevSum = sum
      shifted = list.shift() ?? 0
      sum = sum - shifted + current
      list.push(current)
      return { time: candle.time, value: sum / period, candle }
    }

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
        list.pop()

        if (counter < period) {
          counter -= 1
          sum -= lastCandle.close
        } else {
          sum = prevSum
          list.unshift(shifted)
        }
      }

      const item = calculate(candle)
      if (item) result.push(item)

      return item
    },
  }
}
