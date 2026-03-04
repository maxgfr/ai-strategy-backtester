import { averageGain } from './primitives/averageGain'
import { averageLoss } from './primitives/averageLoss'
import type { Candle } from './primitives/types'

interface RSIResultItem {
  time: Candle['time']
  value: number
  candle: Candle
}

export function RSI({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  let result: RSIResultItem[] = []

  const avgGain = averageGain({ candles: [], period })
  const avgLoss = averageLoss({ candles: [], period })

  function calculate(candle: Candle): RSIResultItem | undefined {
    const lastAvgLoss = avgLoss.update(candle)
    const lastAvgGain = avgGain.update(candle)

    if (lastAvgGain && lastAvgLoss) {
      let currentRSI: number
      if (lastAvgLoss.value === 0) {
        currentRSI = 100
      } else if (lastAvgGain.value === 0) {
        currentRSI = 0
      } else {
        let RS = lastAvgGain.value / lastAvgLoss.value
        RS = Number.isNaN(RS) ? 0 : RS
        currentRSI = 100 - 100 / (1 + RS)
      }

      return { time: candle.time, value: currentRSI, candle }
    }

    return undefined
  }

  for (const candle of candles) {
    const item = calculate(candle)
    if (item) result.push(item)
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

export function rsi(
  initialArray: Array<{
    high: number
    low: number
    close: number
  }>,
  rsiPeriod: number,
): number[] {
  const candles = initialArray.map((c, i) => ({ time: i, close: c.close }))
  return RSI({ candles, period: rsiPeriod })
    .result()
    .map((x) => x.value)
}
