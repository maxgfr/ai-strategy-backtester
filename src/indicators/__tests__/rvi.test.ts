import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { rvi } from '../rvi'

describe('rvi', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: 105 + i,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = rvi(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(rvi([])).toEqual([])
  })

  it('outputs rvi and signal fields', () => {
    const result = rvi(candles)
    for (const r of result) {
      expect(r).toHaveProperty('rvi')
      expect(r).toHaveProperty('signal')
    }
  })

  it('produces non-zero values after warmup', () => {
    const result = rvi(candles)
    const nonZero = result.filter((r) => r.rvi !== 0)
    expect(nonZero.length).toBeGreaterThan(0)
  })
})
