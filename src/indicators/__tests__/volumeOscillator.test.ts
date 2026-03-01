import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { rateOfChange, volumeOscillator } from '../volumeOscillator'

describe('volumeOscillator', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000 + i * 100,
  }))

  it('calculates Volume Oscillator', () => {
    const result = volumeOscillator(candles)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = volumeOscillator([])
    expect(result).toEqual([])
  })

  it('handles custom periods', () => {
    const result = volumeOscillator(candles, 5, 10)

    expect(result.length).toBeGreaterThan(0)
  })

  it('shows positive oscillator for increasing volume', () => {
    // Increasing volume should give positive oscillator
    const result = volumeOscillator(candles)

    expect(result[result.length - 1]).toBeGreaterThan(0)
  })
})

describe('rateOfChange', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Rate of Change', () => {
    const result = rateOfChange(candles)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = rateOfChange([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = rateOfChange(candles, 5)

    expect(result.length).toBeGreaterThan(0)
  })

  it('positive ROC for uptrend', () => {
    const result = rateOfChange(candles, 10)

    expect(result[result.length - 1]).toBeGreaterThan(0)
  })
})
