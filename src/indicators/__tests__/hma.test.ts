import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { hma } from '../hma'

describe('hma', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = hma(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns empty array for empty input', () => {
    expect(hma([])).toEqual([])
  })

  it('follows trend faster than simple averages', () => {
    const result = hma(candles, 10)
    // With a clear uptrend, HMA should be close to price
    const lastHma = result[result.length - 1]
    const lastClose = candles[candles.length - 1].close
    expect(lastHma).toBeGreaterThan(0)
    expect(Math.abs(lastClose - lastHma)).toBeLessThan(15)
  })

  it('handles custom period', () => {
    const result = hma(candles, 20)
    expect(result.length).toBe(candles.length)
    // Should have non-zero values towards end
    expect(result[result.length - 1]).toBeGreaterThan(0)
  })
})
