import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { coppockCurve } from '../coppockCurve'

describe('coppockCurve', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i * 2,
    high: 105 + i * 2,
    low: 95 + i * 2,
    close: 100 + i * 2,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = coppockCurve(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(coppockCurve([])).toEqual([])
  })

  it('produces non-zero values after warmup', () => {
    const result = coppockCurve(candles)
    const nonZero = result.filter((v) => v !== 0)
    expect(nonZero.length).toBeGreaterThan(0)
  })

  it('positive in uptrend', () => {
    const result = coppockCurve(candles)
    const lastValue = result[result.length - 1]
    expect(lastValue).toBeGreaterThan(0)
  })
})
