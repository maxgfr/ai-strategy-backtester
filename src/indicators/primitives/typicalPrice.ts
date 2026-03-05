import type { Candle } from './types'

interface TypicalPriceResultItem {
  time: Candle['time']
  value: number
}

export function TypicalPrice({ candles }: { candles: Candle[] }) {
  const result: TypicalPriceResultItem[] = []

  function calculate(candle: Candle): TypicalPriceResultItem {
    return {
      time: candle.time,
      value:
        ((candle.high ?? candle.close) +
          (candle.low ?? candle.close) +
          candle.close) /
        3,
    }
  }

  for (const c of candles) result.push(calculate(c))

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
      }
      const item = calculate(candle)
      result.push(item)
      return item
    },
  }
}
