import { ATR } from './atr'
import type { Candle } from './primitives/types'

interface ChandelierResultItem {
  time: Candle['time']
  exitLong: number
  exitShort: number
}

export function Chandelier({
  candles,
  period = 22,
  multiplier = 3,
}: {
  candles: Candle[]
  period?: number
  multiplier?: number
}) {
  let result: ChandelierResultItem[] = []
  const atr = ATR({ candles: [], period })
  const highWindow: number[] = []
  const lowWindow: number[] = []
  let prevHighWindow: number[] = []
  let prevLowWindow: number[] = []

  function calculate(candle: Candle): ChandelierResultItem | undefined {
    prevHighWindow = [...highWindow]
    prevLowWindow = [...lowWindow]

    highWindow.push(candle.high ?? candle.close)
    lowWindow.push(candle.low ?? candle.close)

    if (highWindow.length > period) highWindow.shift()
    if (lowWindow.length > period) lowWindow.shift()

    const atrResult = atr.update(candle)
    if (!atrResult || highWindow.length < period) return undefined

    const periodHigh = Math.max(...highWindow)
    const periodLow = Math.min(...lowWindow)
    const atrValue = atrResult.value

    return {
      time: candle.time,
      exitLong: periodHigh - multiplier * atrValue,
      exitShort: periodLow + multiplier * atrValue,
    }
  }

  for (const c of candles) {
    const res = calculate(c)
    if (res) result.push(res)
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result = result.slice(0, -1)
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

export function chandelier(
  candles: Array<{ high: number; low: number; close: number }>,
  period = 22,
  multiplier = 3,
): Array<{ exitLong: number; exitShort: number }> {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
  }))
  return Chandelier({ candles: mapped, period, multiplier })
    .result()
    .map((x) => ({ exitLong: x.exitLong, exitShort: x.exitShort }))
}
