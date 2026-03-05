import type { Candle } from './primitives/types'

interface ROCResultItem {
  time: Candle['time']
  value: number
}

export function ROC({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: ROCResultItem[] = []
  const window: number[] = []
  let prevWindow: number[] = []

  function calculate(candle: Candle): ROCResultItem | undefined {
    prevWindow = [...window]
    window.push(candle.close)
    if (window.length <= period) return undefined
    if (window.length > period + 1) window.shift()

    const oldest = window[0]
    const roc = ((candle.close - oldest) / oldest) * 100
    return { time: candle.time, value: roc }
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
        window.length = 0
        for (const v of prevWindow) window.push(v)
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function roc(
  candles: Array<{ close: number }>,
  period: number,
): number[] {
  const mapped = candles.map((c, i) => ({ time: i, close: c.close }))
  return ROC({ candles: mapped, period })
    .result()
    .map((x) => x.value)
}
