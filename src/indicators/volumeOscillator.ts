import type { CandleStick } from '../types'

// Volume Oscillator: (EMA(volume, fast) - EMA(volume, slow)) / EMA(volume, slow) * 100
export function volumeOscillator(
  candles: CandleStick[],
  fastPeriod = 14,
  slowPeriod = 28,
): number[] {
  const fastMult = 2 / (fastPeriod + 1)
  const slowMult = 2 / (slowPeriod + 1)
  const result: number[] = []
  let fastEma: number | undefined
  let slowEma: number | undefined

  for (const candle of candles) {
    const vol = candle.volume
    fastEma = fastEma === undefined ? vol : fastEma + fastMult * (vol - fastEma)
    slowEma = slowEma === undefined ? vol : slowEma + slowMult * (vol - slowEma)
    if (slowEma !== 0) result.push(((fastEma - slowEma) / slowEma) * 100)
  }

  return result
}

// Rate of Change: ((close - close[n]) / close[n]) * 100
export function rateOfChange(candles: CandleStick[], period = 14): number[] {
  const result: number[] = []
  for (let i = period; i < candles.length; i++) {
    const prevClose = candles[i - period].close
    if (prevClose !== 0)
      result.push(((candles[i].close - prevClose) / prevClose) * 100)
  }
  return result
}
