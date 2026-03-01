import { describe, expect, it } from 'vitest'
import { trueRange } from '../primitives/trueRange'
import type { Candle } from '../primitives/types'

describe('trueRange (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
  }))

  it('calculates true range values', () => {
    const tr = trueRange({ candles })
    const result = tr.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const tr = trueRange({ candles: [] })
    const result = tr.result()
    expect(result).toEqual([])
  })

  it('true range is non-negative', () => {
    const tr = trueRange({ candles })
    const result = tr.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('update adds new candle', () => {
    const tr = trueRange({ candles })
    const initialLength = tr.result().length
    const newCandle: Candle = { time: 20, high: 125, low: 115, close: 120 }
    tr.update(newCandle)
    expect(tr.result().length).toBe(initialLength + 1)
  })
})
