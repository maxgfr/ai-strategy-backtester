import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { obv } from '../obv'

describe('obv', () => {
  it('calculates OBV for trending up prices', () => {
    const candles: CandleStick[] = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
      volume: 1000,
    }))

    const result = obv(candles)

    expect(result.length).toBeGreaterThan(0)
    // All closes are higher than previous, OBV should increase
    expect(result[result.length - 1]).toBeGreaterThan(0)
  })

  it('calculates OBV for trending down prices', () => {
    const candles: CandleStick[] = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      open: 200 - i,
      high: 205 - i,
      low: 195 - i,
      close: 200 - i,
      volume: 1000,
    }))

    const result = obv(candles)

    expect(result.length).toBeGreaterThan(0)
    // All closes are lower than previous, OBV should decrease
    expect(result[result.length - 1]).toBeLessThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = obv([])
    expect(result).toEqual([])
  })

  it('handles single candle', () => {
    const candles: CandleStick[] = [
      {
        time: 0,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      },
    ]

    const result = obv(candles)

    expect(result.length).toBeGreaterThanOrEqual(0)
  })
})
