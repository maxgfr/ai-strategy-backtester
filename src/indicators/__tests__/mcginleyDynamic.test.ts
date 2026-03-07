import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { mcginleyDynamic } from '../mcginleyDynamic'

describe('mcginleyDynamic', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = mcginleyDynamic(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(mcginleyDynamic([])).toEqual([])
  })

  it('tracks price in uptrend', () => {
    const result = mcginleyDynamic(candles)
    const last = result[result.length - 1]
    const lastClose = candles[candles.length - 1].close
    // Should be within reasonable distance of price
    expect(last).toBeGreaterThan(0)
    expect(Math.abs(lastClose - last)).toBeLessThan(30)
  })

  it('first value equals first close', () => {
    const result = mcginleyDynamic(candles)
    expect(result[0]).toBe(candles[0].close)
  })

  it('handles custom period', () => {
    const result = mcginleyDynamic(candles, 20)
    expect(result.length).toBe(candles.length)
  })
})
