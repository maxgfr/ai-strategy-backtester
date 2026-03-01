import { highest } from './primitives/highest'
import { lowest } from './primitives/lowest'
import { SMA } from './primitives/sma'
import { STDEV } from './primitives/stdev'
import type { Candle, Cross } from './primitives/types'

export interface WilliamsVixResultItem {
  time: Candle['time']
  candle: Candle
  rangeHigh: number
  rangeLow: number
  wvf: number
  upperBand: number
  isBuyZone: boolean
  cross: Cross | null
}

export function WilliamsVix({
  candles,
  lookBackPeriodStDevHigh = 22,
  bbLength = 20,
  bbStandardDeviationUp = 2,
  lookBackPeriodPercentileHigh = 50,
  highestPercentile = 0.85,
  lowestPercentile = 1.01,
}: {
  candles: Candle[]
  lookBackPeriodStDevHigh?: number
  bbLength?: number
  bbStandardDeviationUp?: number
  lookBackPeriodPercentileHigh?: number
  highestPercentile?: number
  lowestPercentile?: number
}) {
  const result = new Map<Candle['time'], WilliamsVixResultItem>()
  let crossResult: Cross[] = []

  const highestInstance = highest({
    candles: [],
    period: lookBackPeriodStDevHigh,
  })
  const lowestInstance = lowest({
    candles: [],
    period: lookBackPeriodStDevHigh,
  })
  const stDevInstance = STDEV({ candles: [], period: bbLength })
  const smaInstance = SMA({ candles: [], period: bbLength })
  const rangeHighInstance = highest({
    candles: [],
    period: lookBackPeriodPercentileHigh,
  })
  const rangeLowInstance = highest({
    candles: [],
    period: lookBackPeriodPercentileHigh,
  })

  function calculate(candle: Candle): WilliamsVixResultItem | undefined {
    const lowestResult = lowestInstance.update(candle)
    const highestResult = highestInstance.update(candle)

    if (!lowestResult || !highestResult) return undefined

    const wvf =
      ((highestResult.value - (candle.low ?? candle.close)) /
        highestResult.value) *
      100
    const sDevResult = stDevInstance.update({ ...candle, close: wvf })
    const sDev = bbStandardDeviationUp * (sDevResult?.value || 0)
    const smaResult = smaInstance.update({ ...candle, close: wvf })
    const midLine = smaResult?.value || 0
    const upperBand = midLine + sDev
    const rangeHighResult = rangeHighInstance.update({
      ...candle,
      close: wvf,
    })
    const rangeHigh = (rangeHighResult?.value || 0) * highestPercentile
    const rangeLowResult = rangeLowInstance.update({ ...candle, close: wvf })
    const rangeLow = (rangeLowResult?.value || 0) * lowestPercentile
    const isBuyZone = wvf >= upperBand || wvf >= rangeHigh

    let cross: Cross | null = null
    if (result.size >= 1) {
      const prevResult = Array.from(result.values()).pop()
      if (!prevResult) return undefined
      const long = prevResult.isBuyZone && !isBuyZone

      if (long || isBuyZone) {
        cross = {
          name: isBuyZone ? 'In' : 'Out',
          long: long || isBuyZone,
          time: candle.time,
        }
        crossResult.push(cross)
      }
    }

    return {
      cross,
      time: candle.time,
      candle,
      rangeHigh,
      rangeLow,
      isBuyZone,
      wvf,
      upperBand,
    }
  }

  for (const candle of candles) {
    const item = calculate(candle)
    if (item) result.set(candle.time, item)
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
      }

      const item = calculate(candle)
      if (item) result.set(candle.time, item)

      return item
    },
  }
}

export function williams(
  candles: Array<Candle>,
  lookBackPeriodStDevHigh = 22,
  bbLength = 20,
  bbStandardDeviationUp = 2,
  lookBackPeriodPercentileHigh = 50,
  highestPercentile = 0.85,
  lowestPercentile = 1.01,
): Array<{
  rangeHigh: number
  rangeLow: number
  wvf: number
  upperBand: number
  isBuyZone: boolean
}> {
  const map = WilliamsVix({
    candles,
    lookBackPeriodStDevHigh,
    bbLength,
    bbStandardDeviationUp,
    lookBackPeriodPercentileHigh,
    lowestPercentile,
    highestPercentile,
  }).result() as Map<Candle['time'], WilliamsVixResultItem>
  const res: Array<{
    rangeHigh: number
    rangeLow: number
    wvf: number
    upperBand: number
    isBuyZone: boolean
  }> = []
  map.forEach((v: WilliamsVixResultItem) => {
    res.push({
      rangeHigh: v.rangeHigh,
      rangeLow: v.rangeLow,
      wvf: v.wvf,
      upperBand: v.upperBand,
      isBuyZone: v.isBuyZone,
    })
  })
  return res
}
