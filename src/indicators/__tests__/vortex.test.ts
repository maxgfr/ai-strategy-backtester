import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { vortex } from '../vortex'

describe('vortex', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Vortex Indicator', () => {
    const result = vortex(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('plusVI')
    expect(result[0]).toHaveProperty('minusVI')
  })

  it('returns empty array for empty input', () => {
    const result = vortex([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = vortex(candles, 20)

    expect(result.length).toBeGreaterThan(0)
  })

  it('Vortex values are non-negative', () => {
    const result = vortex(candles)

    for (const item of result) {
      expect(item.plusVI).toBeGreaterThanOrEqual(0)
      expect(item.minusVI).toBeGreaterThanOrEqual(0)
    }
  })
})
