import { round } from './utils'

/**
 * One-sample t-test: tests whether the mean of profits is significantly > 0.
 * Returns { tStatistic, pValue, isSignificant }.
 */
export function tTest(values: number[]): {
  tStatistic: number
  pValue: number
  isSignificant: boolean
} {
  if (values.length < 2) {
    return { tStatistic: 0, pValue: 1, isSignificant: false }
  }

  const n = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
  const stdErr = Math.sqrt(variance / n)

  if (stdErr === 0) {
    return {
      tStatistic: mean > 0 ? 9999 : mean < 0 ? -9999 : 0,
      pValue: mean === 0 ? 1 : 0,
      isSignificant: mean !== 0,
    }
  }

  const t = mean / stdErr
  // Approximate p-value using normal distribution for large n (>30)
  // For smaller n, use a simple approximation
  const df = n - 1
  const pValue = approximatePValue(Math.abs(t), df)

  return {
    tStatistic: round(t, 4),
    pValue: round(pValue, 4),
    isSignificant: pValue < 0.05,
  }
}

/**
 * Approximate one-tailed p-value for t-distribution.
 * Uses normal approximation for df > 30, otherwise a rough approximation.
 */
function approximatePValue(absT: number, df: number): number {
  if (df > 30) {
    // Normal approximation
    return 1 - normalCdf(absT)
  }
  // Simple approximation for small df using the relation:
  // p ≈ (1 - normalCdf(absT * (1 - 1/(4*df))))
  const adjusted = absT * (1 - 1 / (4 * df))
  return 1 - normalCdf(adjusted)
}

/**
 * Standard normal CDF approximation (Abramowitz and Stegun formula 26.2.17)
 */
function normalCdf(x: number): number {
  if (x < -8) return 0
  if (x > 8) return 1

  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x)
  const t = 1 / (1 + p * absX)
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-0.5 * absX * absX)

  return 0.5 * (1 + sign * y)
}

/**
 * Monte Carlo simulation: shuffle trade profits and compute equity curves.
 * Returns percentile statistics and ruin probability.
 */
export function monteCarloSimulation(
  tradeProfits: number[],
  initialCapital: number,
  iterations = 1000,
): {
  median: number
  p5: number
  p95: number
  ruinProbability: number
} {
  if (tradeProfits.length === 0) {
    return { median: 0, p5: 0, p95: 0, ruinProbability: 0 }
  }

  // Convert absolute profits to percentage returns (relative to equity at time of trade)
  const tradeReturns: number[] = []
  let equity = initialCapital
  for (const profit of tradeProfits) {
    if (equity > 0) {
      tradeReturns.push(Math.max(profit / equity, -1))
    } else {
      tradeReturns.push(0)
    }
    equity = Math.max(equity + profit, 0)
  }

  const finalCapitals: number[] = []
  let ruinCount = 0

  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffleArray(tradeReturns)
    let capital = initialCapital
    let ruined = false

    for (const ret of shuffled) {
      capital *= 1 + ret
      if (capital <= 0) {
        ruined = true
        capital = 0
        break
      }
    }

    finalCapitals.push(capital)
    if (ruined) ruinCount++
  }

  finalCapitals.sort((a, b) => a - b)

  const p5Index = Math.floor(iterations * 0.05)
  const p50Index = Math.floor(iterations * 0.5)
  const p95Index = Math.floor(iterations * 0.95)

  return {
    median: round(finalCapitals[p50Index]),
    p5: round(finalCapitals[p5Index]),
    p95: round(finalCapitals[p95Index]),
    ruinProbability: round(ruinCount / iterations, 4),
  }
}

/**
 * Fisher-Yates shuffle (creates a new array, does not mutate input).
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}
