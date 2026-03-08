import { describe, expect, it } from 'vitest'
import { getTimeframeMinutes, TIMEFRAME_MINUTES } from '../timeframes'

describe('TIMEFRAME_MINUTES', () => {
  it('contains all standard Binance intervals', () => {
    expect(TIMEFRAME_MINUTES['1m']).toBe(1)
    expect(TIMEFRAME_MINUTES['5m']).toBe(5)
    expect(TIMEFRAME_MINUTES['15m']).toBe(15)
    expect(TIMEFRAME_MINUTES['1h']).toBe(60)
    expect(TIMEFRAME_MINUTES['4h']).toBe(240)
    expect(TIMEFRAME_MINUTES['6h']).toBe(360)
    expect(TIMEFRAME_MINUTES['12h']).toBe(720)
    expect(TIMEFRAME_MINUTES['1d']).toBe(1440)
    expect(TIMEFRAME_MINUTES['1w']).toBe(10080)
  })
})

describe('getTimeframeMinutes', () => {
  it('returns correct minutes for known intervals', () => {
    expect(getTimeframeMinutes('4h')).toBe(240)
    expect(getTimeframeMinutes('1h')).toBe(60)
    expect(getTimeframeMinutes('1d')).toBe(1440)
  })

  it('returns 240 as default for unknown intervals', () => {
    expect(getTimeframeMinutes('unknown' as never)).toBe(240)
  })
})
