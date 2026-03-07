import type { CandleStick } from '../types'
import { WMA } from './primitives/wma'

// Coppock Curve by Edwin Coppock
// WMA(wmaPeriod, ROC(rocPeriod1) + ROC(rocPeriod2))
// Originally designed for monthly charts to identify long-term buying opportunities.
// Buy when curve crosses above zero from below.
export function coppockCurve(
  candles: CandleStick[],
  rocPeriod1 = 14,
  rocPeriod2 = 11,
  wmaPeriod = 10,
): number[] {
  const results: number[] = new Array(candles.length).fill(0)
  const maxRoc = Math.max(rocPeriod1, rocPeriod2)

  if (candles.length <= maxRoc) return results

  // Compute ROC sums
  const rocSum: number[] = new Array(candles.length).fill(0)
  for (let i = maxRoc; i < candles.length; i++) {
    const roc1 =
      candles[i - rocPeriod1].close === 0
        ? 0
        : ((candles[i].close - candles[i - rocPeriod1].close) /
            candles[i - rocPeriod1].close) *
          100
    const roc2 =
      candles[i - rocPeriod2].close === 0
        ? 0
        : ((candles[i].close - candles[i - rocPeriod2].close) /
            candles[i - rocPeriod2].close) *
          100
    rocSum[i] = roc1 + roc2
  }

  // Apply WMA to the ROC sum
  const wma = WMA({ candles: [], period: wmaPeriod })
  for (let i = maxRoc; i < candles.length; i++) {
    const r = wma.update({ time: i, close: rocSum[i] })
    if (r) {
      results[i] = r.value
    }
  }

  return results
}
