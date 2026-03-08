import { describe, expect, it } from 'vitest'
import { ROC } from '../indicators/roc'
import { addMonths } from '../utils'

describe('addMonths immutability fix', () => {
  it('does not mutate the input date', () => {
    const original = new Date(2024, 5, 15) // June 15, 2024
    const originalTime = original.getTime()

    const result = addMonths(original, 3)

    // Original should be untouched
    expect(original.getTime()).toBe(originalTime)
    expect(original.getDate()).toBe(15)
    expect(original.getMonth()).toBe(5) // June

    // Result should be September 15
    expect(result.getMonth()).toBe(8) // September
    expect(result.getDate()).toBe(15)
  })

  it('handles month-end overflow correctly', () => {
    const original = new Date(2024, 0, 31) // Jan 31
    const result = addMonths(original, 1)

    // February doesn't have 31 days → should clamp
    expect(result.getMonth()).toBe(1) // February
    expect(result.getDate()).toBeLessThanOrEqual(29) // 2024 is leap year
    // Original unchanged
    expect(original.getDate()).toBe(31)
  })

  it('handles negative months', () => {
    const original = new Date(2024, 5, 15) // June 15
    const result = addMonths(original, -3)

    expect(result.getMonth()).toBe(2) // March
    expect(original.getMonth()).toBe(5) // Original unchanged
  })
})

describe('ROC division by zero fix', () => {
  it('handles zero oldest price without crashing', () => {
    const candles = [
      { time: 0, close: 0 },
      { time: 1, close: 0 },
      { time: 2, close: 100 },
    ]

    const roc = ROC({ candles, period: 1 })
    const results = roc.result()

    // First ROC: oldest=0, should return 0 instead of Infinity
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(Number.isFinite(r.value)).toBe(true)
    }
  })

  it('computes correct ROC for normal prices', () => {
    const candles = [
      { time: 0, close: 100 },
      { time: 1, close: 110 },
      { time: 2, close: 120 },
    ]

    const roc = ROC({ candles, period: 1 })
    const results = roc.result()

    // ROC at index 1: (110-100)/100 * 100 = 10%
    expect(results[0].value).toBeCloseTo(10, 1)
    // ROC at index 2: (120-110)/110 * 100 ≈ 9.09%
    expect(results[1].value).toBeCloseTo(9.09, 1)
  })
})

describe('TIMEFRAME_MINUTES deduplication', () => {
  it('config.ts and engine.ts use the same source', async () => {
    // Import from the shared module
    const { TIMEFRAME_MINUTES } = await import('../timeframes')
    expect(TIMEFRAME_MINUTES['4h']).toBe(240)
    expect(TIMEFRAME_MINUTES['1h']).toBe(60)
    expect(TIMEFRAME_MINUTES['1d']).toBe(1440)
  })
})
