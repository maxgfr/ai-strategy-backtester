import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { movingAverageEnvelope } from '../movingAverageEnvelope'

describe('movingAverageEnvelope', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100,
    high: 105,
    low: 95,
    close: 100,
    volume: 1000,
  }))

  it('calculates moving average envelope with SMA', () => {
    const result = movingAverageEnvelope(candles, 10, 2.5, 'sma')

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('upper')
    expect(result[0]).toHaveProperty('middle')
    expect(result[0]).toHaveProperty('lower')
  })

  it('calculates moving average envelope with EMA', () => {
    const result = movingAverageEnvelope(candles, 10, 2.5, 'ema')

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = movingAverageEnvelope([], 10, 2.5)
    expect(result).toEqual([])
  })

  it('upper > middle > lower for positive percentage', () => {
    const result = movingAverageEnvelope(candles, 10, 5)

    for (const item of result) {
      expect(item.upper).toBeGreaterThan(item.middle)
      expect(item.middle).toBeGreaterThan(item.lower)
    }
  })

  it('envelope is symmetrical around middle', () => {
    const percentage = 5
    const result = movingAverageEnvelope(candles, 10, percentage)

    for (const item of result) {
      const upperDiff = item.upper - item.middle
      const lowerDiff = item.middle - item.lower
      expect(upperDiff).toBeCloseTo(lowerDiff, 5)
    }
  })
})
