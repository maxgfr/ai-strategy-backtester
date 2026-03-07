import type { CandleStick } from '../types'

// Relative Vigor Index (RVI)
// Measures the conviction of a price move by comparing close-open to high-low.
// Uses symmetric weighted smoothing (1, 2, 2, 1) / 6.
// Crossover of rvi/signal = entry signal.
export function rvi(
  candles: CandleStick[],
  period = 10,
): Array<{ rvi: number; signal: number }> {
  const results: Array<{ rvi: number; signal: number }> = []

  if (candles.length < 4) {
    return candles.map(() => ({ rvi: 0, signal: 0 }))
  }

  // Compute smoothed numerator and denominator at each bar
  const smoothNum: number[] = new Array(candles.length).fill(0)
  const smoothDen: number[] = new Array(candles.length).fill(0)

  for (let i = 3; i < candles.length; i++) {
    // Symmetric weighted average (1, 2, 2, 1) / 6
    smoothNum[i] =
      (candles[i].close -
        candles[i].open +
        2 * (candles[i - 1].close - candles[i - 1].open) +
        2 * (candles[i - 2].close - candles[i - 2].open) +
        (candles[i - 3].close - candles[i - 3].open)) /
      6
    smoothDen[i] =
      (candles[i].high -
        candles[i].low +
        2 * (candles[i - 1].high - candles[i - 1].low) +
        2 * (candles[i - 2].high - candles[i - 2].low) +
        (candles[i - 3].high - candles[i - 3].low)) /
      6
  }

  // RVI = SMA(period, smoothNum) / SMA(period, smoothDen)
  const rviValues: number[] = new Array(candles.length).fill(0)

  for (let i = period + 2; i < candles.length; i++) {
    let numSum = 0
    let denSum = 0
    for (let j = i - period + 1; j <= i; j++) {
      numSum += smoothNum[j]
      denSum += smoothDen[j]
    }
    rviValues[i] = denSum === 0 ? 0 : numSum / denSum
  }

  // Signal = symmetric weighted average of RVI (1, 2, 2, 1) / 6
  for (let i = 0; i < candles.length; i++) {
    if (i < period + 5) {
      results.push({ rvi: rviValues[i], signal: 0 })
    } else {
      const signal =
        (rviValues[i] +
          2 * rviValues[i - 1] +
          2 * rviValues[i - 2] +
          rviValues[i - 3]) /
        6
      results.push({ rvi: rviValues[i], signal })
    }
  }

  return results
}
