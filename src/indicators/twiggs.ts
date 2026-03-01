import type { CandleStick } from '../types'

// Twiggs Money Flow
// Smoothed version of the Chaikin Money Flow using EMA.
// Values above 0 indicate buying pressure, below 0 selling pressure.
export function twiggs(candles: CandleStick[], period = 21): number[] {
  const mult = 2 / (period + 1)
  const result: number[] = []
  let emaMFV: number | undefined
  let emaVol: number | undefined

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const prevClose = candles[i - 1].close
    const trh = Math.max(c.high, prevClose)
    const trl = Math.min(c.low, prevClose)
    const mfv =
      trh === trl ? 0 : c.volume * ((2 * c.close - trh - trl) / (trh - trl))

    emaMFV = emaMFV === undefined ? mfv : emaMFV + mult * (mfv - emaMFV)
    emaVol =
      emaVol === undefined ? c.volume : emaVol + mult * (c.volume - emaVol)

    result.push(emaVol === 0 ? 0 : emaMFV / emaVol)
  }

  return result
}
