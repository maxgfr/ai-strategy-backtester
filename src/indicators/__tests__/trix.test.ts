import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { trix } from '../trix'

describe('trix', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates TRIX values', () => {
    const result = trix(candles)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = trix([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = trix(candles, 10)

    expect(result.length).toBeGreaterThan(0)
  })

  it('TRIX shows momentum for trending data', () => {
    const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
      time: i,
      open: 100 + i * 2,
      high: 105 + i * 2,
      low: 95 + i * 2,
      close: 100 + i * 2,
      volume: 1000,
    }))

    const result = trix(candles)

    // Strong uptrend should give positive TRIX
    expect(result[result.length - 1]).toBeGreaterThan(0)
  })
})
