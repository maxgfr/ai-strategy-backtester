import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

interface KDJResultItem {
  time: Candle['time']
  k: number
  d: number
  j: number
}

export function KDJ({
  candles,
  rsvPeriod = 9,
  kPeriod = 3,
  dPeriod = 3,
}: {
  candles: Candle[]
  rsvPeriod?: number
  kPeriod?: number
  dPeriod?: number
}) {
  const result: KDJResultItem[] = []
  const highWindow: number[] = []
  const lowWindow: number[] = []
  const kSma = SMA({ candles: [], period: kPeriod })
  const dSma = SMA({ candles: [], period: dPeriod })
  let prevHighWindow: number[] = []
  let prevLowWindow: number[] = []

  function calculate(candle: Candle): KDJResultItem | undefined {
    prevHighWindow = [...highWindow]
    prevLowWindow = [...lowWindow]

    highWindow.push(candle.high ?? candle.close)
    lowWindow.push(candle.low ?? candle.close)

    if (highWindow.length > rsvPeriod) highWindow.shift()
    if (lowWindow.length > rsvPeriod) lowWindow.shift()
    if (highWindow.length < rsvPeriod) return undefined

    const periodHigh = Math.max(...highWindow)
    const periodLow = Math.min(...lowWindow)
    const rsv =
      periodHigh === periodLow
        ? 0
        : ((candle.close - periodLow) / (periodHigh - periodLow)) * 100

    const kResult = kSma.update({ time: candle.time, close: rsv })
    if (!kResult) return undefined

    const dResult = dSma.update({ time: candle.time, close: kResult.value })
    if (!dResult) return undefined

    const j = 3 * kResult.value - 2 * dResult.value
    return { time: candle.time, k: kResult.value, d: dResult.value, j }
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
