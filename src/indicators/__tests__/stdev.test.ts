import { describe, expect, it } from 'vitest'
import { STDEV } from '../primitives/stdev'
import type { Candle } from '../primitives/types'

describe('Stdev (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates standard deviation values', () => {
    const stdev = STDEV({ candles, period: 5 })
    const result = stdev.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const stdev = STDEV({ candles: [], period: 5 })
    const result = stdev.result()
    expect(result).toEqual([])
  })

  it('standard deviation is non-negative', () => {
    const stdev = STDEV({ candles, period: 5 })
    const result = stdev.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('zero standard deviation for constant values', () => {
    const constantCandles: Candle[] = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      close: 100,
    }))
    const stdev = STDEV({ candles: constantCandles, period: 5 })
    const result = stdev.result()
    expect(result[result.length - 1].value).toBeCloseTo(0, 5)
  })

  it('update adds new candle', () => {
    const stdev = STDEV({ candles, period: 5 })
    const initialLength = stdev.result().length
    const newCandle: Candle = { time: 20, close: 120 }
    stdev.update(newCandle)
    expect(stdev.result().length).toBe(initialLength + 1)
  })
})
