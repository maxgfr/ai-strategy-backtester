import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { cmf } from '../cmf'

describe('cmf', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Chaikin Money Flow', () => {
    const result = cmf(candles)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = cmf([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = cmf(candles, 10)

    expect(result.length).toBeGreaterThan(0)
  })

  it('CMF values are bounded between -1 and 1', () => {
    const result = cmf(candles)

    for (const value of result) {
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('positive CMF for uptrend with volume', () => {
    // Create candles with actual bullish movement
    const bullishCandles: CandleStick[] = Array.from(
      { length: 30 },
      (_, i) => ({
        time: i,
        open: 100 + i,
        high: 110 + i,
        low: 100 + i,
        close: 108 + i,
        volume: 1000,
      }),
    )

    const result = cmf(bullishCandles)

    // Uptrend with consistent volume should give positive CMF
    expect(result[result.length - 1]).toBeGreaterThan(0)
  })
})
