import { describe, expect, it } from 'vitest'
import { BollingerBands } from '../bollingerBands'
import type { Candle } from '../primitives/types'

describe('BollingerBands (core)', () => {
  const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    close: 100 + Math.random() * 10,
  }))

  it('calculates Bollinger Bands values', () => {
    const bb = BollingerBands({ candles, period: 20, stdDev: 2 })
    const result = bb.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const bb = BollingerBands({ candles: [], period: 20, stdDev: 2 })
    const result = bb.result()
    expect(result).toEqual([])
  })

  it('update adds new candle', () => {
    const bb = BollingerBands({ candles, period: 20, stdDev: 2 })
    const initialLength = bb.result().length
    const newCandle: Candle = { time: 30, close: 110 }
    bb.update(newCandle)
    expect(bb.result().length).toBe(initialLength + 1)
  })
})
