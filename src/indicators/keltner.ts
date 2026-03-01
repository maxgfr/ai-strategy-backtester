import type { CandleStick } from '../types'
import { ATR } from './atr'
import { EMA } from './ema'
import { SMA } from './primitives/sma'
import type { Candle } from './primitives/types'

interface KeltnerResultItem {
  time: Candle['time']
  middle: number
  upper: number
  lower: number
}

export function Keltner({
  candles,
  maPeriod = 20,
  atrPeriod = 10,
  multiplier = 1,
  useSMA = false,
}: {
  candles: Candle[]
  maPeriod?: number
  atrPeriod?: number
  multiplier?: number
  useSMA?: boolean
}) {
  let result: KeltnerResultItem[] = []
  const ma = useSMA
    ? SMA({ candles: [], period: maPeriod })
    : EMA({ candles: [], period: maPeriod })
  const atr = ATR({ candles: [], period: atrPeriod })

  function calculate(candle: Candle): KeltnerResultItem | undefined {
    const maResult = ma.update(candle)
    const atrResult = atr.update(candle)
    if (!maResult || !atrResult) return undefined

    const middle = maResult.value
    const band = multiplier * atrResult.value
    return {
      time: candle.time,
      middle,
      upper: middle + band,
      lower: middle - band,
    }
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
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function keltner(
  candles: CandleStick[],
  maPeriod = 20,
  atrPeriod = 10,
  multiplier = 1.5,
): Array<{ upper: number; middle: number; lower: number }> {
  return Keltner({
    candles: candles as Candle[],
    maPeriod,
    atrPeriod,
    multiplier,
  })
    .result()
    .map(({ upper, middle, lower }) => ({ upper, middle, lower }))
}
