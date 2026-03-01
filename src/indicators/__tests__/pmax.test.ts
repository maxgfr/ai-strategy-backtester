import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { pmax } from '../pmax'

describe('pmax', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i * 2,
    high: 105 + i * 2,
    low: 95 + i * 2,
    close: 100 + i * 2,
    volume: 1000,
  }))

  it('calculates PMAX values', () => {
    const result = pmax(candles, 10, 10, 3)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('pmax')
    expect(result[0]).toHaveProperty('pmaxLong')
    expect(result[0]).toHaveProperty('pmaxShort')
  })

  it('returns empty array for empty input', () => {
    const result = pmax([], 10, 10, 3)
    expect(result).toEqual([])
  })

  it('calculates PMAX with different parameters', () => {
    const result1 = pmax(candles, 5, 5, 2)
    const result2 = pmax(candles, 20, 20, 4)

    expect(result1.length).toBeGreaterThan(0)
    expect(result2.length).toBeGreaterThan(0)
  })

  it('pmax equals either pmaxLong or pmaxShort', () => {
    const result = pmax(candles, 10, 10, 3)

    for (const item of result) {
      const isLong = item.pmax === item.pmaxLong
      const isShort = item.pmax === item.pmaxShort
      expect(isLong || isShort).toBe(true)
    }
  })
})
