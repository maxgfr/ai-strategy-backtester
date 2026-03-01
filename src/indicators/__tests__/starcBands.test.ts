import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { starcBands } from '../starcBands'

describe('starcBands', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Starc Bands', () => {
    const result = starcBands(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('upper')
    expect(result[0]).toHaveProperty('middle')
    expect(result[0]).toHaveProperty('lower')
  })

  it('returns empty array for empty input', () => {
    const result = starcBands([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = starcBands(candles, 10, 20, 2)

    expect(result.length).toBeGreaterThan(0)
  })

  it('upper > middle > lower', () => {
    const result = starcBands(candles)

    for (const item of result) {
      expect(item.upper).toBeGreaterThan(item.middle)
      expect(item.middle).toBeGreaterThan(item.lower)
    }
  })
})
