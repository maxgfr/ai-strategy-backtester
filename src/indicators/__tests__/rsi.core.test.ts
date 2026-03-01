import { describe, expect, it } from 'vitest'
import type { Candle } from '../primitives/types'
import { RSI } from '../rsi'

describe('RSI (core)', () => {
  const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates RSI values', () => {
    const rsi = RSI({ candles, period: 14 })
    const result = rsi.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
    expect(result[0]).toHaveProperty('candle')
  })

  it('returns empty array for empty input', () => {
    const rsi = RSI({ candles: [], period: 14 })
    const result = rsi.result()
    expect(result).toEqual([])
  })

  it('RSI values are bounded between 0 and 100', () => {
    const rsi = RSI({ candles, period: 14 })
    const result = rsi.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThanOrEqual(0)
      expect(item.value).toBeLessThanOrEqual(100)
    }
  })

  it('update adds new candle', () => {
    const rsi = RSI({ candles, period: 14 })
    const initialLength = rsi.result().length
    const newCandle: Candle = { time: 30, close: 130 }
    rsi.update(newCandle)
    expect(rsi.result().length).toBe(initialLength + 1)
  })

  it('high RSI for uptrend', () => {
    const uptrendCandles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      close: 100 + i * 2,
    }))
    const rsi = RSI({ candles: uptrendCandles, period: 14 })
    const result = rsi.result()
    expect(result[result.length - 1].value).toBeGreaterThan(50)
  })
})
