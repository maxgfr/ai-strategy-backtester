import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { lowestLow } from '../lowestLow'

describe('lowestLow', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates lowest low values', () => {
    const result = lowestLow(candles)

    expect(result.length).toBe(30 - 14 + 1)
  })

  it('returns empty array for empty input', () => {
    const result = lowestLow([])
    expect(result).toEqual([])
  })

  it('handles short arrays', () => {
    const shortCandles: CandleStick[] = [
      {
        time: 0,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      },
    ]

    const result = lowestLow(shortCandles, 5)

    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = lowestLow(candles, 10)

    expect(result.length).toBe(30 - 10 + 1)
  })

  it('returns correct lowest value for known data', () => {
    const testCandles: CandleStick[] = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      open: 100,
      high: 110,
      low: 100 - i * 2,
      close: 105,
      volume: 1000,
    }))

    const result = lowestLow(testCandles, 5)

    // Last 5 candles should have the lowest low at the end
    expect(result[result.length - 1]).toBeLessThan(result[0])
  })
})
