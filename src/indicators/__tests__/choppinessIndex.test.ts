import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { choppinessIndex } from '../choppinessIndex'

describe('choppinessIndex', () => {
  it('returns array of same length as input', () => {
    const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }))
    const result = choppinessIndex(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns empty array for empty input', () => {
    expect(choppinessIndex([])).toEqual([])
  })

  it('values are between 0 and 100', () => {
    const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100 + Math.sin(i) * 5,
      high: 105 + Math.sin(i) * 5,
      low: 95 + Math.sin(i) * 5,
      close: 100 + Math.sin(i) * 5,
      volume: 1000,
    }))
    const result = choppinessIndex(candles)
    for (const v of result) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('trending market produces lower values', () => {
    // Strong trend: price goes up steadily
    const trending: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100 + i * 5,
      high: 103 + i * 5,
      low: 98 + i * 5,
      close: 101 + i * 5,
      volume: 1000,
    }))
    // Choppy: price oscillates
    const choppy: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100 + (i % 2 === 0 ? 5 : -5),
      high: 108 + (i % 2 === 0 ? 5 : -5),
      low: 92 + (i % 2 === 0 ? 5 : -5),
      close: 100 + (i % 2 === 0 ? 5 : -5),
      volume: 1000,
    }))
    const trendResult = choppinessIndex(trending)
    const choppyResult = choppinessIndex(choppy)
    const lastTrend = trendResult[trendResult.length - 1]
    const lastChoppy = choppyResult[choppyResult.length - 1]
    expect(lastTrend).toBeLessThan(lastChoppy)
  })
})
