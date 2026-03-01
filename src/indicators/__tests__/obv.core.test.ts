import { describe, expect, it } from 'vitest'
import { OBV } from '../obv'
import type { Candle } from '../primitives/types'

describe('OBV (core)', () => {
  const candles: Candle[] = Array.from({ length: 10 }, (_, i) => ({
    time: i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates OBV values', () => {
    const obvInst = OBV({ candles })
    const result = obvInst.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const obvInst = OBV({ candles: [] })
    const result = obvInst.result()
    expect(result).toEqual([])
  })

  it('positive OBV for uptrend', () => {
    const obvInst = OBV({ candles })
    const result = obvInst.result()
    expect(result[result.length - 1].value).toBeGreaterThan(0)
  })

  it('negative OBV for downtrend', () => {
    const downCandles: Candle[] = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      close: 100 - i,
      volume: 1000,
    }))
    const obvInst = OBV({ candles: downCandles })
    const result = obvInst.result()
    expect(result[result.length - 1].value).toBeLessThan(0)
  })

  it('update adds new candle', () => {
    const obvInst = OBV({ candles })
    const initialLength = obvInst.result().length
    const newCandle: Candle = { time: 10, close: 110, volume: 1000 }
    obvInst.update(newCandle)
    expect(obvInst.result().length).toBe(initialLength + 1)
  })
})
