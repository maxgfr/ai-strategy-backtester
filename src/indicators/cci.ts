import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

interface CCIResultItem {
  time: Candle['time']
  value: number
}

const CCI_CONSTANT = 0.015

export function CCI({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: CCIResultItem[] = []
  const tpWindow: number[] = []
  const tpSma = SMA({ candles: [], period })
  let prevTpWindow: number[] = []

  function calculate(candle: Candle): CCIResultItem | undefined {
    prevTpWindow = [...tpWindow]

    const tp =
      ((candle.high ?? candle.close) +
        (candle.low ?? candle.close) +
        candle.close) /
      3

    tpWindow.push(tp)
    if (tpWindow.length > period) tpWindow.shift()

    const smaResult = tpSma.update({ time: candle.time, close: tp })
    if (smaResult === undefined) return undefined

    const smaTp = smaResult.value
    let sumDev = 0
    for (const v of tpWindow) {
      sumDev += Math.abs(v - smaTp)
    }
    const meanDeviation = sumDev / period
    const value =
      meanDeviation === 0 ? 0 : (tp - smaTp) / (CCI_CONSTANT * meanDeviation)

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
        tpWindow.length = 0
        for (const v of prevTpWindow) tpWindow.push(v)
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function cci(
  candles: Array<{ high: number; low: number; close: number }>,
  period = 20,
): number[] {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
  }))
  return CCI({ candles: mapped, period })
    .result()
    .map((x) => x.value)
}
