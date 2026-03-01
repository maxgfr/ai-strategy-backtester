import type { CandleStick } from '../types'

/**
 * Chaikin Money Flow
 * Mesure la pression acheteur/vendeur sur une période glissante.
 * Valeur entre -1 et +1 :
 *   > 0  → pression acheteuse (money flow positif)
 *   < 0  → pression vendeuse (money flow négatif)
 *
 * Formule :
 *   MFM = (2×close − high − low) / (high − low)
 *   MFV = MFM × volume
 *   CMF = Σ(MFV, period) / Σ(volume, period)
 */
export function cmf(candles: CandleStick[], period = 20): number[] {
  const result: number[] = []

  for (let i = period - 1; i < candles.length; i++) {
    let sumMFV = 0
    let sumVolume = 0

    for (let j = i - period + 1; j <= i; j++) {
      const { high, low, close, volume } = candles[j]
      const range = high - low
      const mfm = range === 0 ? 0 : (2 * close - high - low) / range
      sumMFV += mfm * volume
      sumVolume += volume
    }

    result.push(sumVolume === 0 ? 0 : sumMFV / sumVolume)
  }

  return result
}
