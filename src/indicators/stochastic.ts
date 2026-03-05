import type { CandleStick } from '../types'
import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

interface StochasticResultItem {
  time: Candle['time']
  k: number
  d: number | undefined
}

export function Stochastic({
  candles,
  period,
  signalPeriod,
}: {
  candles: Candle[]
  period: number
  signalPeriod: number
}) {
  const result: StochasticResultItem[] = []
  const highWindow: number[] = []
  const lowWindow: number[] = []
  const dSma = SMA({ candles: [], period: signalPeriod })
  let prevHighWindow: number[] = []
  let prevLowWindow: number[] = []

  function calculate(candle: Candle): StochasticResultItem | undefined {
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
    const k = diff === 0 ? 0 : ((candle.close - periodLow) / diff) * 100

    const dResult = dSma.update({ time: candle.time, close: k })
    return { time: candle.time, k, d: dResult?.value }
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

export function stochastic(
  candles: CandleStick[],
  period = 14,
  signalPeriod = 3,
): Array<{ k: number; d: number | undefined }> {
  return Stochastic({ candles: candles as Candle[], period, signalPeriod })
    .result()
    .map(({ k, d }) => ({ k, d }))
}
