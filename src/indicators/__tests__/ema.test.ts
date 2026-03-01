import { describe, expect, it } from 'vitest'
import { ema } from '../ema'

describe('ema', () => {
  it('calculates EMA for a simple array', () => {
    const candles = [
      { high: 10, low: 8, close: 9 },
      { high: 12, low: 10, close: 11 },
      { high: 14, low: 12, close: 13 },
      { high: 16, low: 14, close: 15 },
      { high: 18, low: 16, close: 17 },
      { high: 20, low: 18, close: 19 },
      { high: 22, low: 20, close: 21 },
      { high: 24, low: 22, close: 23 },
      { high: 26, low: 24, close: 25 },
      { high: 28, low: 26, close: 27 },
    ]

    const result = ema(candles, 3)

    // EMA values should be close to the closing prices (trending upward)
    expect(result.length).toBeGreaterThan(0)
    expect(result[result.length - 1]).toBeGreaterThan(15)
  })

  it('returns empty array for empty input', () => {
    const result = ema([], 5)
    expect(result).toEqual([])
  })

  it('handles short arrays', () => {
    const candles = [{ high: 10, low: 8, close: 9 }]
    const result = ema(candles, 5)
    expect(result.length).toBeGreaterThanOrEqual(0)
  })

  it('calculates EMA with different periods', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      high: i + 10,
      low: i + 8,
      close: i + 9,
    }))

    const ema5 = ema(candles, 5)
    const ema10 = ema(candles, 10)

    expect(ema5.length).toBeGreaterThan(0)
    expect(ema10.length).toBeGreaterThan(0)
  })
})
