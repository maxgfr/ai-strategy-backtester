import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { chaikinOscillator } from '../chaikinOscillator'

describe('chaikinOscillator', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: 105 + i,
    volume: 1000 + i * 10,
  }))

  it('returns array of same length as input', () => {
    const result = chaikinOscillator(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(chaikinOscillator([])).toEqual([])
  })

  it('produces non-zero values after warmup', () => {
    const result = chaikinOscillator(candles)
    const nonZero = result.filter((v) => v !== 0)
    expect(nonZero.length).toBeGreaterThan(0)
  })

  it('handles custom periods', () => {
    const result = chaikinOscillator(candles, 5, 15)
    expect(result.length).toBe(candles.length)
  })
})
