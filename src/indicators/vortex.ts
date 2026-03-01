import type { CandleStick } from '../types'

export function vortex(
  candles: CandleStick[],
  period = 14,
): Array<{ plusVI: number; minusVI: number }> {
  const result: Array<{ plusVI: number; minusVI: number }> = []

  for (let i = period; i < candles.length; i++) {
    let sumPlusVM = 0
    let sumMinusVM = 0
    let sumTR = 0

    for (let j = i - period + 1; j <= i; j++) {
      const prev = candles[j - 1]
      const curr = candles[j]
      sumPlusVM += Math.abs(curr.high - prev.low)
      sumMinusVM += Math.abs(curr.low - prev.high)
      sumTR += Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close),
      )
    }

    result.push({
      plusVI: sumTR === 0 ? 0 : sumPlusVM / sumTR,
      minusVI: sumTR === 0 ? 0 : sumMinusVM / sumTR,
    })
  }

  return result
}
