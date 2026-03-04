import type { Candle } from './types'

interface WWMAResultItem {
  time: Candle['time']
  value: number
}

export function WWMA({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  let result: WWMAResultItem[] = []
  const alpha = 1 / period

  function calculate(candle: Candle): WWMAResultItem {
    const prev = result.length > 0 ? result[result.length - 1].value : candle.close
    return {
      time: candle.time,
      value: alpha * candle.close + (1 - alpha) * prev,
    }
  }

  for (const item of candles) {
    result.push(calculate(item))
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result = result.slice(0, -1)
      }
      const item = calculate(candle)
      result.push(item)
      return item
    },
  }
}
