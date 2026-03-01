import { describe, expect, it } from 'vitest'
import { MACD } from '../macd'
import type { Candle } from '../primitives/types'

describe('MACD (core)', () => {
  const candles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates MACD values', () => {
    const macd = MACD({
      candles,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    })
    const result = macd.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('macd')
  })

  it('returns empty array for empty input', () => {
    const macd = MACD({
      candles: [],
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    })
    const result = macd.result()
    expect(result).toEqual([])
  })

  it('has signal and histogram values after warmup', () => {
    const macd = MACD({
      candles,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    })
    const result = macd.result()
    const lastItem = result[result.length - 1]
    expect(lastItem).toHaveProperty('signal')
    expect(lastItem).toHaveProperty('histogram')
  })

  it('update adds new candle', () => {
    const macd = MACD({
      candles,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    })
    const initialLength = macd.result().length
    const newCandle: Candle = { time: 50, close: 150 }
    macd.update(newCandle)
    expect(macd.result().length).toBe(initialLength + 1)
  })
})
