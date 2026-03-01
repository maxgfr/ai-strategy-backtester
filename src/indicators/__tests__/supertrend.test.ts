import { describe, expect, it } from 'vitest'
import { supertrend } from '../supertrend'

describe('supertrend', () => {
  it('calculates supertrend for trending up data', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      high: 100 + i,
      low: 98 + i,
      close: 99 + i,
    }))

    const result = supertrend(candles, 10, 3)

    expect(result.length).toBeGreaterThan(0)
    expect(result[result.length - 1]).toBeGreaterThan(0)
  })

  it('calculates supertrend for trending down data', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      high: 130 - i,
      low: 128 - i,
      close: 129 - i,
    }))

    const result = supertrend(candles, 10, 3)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = supertrend([], 10, 3)
    expect(result).toEqual([])
  })

  it('handles different periods and multipliers', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      high: 100 + i,
      low: 98 + i,
      close: 99 + i,
    }))

    const result1 = supertrend(candles, 5, 2)
    const result2 = supertrend(candles, 14, 3)

    expect(result1.length).toBeGreaterThan(0)
    expect(result2.length).toBeGreaterThan(0)
  })
})
