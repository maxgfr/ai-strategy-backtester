import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { pringSpecialK } from '../pringSpecialK'

describe('pringSpecialK', () => {
  const candles: CandleStick[] = Array.from({ length: 150 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Pring Special K values', () => {
    const result = pringSpecialK(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('sk')
    expect(result[0]).toHaveProperty('signal')
  })

  it('returns empty array for empty input', () => {
    const result = pringSpecialK([])
    expect(result).toEqual([])
  })

  it('handles custom signal period', () => {
    const result = pringSpecialK(candles, 5)

    expect(result.length).toBeGreaterThan(0)
  })

  it('signal is undefined for early values', () => {
    const result = pringSpecialK(candles)

    // Early values may not have signal yet
    if (result.length > 0) {
      expect(result[0].signal).toBeUndefined()
    }
  })
})
