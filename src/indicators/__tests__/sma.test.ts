import { describe, expect, it } from 'vitest'
import { SMA } from '../primitives/sma'
import type { Candle } from '../primitives/types'

describe('SMA (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates SMA values', () => {
    const sma = SMA({ candles, period: 5 })
    const result = sma.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
    expect(result[0]).toHaveProperty('candle')
  })

  it('returns empty array for empty input', () => {
    const sma = SMA({ candles: [], period: 5 })
    const result = sma.result()
    expect(result).toEqual([])
  })

  it('SMA equals average of closes', () => {
    const testCandles: Candle[] = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      close: 100,
    }))
    const sma = SMA({ candles: testCandles, period: 5 })
    const result = sma.result()
    expect(result[result.length - 1].value).toBe(100)
  })

  it('update adds new candle', () => {
    const sma = SMA({ candles, period: 5 })
    const initialLength = sma.result().length
    const newCandle: Candle = { time: 20, close: 120 }
    sma.update(newCandle)
    expect(sma.result().length).toBe(initialLength + 1)
  })

  it('update replaces existing candle with same time', () => {
    const initialCandles: Candle[] = [
      { time: 0, close: 100 },
      { time: 1, close: 105 },
    ]
    const sma = SMA({ candles: initialCandles, period: 2 })
    const replacementCandle: Candle = { time: 1, close: 110 }
    sma.update(replacementCandle)
    const result = sma.result()
    const lastItem = result[result.length - 1]
    expect(lastItem.time).toBe(1)
  })
})
