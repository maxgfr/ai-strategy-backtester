import { describe, expect, it } from 'vitest'
import { rsi } from '../rsi'

describe('rsi', () => {
  it('calculates RSI for trending up data', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      high: 100 + i,
      low: 98 + i,
      close: 99 + i,
    }))

    const result = rsi(candles, 14)

    expect(result.length).toBeGreaterThan(0)
    // Strong uptrend should result in high RSI (>50)
    expect(result[result.length - 1]).toBeGreaterThan(50)
  })

  it('calculates RSI for trending down data', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      high: 120 - i,
      low: 118 - i,
      close: 119 - i,
    }))

    const result = rsi(candles, 14)

    expect(result.length).toBeGreaterThan(0)
    // Strong downtrend should result in low RSI (<50)
    expect(result[result.length - 1]).toBeLessThan(50)
  })

  it('returns empty array for empty input', () => {
    const result = rsi([], 14)
    expect(result).toEqual([])
  })

  it('handles different RSI periods', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      high: 100 + i,
      low: 98 + i,
      close: 99 + i,
    }))

    const rsi14 = rsi(candles, 14)
    const rsi21 = rsi(candles, 21)

    expect(rsi14.length).toBeGreaterThan(0)
    expect(rsi21.length).toBeGreaterThan(0)
  })

  it('RSI values are bounded between 0 and 100', () => {
    const candles = Array.from({ length: 30 }, () => ({
      high: 100 + Math.random() * 20,
      low: 90 + Math.random() * 20,
      close: 95 + Math.random() * 20,
    }))

    const result = rsi(candles, 14)

    for (const value of result) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })
})
