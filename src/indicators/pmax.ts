import type { CandleStick } from '../types'
import { ATR } from './atr'
import { EMA } from './ema'
import type { Candle, Cross } from './primitives/types'

export interface PMaxResultItem {
  time: Candle['time']
  ema: number
  pmax: number
  pmaxReverse: number
  pmaxLong: number
  pmaxShort: number
  candle: Candle
  cross: Cross | null
}

export function PMax({
  candles,
  emaPeriod = 10,
  atrPeriod = 10,
  multiplier = 3,
}: {
  candles: Candle[]
  emaPeriod?: number
  atrPeriod?: number
  multiplier?: number
}) {
  let crossResult: Cross[] = []
  const result = new Map<Candle['time'], PMaxResultItem>()
  const ema = EMA({ candles: [], period: emaPeriod })
  const atr = ATR({ candles: [], period: atrPeriod })

  let longStopPrev: number
  let longStopStack: number[] = []
  let dirStackPrev = 1
  let dirStack: number[] = []
  let shortStopPrev: number
  let shortStopStack: number[] = []

  function calculate(candle: Candle): PMaxResultItem | undefined {
    const emaResult = ema.update({
      ...candle,
      close: ((candle.low ?? candle.close) + (candle.high ?? candle.close)) / 2,
    })
    const atrResult = atr.update(candle)

    if (!emaResult || !atrResult) return undefined

    let longStop = emaResult.value - multiplier * atrResult.value
    longStopPrev = longStopStack.pop() || longStop
    longStop =
      emaResult.value > longStopPrev
        ? Math.max(longStop, longStopPrev)
        : longStop
    longStopStack.push(longStop)

    let shortStop = emaResult.value + multiplier * atrResult.value
    shortStopPrev = shortStopStack.pop() || shortStop
    shortStop =
      emaResult.value < shortStopPrev
        ? Math.min(shortStop, shortStopPrev)
        : shortStop
    shortStopStack.push(shortStop)

    let dir = 1
    dirStackPrev = dirStack.pop() || dir
    dir = dirStackPrev
    dir =
      dir === -1 && emaResult.value > shortStopPrev
        ? 1
        : dir === 1 && emaResult.value < longStopPrev
          ? -1
          : dir
    dirStack.push(dir)

    const pmaxVal = dir === 1 ? longStop : shortStop

    let cross: Cross | null = null
    if (result.size >= 1) {
      const prevResult = Array.from(result.values()).pop()
      if (!prevResult) return undefined

      const short =
        prevResult.pmax < prevResult.ema && pmaxVal >= emaResult.value
      const long =
        prevResult.pmax >= prevResult.ema && pmaxVal < emaResult.value
      if (short || long) {
        cross = {
          long,
          time: candle.time,
        }
        crossResult.push(cross)
      }
    }

    return {
      candle,
      time: candle.time,
      ema: emaResult.value,
      pmax: pmaxVal,
      pmaxReverse: dir === 1 ? shortStop : longStop,
      pmaxLong: longStop,
      pmaxShort: shortStop,
      cross,
    }
  }

  for (const item of candles) {
    const res = calculate(item)
    if (res) result.set(item.time, res)
  }

  return {
    cross: () => crossResult,
    result: (time?: Candle['time']) => {
      if (time) return result.get(time)
      return result
    },
    update: (candle: Candle) => {
      const prevResult = Array.from(result.values()).pop()

      if (result.size && prevResult?.time === candle.time) {
        if (
          crossResult.length &&
          crossResult[crossResult.length - 1].time === candle.time
        ) {
          crossResult = crossResult.slice(0, -1)
        }

        result.delete(candle.time)
        longStopStack = [longStopPrev]
        dirStack = [dirStackPrev]
        shortStopStack = [shortStopPrev]
      }

      const item = calculate(candle)
      if (item) result.set(candle.time, item)

      return item
    },
  }
}

export function pmax(
  initialArray: Array<CandleStick>,
  emaPeriod: number,
  atrPeriod: number,
  multiplier: number,
): Array<{
  pmax: number
  pmaxLong: number
  pmaxShort: number
}> {
  const map = PMax({
    candles: initialArray as Candle[],
    emaPeriod,
    atrPeriod,
    multiplier,
  }).result() as Map<Candle['time'], PMaxResultItem>
  const res: Array<{ pmax: number; pmaxLong: number; pmaxShort: number }> = []
  map.forEach((v: PMaxResultItem) => {
    res.push({ pmax: v.pmax, pmaxLong: v.pmaxLong, pmaxShort: v.pmaxShort })
  })
  return res
}
