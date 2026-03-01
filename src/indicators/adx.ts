import type { CandleStick } from '../types'
import { RMA } from './primitives/rma'
import type { Candle } from './primitives/types'

interface ADXResultItem {
  time: Candle['time']
  adx: number
  pdi: number
  mdi: number
}

export function ADX({
  candles,
  period,
}: {
  candles: Candle[]
  period: number
}) {
  let result: ADXResultItem[] = []

  const rmaPosDM = RMA({ candles: [], period })
  const rmaNegDM = RMA({ candles: [], period })
  const rmaTR = RMA({ candles: [], period })
  const rmaDX = RMA({ candles: [], period })

  let prevHigh: number | undefined
  let prevLow: number | undefined
  let prevClose: number | undefined

  function calculate(candle: Candle): ADXResultItem | undefined {
    const high = candle.high ?? candle.close
    const low = candle.low ?? candle.close

    if (prevHigh === undefined) {
      prevHigh = high
      prevLow = low
      prevClose = candle.close
      return undefined
    }

    const tr = Math.max(
      high - low,
      Math.abs(high - (prevClose ?? 0)),
      Math.abs(low - (prevClose ?? 0)),
    )

    const upMove = high - prevHigh
    const downMove = (prevLow ?? 0) - low
    const posDM = upMove > downMove && upMove > 0 ? upMove : 0
    const negDM = downMove > upMove && downMove > 0 ? downMove : 0

    prevHigh = high
    prevLow = low
    prevClose = candle.close

    const smoothTR = rmaTR.update({ time: candle.time, close: tr })
    const smoothPosDM = rmaPosDM.update({ time: candle.time, close: posDM })
    const smoothNegDM = rmaNegDM.update({ time: candle.time, close: negDM })

    if (!smoothTR || !smoothPosDM || !smoothNegDM || smoothTR.value === 0)
      return undefined

    const pdi = (smoothPosDM.value / smoothTR.value) * 100
    const mdi = (smoothNegDM.value / smoothTR.value) * 100
    const diSum = pdi + mdi
    const dx = diSum === 0 ? 0 : (Math.abs(pdi - mdi) / diSum) * 100

    const adxResult = rmaDX.update({ time: candle.time, close: dx })
    if (!adxResult) return undefined

    return { time: candle.time, adx: adxResult.value, pdi, mdi }
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

export function adx(
  candles: CandleStick[],
  period = 14,
): Array<{ adx: number; pdi: number; mdi: number }> {
  return ADX({ candles: candles as Candle[], period })
    .result()
    .map(({ adx: adxVal, pdi, mdi }) => ({ adx: adxVal, pdi, mdi }))
}
