import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { forceIndex } from '../forceIndex'

describe('forceIndex', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000 + i * 100,
  }))

  it('returns array of same length as input', () => {
    const result = forceIndex(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(forceIndex([])).toEqual([])
  })

  it('positive in uptrend with volume', () => {
    const result = forceIndex(candles)
    const lastValue = result[result.length - 1]
    expect(lastValue).toBeGreaterThan(0)
  })

  it('handles custom period', () => {
    const result = forceIndex(candles, 5)
    expect(result.length).toBe(candles.length)
  })
})
