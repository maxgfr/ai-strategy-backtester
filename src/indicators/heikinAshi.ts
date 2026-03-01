import type { Candle } from './primitives/types'

interface HeikinAshiResultItem {
  time: Candle['time']
  open: number
  high: number
  low: number
  close: number
}

export function HeikinAshi({ candles }: { candles: Candle[] }) {
  let result: HeikinAshiResultItem[] = []
  let prevOpen: number | undefined
  let prevClose: number | undefined
  let prevPrevOpen: number | undefined
  let prevPrevClose: number | undefined

  function calculate(candle: Candle): HeikinAshiResultItem {
    prevPrevOpen = prevOpen
    prevPrevClose = prevClose

    const high = candle.high ?? candle.close
    const low = candle.low ?? candle.close
    const open = candle.open ?? candle.close

    const haClose = (open + high + low + candle.close) / 4
    const haOpen =
      prevOpen === undefined
        ? (open + candle.close) / 2
        : (prevOpen + prevClose!) / 2
    const haHigh = Math.max(high, haOpen, haClose)
    const haLow = Math.min(low, haOpen, haClose)

    prevOpen = haOpen
    prevClose = haClose

    return {
      time: candle.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    }
  }

  for (const c of candles) result.push(calculate(c))

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result = result.slice(0, -1)
        prevOpen = prevPrevOpen
        prevClose = prevPrevClose
      }
      const item = calculate(candle)
      result.push(item)
      return item
    },
  }
}
