import type { CandleStick } from '../types'
import type { Candle } from './primitives/types'

interface OBVResultItem {
  time: Candle['time']
  value: number
}

export function OBV({ candles }: { candles: Candle[] }) {
  let result: OBVResultItem[] = []
  let obvValue = 0
  let prevClose: number | undefined
  let prevOBV = 0

  function calculate(candle: Candle): OBVResultItem | undefined {
    prevOBV = obvValue
    if (prevClose === undefined) {
      prevClose = candle.close
      return undefined
    }
    if (candle.close > prevClose) {
      obvValue += candle.volume ?? 0
    } else if (candle.close < prevClose) {
      obvValue -= candle.volume ?? 0
    }
    prevClose = candle.close
    return { time: candle.time, value: obvValue }
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
        obvValue = prevOBV
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function obv(candles: CandleStick[]): number[] {
  return OBV({ candles: candles as Candle[] })
    .result()
    .map((item) => item.value)
}
