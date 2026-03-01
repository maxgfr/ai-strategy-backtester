import { describe, expect, it } from 'vitest'
import { lowest } from '../primitives/lowest'
import type { Candle } from '../primitives/types'

describe('lowest (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    close: 100 - i,
  }))

  it('calculates lowest values', () => {
    const l = lowest({ candles, period: 5 })
    const result = l.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const l = lowest({ candles: [], period: 5 })
    const result = l.result()
    expect(result).toEqual([])
  })

  it('returns the lowest value in the period', () => {
    const l = lowest({ candles, period: 5 })
    const result = l.result()
    expect(result[result.length - 1].value).toBeCloseTo(81, 0)
  })

  it('update adds new candle', () => {
    const l = lowest({ candles, period: 5 })
    const initialLength = l.result().length
    const newCandle: Candle = { time: 20, close: 80 }
    l.update(newCandle)
    expect(l.result().length).toBe(initialLength + 1)
  })
})
