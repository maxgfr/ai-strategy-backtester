import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { movingAverage } from '../movingAverage'

describe('movingAverage', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates EMA', () => {
    const result = movingAverage(candles, 10, 'ema')

    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(candles.length)
  })

  it('calculates SMA', () => {
    const result = movingAverage(candles, 10, 'sma')

    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(candles.length)
  })

  it('returns empty array for empty input', () => {
    const result = movingAverage([], 10)
    expect(result).toEqual([])
  })

  it('handles different periods', () => {
    const ma5 = movingAverage(candles, 5)
    const ma20 = movingAverage(candles, 20)

    expect(ma5.length).toBeGreaterThan(ma20.length)
  })

  it('SMA equals average for constant prices', () => {
    const constantCandles: CandleStick[] = Array.from(
      { length: 20 },
      (_, i) => ({
        time: i,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 1000,
      }),
    )

    const result = movingAverage(constantCandles, 10, 'sma')

    expect(result[result.length - 1]).toBeCloseTo(100)
  })
})
