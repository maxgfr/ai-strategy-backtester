import type { Candle } from './primitives/types'

interface MFIResultItem {
  time: Candle['time']
  value: number
}

export function MFI({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: MFIResultItem[] = []
  const positiveFlow: number[] = []
  const negativeFlow: number[] = []
  let prevTP: number | undefined
  let prevPositiveFlow: number[] = []
  let prevNegativeFlow: number[] = []
  let prevPrevTP: number | undefined

  function calculate(candle: Candle): MFIResultItem | undefined {
    const tp =
      ((candle.high ?? candle.close) +
        (candle.low ?? candle.close) +
        candle.close) /
      3
    const rawMF = tp * (candle.volume ?? 0)

    if (prevTP === undefined) {
      prevPrevTP = prevTP
      prevTP = tp
      return undefined
    }

    prevPrevTP = prevTP

    prevPositiveFlow = [...positiveFlow]
    prevNegativeFlow = [...negativeFlow]

    if (tp > prevTP) {
      positiveFlow.push(rawMF)
      negativeFlow.push(0)
    } else if (tp < prevTP) {
      positiveFlow.push(0)
      negativeFlow.push(rawMF)
    } else {
      positiveFlow.push(0)
      negativeFlow.push(0)
    }

    prevTP = tp

    if (positiveFlow.length > period) {
      positiveFlow.shift()
      negativeFlow.shift()
    }

    if (positiveFlow.length < period) return undefined

    const posSum = positiveFlow.reduce((a, b) => a + b, 0)
    const negSum = negativeFlow.reduce((a, b) => a + b, 0)

    if (negSum === 0) return { time: candle.time, value: 100 }
    const mfr = posSum / negSum
    return { time: candle.time, value: 100 - 100 / (1 + mfr) }
  }

  for (const item of candles) {
    const res = calculate(item)
    if (res) result.push(res)
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
        positiveFlow.length = 0
        for (const v of prevPositiveFlow) positiveFlow.push(v)
        negativeFlow.length = 0
        for (const v of prevNegativeFlow) negativeFlow.push(v)
        prevTP = prevPrevTP
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function mfi(
  candles: Array<{
    high: number
    low: number
    close: number
    volume: number
  }>,
  period = 14,
): number[] {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume,
  }))
  return MFI({ candles: mapped, period })
    .result()
    .map((x) => x.value)
}
