import type { CandleStick } from '../types'

export function shinohara(
  candles: CandleStick[],
  period = 26,
): Array<{ bullish: number; bearish: number }> {
  const result: Array<{ bullish: number; bearish: number }> = []

  for (let i = period; i < candles.length; i++) {
    let sumHighMinusOpen = 0
    let sumOpenMinusLow = 0
    let sumHighMinusPrevClose = 0
    let sumPrevCloseMinusLow = 0

    for (let j = i - period + 1; j <= i; j++) {
      const prevClose = candles[j - 1].close
      const c = candles[j]
      sumHighMinusOpen += Math.max(0, c.high - c.open)
      sumOpenMinusLow += Math.max(0, c.open - c.low)
      sumHighMinusPrevClose += Math.max(0, c.high - prevClose)
      sumPrevCloseMinusLow += Math.max(0, prevClose - c.low)
    }

    result.push({
      bullish:
        sumOpenMinusLow === 0 ? 0 : (sumHighMinusOpen / sumOpenMinusLow) * 100,
      bearish:
        sumPrevCloseMinusLow === 0
          ? 0
          : (sumHighMinusPrevClose / sumPrevCloseMinusLow) * 100,
    })
  }

  return result
}
