import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { stochastic } from '../stochastic'

describe('stochastic', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => {
    const low = 95 + Math.random() * 20
    const high = low + 5 + Math.random() * 15
    const open = low + Math.random() * (high - low)
    const close = low + Math.random() * (high - low)
    return { time: i, open, high, low, close, volume: 1000 }
  })

  it('calculates Stochastic values', () => {
    const result = stochastic(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('k')
    expect(result[0]).toHaveProperty('d')
  })

  it('returns empty array for empty input', () => {
    const result = stochastic([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = stochastic(candles, 10, 5)

    expect(result.length).toBeGreaterThan(0)
  })

  it('%K values are bounded between 0 and 100', () => {
    const result = stochastic(candles)

    for (const item of result) {
      expect(item.k).toBeGreaterThanOrEqual(0)
      expect(item.k).toBeLessThanOrEqual(100)
    }
  })
})
