import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { ravi } from '../ravi'

describe('ravi', () => {
  const candles: CandleStick[] = Array.from({ length: 100 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates RAVI values', () => {
    const result = ravi(candles)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = ravi([])
    expect(result).toEqual([])
  })

  it('handles custom periods', () => {
    const result = ravi(candles, 5, 20)

    expect(result.length).toBeGreaterThan(0)
  })

  it('RAVI is non-negative', () => {
    const result = ravi(candles)

    for (const value of result) {
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})
