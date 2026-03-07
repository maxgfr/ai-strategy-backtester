import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { fisherTransform } from '../fisherTransform'

describe('fisherTransform', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = fisherTransform(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(fisherTransform([])).toEqual([])
  })

  it('outputs fisher and signal fields', () => {
    const result = fisherTransform(candles)
    for (const r of result) {
      expect(r).toHaveProperty('fisher')
      expect(r).toHaveProperty('signal')
    }
  })

  it('produces non-zero values after warmup', () => {
    const result = fisherTransform(candles)
    const nonZero = result.filter((r) => r.fisher !== 0)
    expect(nonZero.length).toBeGreaterThan(0)
  })
})
