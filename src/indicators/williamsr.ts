import type { Candle } from './primitives/types'

interface WilliamsRResultItem {
  time: Candle['time']
  value: number
}

export function WilliamsR({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: WilliamsRResultItem[] = []
  const highWindow: number[] = []
  const lowWindow: number[] = []
  let prevHighWindow: number[] = []
  let prevLowWindow: number[] = []

  function calculate(candle: Candle): WilliamsRResultItem | undefined {
    prevHighWindow = [...highWindow]
    prevLowWindow = [...lowWindow]

    highWindow.push(candle.high ?? candle.close)
    lowWindow.push(candle.low ?? candle.close)

    if (highWindow.length > period) highWindow.shift()
    if (lowWindow.length > period) lowWindow.shift()
    if (highWindow.length < period) return undefined

    const periodHigh = Math.max(...highWindow)
    const periodLow = Math.min(...lowWindow)
    const diff = periodHigh - periodLow
    const value = diff === 0 ? -50 : ((periodHigh - candle.close) / diff) * -100
    return { time: candle.time, value }
  }

  for (const c of candles) {
    const res = calculate(c)
    if (res) result.push(res)
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
        highWindow.length = 0
        lowWindow.length = 0
        for (const v of prevHighWindow) highWindow.push(v)
        for (const v of prevLowWindow) lowWindow.push(v)
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function williamsR(
  candles: Array<{ high: number; low: number; close: number }>,
  period = 14,
): number[] {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
  }))
  return WilliamsR({ candles: mapped, period })
    .result()
    .map((x) => x.value)
}
