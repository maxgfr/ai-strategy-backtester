import type { CandleStick } from '../types'

// Price Momentum Oscillator (PMO) by Martin Pring
// PMO = EMA(EMA(ROC(1) * 20, smooth1Period), smooth2Period)
// Signal = EMA(PMO, signalPeriod)
export function pmo(
  candles: CandleStick[],
  smooth1Period = 35,
  smooth2Period = 20,
  signalPeriod = 10,
): Array<{ pmo: number; signal: number }> {
  const mult1 = 2 / (smooth1Period + 1)
  const mult2 = 2 / (smooth2Period + 1)
  const multSig = 2 / (signalPeriod + 1)

  const result: Array<{ pmo: number; signal: number }> = []
  let ema1: number | undefined
  let pmoValue: number | undefined
  let signal: number | undefined

  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close
    if (prevClose === 0) continue

    const roc1 = (candles[i].close / prevClose - 1) * 100
    ema1 = ema1 === undefined ? roc1 * 20 : ema1 + mult1 * (roc1 * 20 - ema1)
    pmoValue =
      pmoValue === undefined ? ema1 : pmoValue + mult2 * (ema1 - pmoValue)
    signal =
      signal === undefined ? pmoValue : signal + multSig * (pmoValue - signal)

    result.push({ pmo: pmoValue, signal })
  }

  return result
}
