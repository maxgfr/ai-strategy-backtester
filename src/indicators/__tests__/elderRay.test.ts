import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { elderRay } from '../elderRay'

describe('elderRay', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Elder Ray values', () => {
    const result = elderRay(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('bullPower')
    expect(result[0]).toHaveProperty('bearPower')
  })

  it('returns empty array for empty input', () => {
    const result = elderRay([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = elderRay(candles, 20)

    expect(result.length).toBeGreaterThan(0)
  })

  it('bullPower is high - EMA, bearPower is low - EMA', () => {
    const result = elderRay(candles)

    for (const item of result) {
      expect(item.bullPower).toBeGreaterThanOrEqual(0)
      expect(item.bearPower).toBeLessThanOrEqual(0)
    }
  })
})
