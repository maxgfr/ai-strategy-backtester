import { describe, expect, it } from 'vitest'
import { averageLoss } from '../primitives/averageLoss'
import type { Candle } from '../primitives/types'

describe('averageLoss (core)', () => {
  const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    close: 100 - i,
  }))

  it('calculates average loss values', () => {
    const al = averageLoss({ candles, period: 14 })
    const result = al.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const al = averageLoss({ candles: [], period: 14 })
    const result = al.result()
    expect(result).toEqual([])
  })

  it('average loss is non-negative', () => {
    const al = averageLoss({ candles, period: 14 })
    const result = al.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('update adds new candle', () => {
    const al = averageLoss({ candles, period: 14 })
    const initialLength = al.result().length
    const newCandle: Candle = { time: 30, close: 70 }
    al.update(newCandle)
    expect(al.result().length).toBe(initialLength + 1)
  })
})
