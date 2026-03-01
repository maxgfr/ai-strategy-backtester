import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { shinohara } from '../shinohara'

describe('shinohara', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Shinohara values', () => {
    const result = shinohara(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('bullish')
    expect(result[0]).toHaveProperty('bearish')
  })

  it('returns empty array for empty input', () => {
    const result = shinohara([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = shinohara(candles, 10)

    expect(result.length).toBeGreaterThan(0)
  })

  it('values are non-negative', () => {
    const result = shinohara(candles)

    for (const item of result) {
      expect(item.bullish).toBeGreaterThanOrEqual(0)
      expect(item.bearish).toBeGreaterThanOrEqual(0)
    }
  })
})
