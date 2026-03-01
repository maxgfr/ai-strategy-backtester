import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { keltner } from '../keltner'

describe('keltner', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Keltner Channels', () => {
    const result = keltner(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('upper')
    expect(result[0]).toHaveProperty('middle')
    expect(result[0]).toHaveProperty('lower')
  })

  it('returns empty array for empty input', () => {
    const result = keltner([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = keltner(candles, 10, 5, 2)

    expect(result.length).toBeGreaterThan(0)
  })

  it('upper > middle > lower', () => {
    const result = keltner(candles)

    for (const item of result) {
      expect(item.upper).toBeGreaterThan(item.middle)
      expect(item.middle).toBeGreaterThan(item.lower)
    }
  })
})
