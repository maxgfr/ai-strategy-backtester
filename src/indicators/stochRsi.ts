import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'
import { RSI } from './rsi'

interface StochRSIResultItem {
  time: Candle['time']
  stochRsi: number
  k: number
  d: number | undefined
}

export function StochRSI({
  candles,
  rsiPeriod,
  stochasticPeriod,
  kPeriod,
  dPeriod,
}: {
  candles: Candle[]
  rsiPeriod: number
  stochasticPeriod: number
  kPeriod: number
  dPeriod: number
}) {
  let result: StochRSIResultItem[] = []
  const rsi = RSI({ candles: [], period: rsiPeriod })
  const rsiWindow: number[] = []
  const kSma = SMA({ candles: [], period: kPeriod })
  const dSma = SMA({ candles: [], period: dPeriod })
  let prevRsiWindow: number[] = []

  function calculate(candle: Candle): StochRSIResultItem | undefined {
    const rsiResult = rsi.update(candle)
    if (!rsiResult) return undefined

    prevRsiWindow = [...rsiWindow]
    rsiWindow.push(rsiResult.value)
    if (rsiWindow.length > stochasticPeriod) rsiWindow.shift()
    if (rsiWindow.length < stochasticPeriod) return undefined

    const rsiHigh = Math.max(...rsiWindow)
    const rsiLow = Math.min(...rsiWindow)
    const diff = rsiHigh - rsiLow
    const stochRsiValue =
      diff === 0 ? 0 : ((rsiResult.value - rsiLow) / diff) * 100

    const kResult = kSma.update({
      time: candle.time,
      close: stochRsiValue,
    })
    if (!kResult) return undefined

    const dResult = dSma.update({ time: candle.time, close: kResult.value })

    return {
      time: candle.time,
      stochRsi: stochRsiValue,
      k: kResult.value,
      d: dResult?.value,
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
        rsiWindow.length = 0
        for (const v of prevRsiWindow) rsiWindow.push(v)
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}
