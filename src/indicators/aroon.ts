import type { Candle } from './primitives/types'

interface AroonResultItem {
  time: Candle['time']
  up: number
  down: number
  oscillator: number
}

export function Aroon({
  candles,
  period = 25,
}: {
  candles: Candle[]
  period?: number
}) {
  const result: AroonResultItem[] = []
  const highWindow: number[] = []
  const lowWindow: number[] = []
  let prevHighWindow: number[] = []
  let prevLowWindow: number[] = []

  function calculate(candle: Candle): AroonResultItem | undefined {
    prevHighWindow = [...highWindow]
    prevLowWindow = [...lowWindow]

    highWindow.push(candle.high ?? candle.close)
    lowWindow.push(candle.low ?? candle.close)

    if (highWindow.length > period + 1) highWindow.shift()
    if (lowWindow.length > period + 1) lowWindow.shift()
    if (highWindow.length < period + 1) return undefined

    let highIdx = 0
    let maxHigh = highWindow[0]
    for (let i = 1; i < highWindow.length; i++) {
      if (highWindow[i] >= maxHigh) {
        maxHigh = highWindow[i]
        highIdx = i
      }
    }

    let lowIdx = 0
    let minLow = lowWindow[0]
    for (let i = 1; i < lowWindow.length; i++) {
      if (lowWindow[i] <= minLow) {
        minLow = lowWindow[i]
        lowIdx = i
      }
    }

    const up = (highIdx / period) * 100
    const down = (lowIdx / period) * 100
    return { time: candle.time, up, down, oscillator: up - down }
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

export function aroon(
  candles: Array<{ high: number; low: number; close: number }>,
  period = 25,
): Array<{ up: number; down: number; oscillator: number }> {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
  }))
  return Aroon({ candles: mapped, period })
    .result()
    .map((x) => ({ up: x.up, down: x.down, oscillator: x.oscillator }))
}
