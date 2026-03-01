import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { pmo } from '../pmo'

describe('pmo', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates PMO values', () => {
    const result = pmo(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('pmo')
    expect(result[0]).toHaveProperty('signal')
  })

  it('returns empty array for empty input', () => {
    const result = pmo([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = pmo(candles, 20, 10, 5)

    expect(result.length).toBeGreaterThan(0)
  })

  it('PMO is positive for uptrend', () => {
    const result = pmo(candles)

    expect(result[result.length - 1].pmo).toBeGreaterThan(0)
  })
})
