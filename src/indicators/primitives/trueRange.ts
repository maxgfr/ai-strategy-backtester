import type { Candle } from './types'

interface TrueRangeResultItem {
  time: Candle['time']
  value: number
}

export function trueRange({ candles }: { candles: Candle[] }) {
  const result: TrueRangeResultItem[] = []
  let previousClose: number | undefined
  let prevPrevClose: number | undefined
  let trueRangeValue: number

  function calculate(candle: Candle): TrueRangeResultItem {
    const high = candle.high ?? candle.close
    const low = candle.low ?? candle.close

    if (previousClose === undefined) {
      previousClose = candle.close
      return { time: candle.time, value: high - low }
    }

    trueRangeValue = Math.max(
      high - low,
      Number.isNaN(Math.abs(high - previousClose))
        ? 0
        : Math.abs(high - previousClose),
      Number.isNaN(Math.abs(low - previousClose))
        ? 0
        : Math.abs(low - previousClose),
    )
    prevPrevClose = previousClose
    previousClose = candle.close

    return { time: candle.time, value: trueRangeValue }
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
        previousClose = prevPrevClose
      }

      const item = calculate(candle)
      if (item) result.push(item)

      return item
    },
  }
}
