import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { emv } from '../emv'

describe('emv', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 10000 + i * 100,
  }))

  it('returns array of same length as input', () => {
    const result = emv(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(emv([])).toEqual([])
  })

  it('produces non-zero values after warmup', () => {
    const result = emv(candles)
    const nonZero = result.filter((v) => v !== 0)
    expect(nonZero.length).toBeGreaterThan(0)
  })

  it('handles custom period', () => {
    const result = emv(candles, 5)
    expect(result.length).toBe(candles.length)
  })
})
