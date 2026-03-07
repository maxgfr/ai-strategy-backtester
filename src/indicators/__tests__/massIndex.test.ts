import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { massIndex } from '../massIndex'

describe('massIndex', () => {
  const candles: CandleStick[] = Array.from({ length: 60 }, (_, i) => ({
    time: i,
    open: 100 + Math.sin(i * 0.2) * 5,
    high: 105 + Math.sin(i * 0.2) * 5,
    low: 95 + Math.sin(i * 0.2) * 5,
    close: 100 + Math.sin(i * 0.2) * 5,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = massIndex(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(massIndex([])).toEqual([])
  })

  it('produces non-zero values after warmup', () => {
    const result = massIndex(candles)
    const nonZero = result.filter((v) => v !== 0)
    expect(nonZero.length).toBeGreaterThan(0)
  })

  it('values tend toward sumPeriod for stable ranges', () => {
    // With constant range, each EMA ratio ≈ 1, so sum ≈ sumPeriod
    const stable: CandleStick[] = Array.from({ length: 60 }, (_, i) => ({
      time: i,
      open: 100,
      high: 110,
      low: 90,
      close: 100,
      volume: 1000,
    }))
    const result = massIndex(stable)
    const lastValue = result[result.length - 1]
    expect(lastValue).toBeGreaterThan(20)
    expect(lastValue).toBeLessThan(30)
  })
})
