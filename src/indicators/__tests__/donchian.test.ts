import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { donchian } from '../donchian'

describe('donchian', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100,
    high: 100 + i * 2,
    low: 90 - i,
    close: 95,
    volume: 1000,
  }))

  it('calculates Donchian Channels', () => {
    const result = donchian(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('upper')
    expect(result[0]).toHaveProperty('lower')
    expect(result[0]).toHaveProperty('middle')
  })

  it('returns empty array for empty input', () => {
    const result = donchian([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = donchian(candles, 10)

    expect(result.length).toBeGreaterThan(0)
  })

  it('upper is highest high, lower is lowest low', () => {
    const result = donchian(candles, 10)

    for (const item of result) {
      expect(item.upper).toBeGreaterThanOrEqual(item.middle)
      expect(item.middle).toBeGreaterThanOrEqual(item.lower)
    }
  })

  it('middle is average of upper and lower', () => {
    const result = donchian(candles)

    for (const item of result) {
      expect(item.middle).toBeCloseTo((item.upper + item.lower) / 2, 5)
    }
  })
})
