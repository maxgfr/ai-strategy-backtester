import type { Candle } from './types'

interface WMAResultItem {
  time: Candle['time']
  value: number
}

export function WMA({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  let result: WMAResultItem[] = []
  const window: number[] = []
  const denominator = (period * (period + 1)) / 2
  let prevWindow: number[] = []

  function calculate(candle: Candle): WMAResultItem | undefined {
    prevWindow = [...window]
    window.push(candle.close)
    if (window.length > period) window.shift()
    if (window.length < period) return undefined

    let value = 0
    for (let i = 0; i < window.length; i++) {
      value += (window[i] * (i + 1)) / denominator
    }
    return { time: candle.time, value }
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
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}
