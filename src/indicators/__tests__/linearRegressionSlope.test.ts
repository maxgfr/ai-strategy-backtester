import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { linearRegressionSlope } from '../linearRegressionSlope'

describe('linearRegressionSlope', () => {
  it('returns array of same length as input', () => {
    const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }))
    const result = linearRegressionSlope(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(linearRegressionSlope([])).toEqual([])
  })

  it('positive slope for uptrend', () => {
    const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100 + i * 2,
      high: 105 + i * 2,
      low: 95 + i * 2,
      close: 100 + i * 2,
      volume: 1000,
    }))
    const result = linearRegressionSlope(candles)
    // After warmup, slope should be positive and close to 2
    const lastSlope = result[result.length - 1]
    expect(lastSlope).toBeGreaterThan(0)
    expect(lastSlope).toBeCloseTo(2, 1)
  })

  it('negative slope for downtrend', () => {
    const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 200 - i * 3,
      high: 205 - i * 3,
      low: 195 - i * 3,
      close: 200 - i * 3,
      volume: 1000,
    }))
    const result = linearRegressionSlope(candles)
    const lastSlope = result[result.length - 1]
    expect(lastSlope).toBeLessThan(0)
    expect(lastSlope).toBeCloseTo(-3, 1)
  })

  it('near-zero slope for flat market', () => {
    const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }))
    const result = linearRegressionSlope(candles)
    const lastSlope = result[result.length - 1]
    expect(Math.abs(lastSlope)).toBeLessThan(0.01)
  })
})
