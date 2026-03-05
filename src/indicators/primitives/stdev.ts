import { SMA } from './sma'
import type { Candle } from './types'

interface STDEVResultItem {
  time: Candle['time']
  value: number
  candle: Candle
}

export function STDEV({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: STDEVResultItem[] = []
  let candlesStack = [...candles]

  const sma = SMA({ candles: [], period })

  function isZero(val: number, eps: number) {
    return Math.abs(val) <= eps
  }

  function SUM(fst: number, snd: number) {
    const EPS = 1e-10
    const res = fst + snd
    return isZero(res, EPS) ? 0 : res
  }

  function calculate(
    candle: Candle,
    index: number,
  ): STDEVResultItem | undefined {
    const average = sma.update(candle)
    if (!average) return undefined

    let sumOfSquareDeviations = 0
    for (let i = 0; i < period; i += 1) {
      const s = SUM(candlesStack[index - i].close, -average.value)
      sumOfSquareDeviations += s * s
    }

    const value = Math.sqrt(sumOfSquareDeviations / period)

    return { time: candle.time, value, candle }
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
      }

      candlesStack.push(candle)
      const item = calculate(candle, candlesStack.length - 1)
      if (item) result.push(item)

      return item
    },
  }
}
