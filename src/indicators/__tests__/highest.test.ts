import { describe, expect, it } from 'vitest'
import { highest } from '../primitives/highest'
import type { Candle } from '../primitives/types'

describe('highest (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates highest values', () => {
    const h = highest({ candles, period: 5 })
    const result = h.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const h = highest({ candles: [], period: 5 })
    const result = h.result()
    expect(result).toEqual([])
  })

  it('returns the highest value in the period', () => {
    const h = highest({ candles, period: 5 })
    const result = h.result()
    expect(result[result.length - 1].value).toBeCloseTo(119, 0)
  })

  it('update adds new candle', () => {
    const h = highest({ candles, period: 5 })
    const initialLength = h.result().length
    const newCandle: Candle = { time: 20, close: 120 }
    h.update(newCandle)
    expect(h.result().length).toBe(initialLength + 1)
  })
})
