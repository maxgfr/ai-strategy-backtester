import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { williams } from '../williams'

describe('williams', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + Math.random() * 10,
    high: 105 + Math.random() * 10,
    low: 95 + Math.random() * 10,
    close: 100 + Math.random() * 10,
    volume: 1000,
  }))

  it('calculates Williams Vix values', () => {
    const result = williams(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('rangeHigh')
    expect(result[0]).toHaveProperty('rangeLow')
    expect(result[0]).toHaveProperty('wvf')
    expect(result[0]).toHaveProperty('upperBand')
    expect(result[0]).toHaveProperty('isBuyZone')
  })

  it('returns empty array for empty input', () => {
    const result = williams([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = williams(candles, 14, 10, 1.5, 40, 0.8, 1.02)

    expect(result.length).toBeGreaterThan(0)
  })

  it('isBuyZone is boolean', () => {
    const result = williams(candles)

    for (const item of result) {
      expect(typeof item.isBuyZone).toBe('boolean')
    }
  })
})
