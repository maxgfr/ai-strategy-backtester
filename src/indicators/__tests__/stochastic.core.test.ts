import { describe, expect, it } from 'vitest'
import type { Candle } from '../primitives/types'
import { Stochastic } from '../stochastic'

describe('Stochastic (core)', () => {
  const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
  }))

  it('calculates Stochastic values', () => {
    const stoch = Stochastic({ candles, period: 14, signalPeriod: 3 })
    const result = stoch.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('k')
  })

  it('returns empty array for empty input', () => {
    const stoch = Stochastic({ candles: [], period: 14, signalPeriod: 3 })
    const result = stoch.result()
    expect(result).toEqual([])
  })

  it('%K values are bounded between 0 and 100', () => {
    const stoch = Stochastic({ candles, period: 14, signalPeriod: 3 })
    const result = stoch.result()
    for (const item of result) {
      expect(item.k).toBeGreaterThanOrEqual(0)
      expect(item.k).toBeLessThanOrEqual(100)
    }
  })

  it('has signal values after warmup', () => {
    const stoch = Stochastic({ candles, period: 14, signalPeriod: 3 })
    const result = stoch.result()
    const lastItem = result[result.length - 1]
    expect(lastItem).toHaveProperty('d')
  })

  it('update adds new candle', () => {
    const stoch = Stochastic({ candles, period: 14, signalPeriod: 3 })
    const initialLength = stoch.result().length
    const newCandle: Candle = { time: 30, high: 135, low: 125, close: 130 }
    stoch.update(newCandle)
    expect(stoch.result().length).toBe(initialLength + 1)
  })
})
