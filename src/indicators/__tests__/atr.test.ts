import { describe, expect, it } from 'vitest'
import { ATR } from '../atr'
import type { Candle } from '../primitives/types'

describe('ATR (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
  }))

  it('calculates ATR values', () => {
    const atr = ATR({ candles, period: 14 })
    const result = atr.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const atr = ATR({ candles: [], period: 14 })
    const result = atr.result()
    expect(result).toEqual([])
  })

  it('ATR values are non-negative', () => {
    const atr = ATR({ candles, period: 14 })
    const result = atr.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('update adds new candle', () => {
    const atr = ATR({ candles, period: 14 })
    const initialLength = atr.result().length
    const newCandle: Candle = { time: 20, high: 125, low: 115, close: 120 }
    atr.update(newCandle)
    expect(atr.result().length).toBe(initialLength + 1)
  })
})
