import type { CandleStick } from '../types'
import type { Candle } from './primitives/types'

interface VWAPResultItem {
  time: Candle['time']
  value: number
}

export function VWAP({ candles }: { candles: Candle[] }) {
  const result: VWAPResultItem[] = []
  let cumulativeTotal = 0
  let cumulativeVolume = 0
  let prevTotal = 0
  let prevVolume = 0

  function calculate(candle: Candle): VWAPResultItem {
    prevTotal = cumulativeTotal
    prevVolume = cumulativeVolume
    const typicalPrice =
      ((candle.high ?? candle.close) +
        (candle.low ?? candle.close) +
        candle.close) /
      3
    cumulativeTotal += typicalPrice * (candle.volume ?? 0)
    cumulativeVolume += candle.volume ?? 0
    return {
      time: candle.time,
      value:
        cumulativeVolume === 0
          ? typicalPrice
          : cumulativeTotal / cumulativeVolume,
    }
  }

  for (const c of candles) result.push(calculate(c))

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
        cumulativeTotal = prevTotal
        cumulativeVolume = prevVolume
      }
      const item = calculate(candle)
      result.push(item)
      return item
    },
  }
}

export function vwap(candles: CandleStick[]): number[] {
  return VWAP({ candles: candles as Candle[] })
    .result()
    .map((item) => item.value)
}
