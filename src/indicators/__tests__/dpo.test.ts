import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { dpo } from '../dpo'

describe('dpo', () => {
  it('returns array of same length as input', () => {
    const candles: CandleStick[] = Array.from({ length: 40 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }))
    const result = dpo(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(dpo([])).toEqual([])
  })

  it('oscillates around zero for flat market', () => {
    const candles: CandleStick[] = Array.from({ length: 40 }, (_, i) => ({
      time: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }))
    const result = dpo(candles)
    // For a perfectly flat market, DPO should be near zero
    const last = result[result.length - 1]
    expect(Math.abs(last)).toBeLessThan(1)
  })

  it('handles custom period', () => {
    const candles: CandleStick[] = Array.from({ length: 40 }, (_, i) => ({
      time: i,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
      volume: 1000,
    }))
    const result = dpo(candles, 10)
    expect(result.length).toBe(candles.length)
  })
})
