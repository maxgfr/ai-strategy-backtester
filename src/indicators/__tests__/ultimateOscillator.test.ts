import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { ultimateOscillator } from '../ultimateOscillator'

describe('ultimateOscillator', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = ultimateOscillator(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(ultimateOscillator([])).toEqual([])
  })

  it('values are between 0 and 100', () => {
    const result = ultimateOscillator(candles)
    for (const v of result) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('handles custom periods', () => {
    const result = ultimateOscillator(candles, 5, 10, 20)
    expect(result.length).toBe(candles.length)
    // Should produce values after warmup
    expect(result[result.length - 1]).toBeGreaterThan(0)
  })
})
