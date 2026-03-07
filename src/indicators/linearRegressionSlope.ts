import type { CandleStick } from '../types'

// Linear Regression Slope (LRS)
// Slope of the least-squares regression line over N periods.
// Positive = uptrend, negative = downtrend. Magnitude = trend strength.
export function linearRegressionSlope(
  candles: CandleStick[],
  period = 14,
): number[] {
  const results: number[] = new Array(candles.length).fill(0)

  // Precompute sum of x indices (0..period-1) — constant for all windows
  // sumX = period*(period-1)/2, sumX2 = period*(period-1)*(2*period-1)/6
  const sumX = (period * (period - 1)) / 2
  const sumX2 = (period * (period - 1) * (2 * period - 1)) / 6
  const denominator = period * sumX2 - sumX * sumX

  if (denominator === 0) return results

  for (let i = period - 1; i < candles.length; i++) {
    let sumY = 0
    let sumXY = 0

    for (let j = 0; j < period; j++) {
      const y = candles[i - period + 1 + j].close
      sumY += y
      sumXY += j * y
    }

    // Slope = (n * Σ(xy) - Σx * Σy) / (n * Σ(x²) - (Σx)²)
    results[i] = (period * sumXY - sumX * sumY) / denominator
  }

  return results
}
