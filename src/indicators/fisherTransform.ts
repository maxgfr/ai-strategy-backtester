import type { CandleStick } from '../types'

// Fisher Transform by John Ehlers
// Converts prices to Gaussian normal distribution for clearer turning points.
// Crossover of fisher/signal = entry signal.
export function fisherTransform(
  candles: CandleStick[],
  period = 10,
): Array<{ fisher: number; signal: number }> {
  const results: Array<{ fisher: number; signal: number }> = []
  const highs: number[] = []
  const lows: number[] = []

  let prevX = 0
  let prevFisher = 0

  for (const c of candles) {
    const hl2 = (c.high + c.low) / 2
    highs.push(c.high)
    lows.push(c.low)
    if (highs.length > period) highs.shift()
    if (lows.length > period) lows.shift()

    if (highs.length < period) {
      results.push({ fisher: 0, signal: 0 })
      continue
    }

    const highest = Math.max(...highs)
    const lowest = Math.min(...lows)
    const range = highest - lowest

    // Normalize to -1..+1
    const raw = range === 0 ? 0 : 2 * ((hl2 - lowest) / range - 0.5)
    // Smooth with previous value
    const x = Math.max(-0.999, Math.min(0.999, 0.33 * raw + 0.67 * prevX))

    const fisher = 0.5 * Math.log((1 + x) / (1 - x)) + 0.5 * prevFisher
    const signal = prevFisher

    results.push({ fisher, signal })
    prevX = x
    prevFisher = fisher
  }

  return results
}
