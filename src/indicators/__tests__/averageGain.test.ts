import { describe, expect, it } from 'vitest'
import { averageGain } from '../primitives/averageGain'
import type { Candle } from '../primitives/types'

describe('averageGain (core)', () => {
  const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates average gain values', () => {
    const ag = averageGain({ candles, period: 14 })
    const result = ag.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const ag = averageGain({ candles: [], period: 14 })
    const result = ag.result()
    expect(result).toEqual([])
  })

  it('average gain is non-negative for uptrend', () => {
    const ag = averageGain({ candles, period: 14 })
    const result = ag.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('update adds new candle', () => {
    const ag = averageGain({ candles, period: 14 })
    const initialLength = ag.result().length
    const newCandle: Candle = { time: 30, close: 130 }
    ag.update(newCandle)
    expect(ag.result().length).toBe(initialLength + 1)
  })
})
