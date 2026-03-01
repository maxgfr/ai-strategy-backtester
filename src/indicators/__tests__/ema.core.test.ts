import { describe, expect, it } from 'vitest'
import { EMA } from '../ema'
import type { Candle } from '../primitives/types'

describe('EMA (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates EMA values', () => {
    const ema = EMA({ candles, period: 5 })
    const result = ema.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const ema = EMA({ candles: [], period: 5 })
    const result = ema.result()
    expect(result).toEqual([])
  })

  it('update adds new candle', () => {
    const ema = EMA({ candles, period: 5 })
    const initialLength = ema.result().length
    const newCandle: Candle = { time: 20, close: 120 }
    ema.update(newCandle)
    expect(ema.result().length).toBe(initialLength + 1)
  })

  it('update replaces existing candle with same time', () => {
    const initialCandles: Candle[] = [
      { time: 0, close: 100 },
      { time: 1, close: 105 },
    ]
    const ema = EMA({ candles: initialCandles, period: 2 })
    const replacementCandle: Candle = { time: 1, close: 110 }
    ema.update(replacementCandle)
    const result = ema.result()
    const lastItem = result[result.length - 1]
    expect(lastItem.time).toBe(1)
  })
})
