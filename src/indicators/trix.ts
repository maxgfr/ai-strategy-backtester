import type { CandleStick } from '../types'
import { EMA } from './ema'
import type { Candle } from './primitives/types'

interface TRIXResultItem {
  time: Candle['time']
  value: number
}

export function TRIX({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  const result: TRIXResultItem[] = []
  const ema1 = EMA({ candles: [], period })
  const ema2 = EMA({ candles: [], period })
  const ema3 = EMA({ candles: [], period })
  let prevTriple: number | undefined
  let prevPrevTriple: number | undefined

  function calculate(candle: Candle): TRIXResultItem | undefined {
    prevPrevTriple = prevTriple

    const e1 = ema1.update(candle)
    if (e1 === undefined) return undefined

    const e2 = ema2.update({ time: candle.time, close: e1.value })
    if (e2 === undefined) return undefined

    const e3 = ema3.update({ time: candle.time, close: e2.value })
    if (e3 === undefined) return undefined

    const triple = e3.value
    let value: number | undefined
    if (prevTriple !== undefined) {
      value = prevTriple === 0 ? 0 : ((triple - prevTriple) / prevTriple) * 100
    }
    prevTriple = triple

    if (value === undefined) return undefined
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
        prevTriple = prevPrevTriple
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function trix(candles: CandleStick[], period = 14): number[] {
  return TRIX({ candles: candles as Candle[], period })
    .result()
    .map((item) => item.value)
}
