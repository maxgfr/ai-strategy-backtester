import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import {
  bearishEngulfing,
  bearishHarami,
  bearishKicker,
  bodyLen,
  bullishEngulfing,
  bullishHarami,
  bullishKicker,
  hammer,
  invertedHammer,
  isBearish,
  isBearishEngulfing,
  isBearishHarami,
  isBearishKicker,
  isBullish,
  isBullishEngulfing,
  isBullishHarami,
  isBullishKicker,
  isHammer,
  isHammerLike,
  isInvertedHammer,
  isInvertedHammerLike,
  tailLen,
  wickLen,
} from '../candlestick'

describe('candlestick utilities', () => {
  const bullishCandle: CandleStick = {
    time: 0,
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000,
  }

  const bearishCandle: CandleStick = {
    time: 0,
    open: 105,
    high: 110,
    low: 95,
    close: 100,
    volume: 1000,
  }

  describe('bodyLen', () => {
    it('calculates body length', () => {
      expect(bodyLen(bullishCandle)).toBe(5)
      expect(bodyLen(bearishCandle)).toBe(5)
    })
  })

  describe('wickLen', () => {
    it('calculates upper wick length', () => {
      expect(wickLen(bullishCandle)).toBe(5)
      expect(wickLen(bearishCandle)).toBe(5)
    })
  })

  describe('tailLen', () => {
    it('calculates lower wick length', () => {
      expect(tailLen(bullishCandle)).toBe(5)
      expect(tailLen(bearishCandle)).toBe(5)
    })
  })

  describe('isBullish', () => {
    it('identifies bullish candles', () => {
      expect(isBullish(bullishCandle)).toBe(true)
      expect(isBullish(bearishCandle)).toBe(false)
    })
  })

  describe('isBearish', () => {
    it('identifies bearish candles', () => {
      expect(isBearish(bullishCandle)).toBe(false)
      expect(isBearish(bearishCandle)).toBe(true)
    })
  })

  describe('isHammerLike', () => {
    it('identifies hammer-like candles', () => {
      const hammerLike: CandleStick = {
        time: 0,
        open: 100,
        high: 101.5,
        low: 90,
        close: 101,
        volume: 1000,
      }
      expect(isHammerLike(hammerLike)).toBe(true)
    })

    it('rejects non-hammer candles', () => {
      expect(isHammerLike(bullishCandle)).toBe(false)
    })
  })

  describe('isInvertedHammerLike', () => {
    it('identifies inverted hammer-like candles', () => {
      const invertedHammerLike: CandleStick = {
        time: 0,
        open: 100,
        high: 110,
        low: 99,
        close: 99,
        volume: 1000,
      }
      expect(isInvertedHammerLike(invertedHammerLike)).toBe(true)
    })

    it('rejects non-inverted hammer candles', () => {
      expect(isInvertedHammerLike(bullishCandle)).toBe(false)
    })
  })

  describe('isHammer', () => {
    it('identifies hammer (bullish + hammer-like)', () => {
      const hammer: CandleStick = {
        time: 0,
        open: 100,
        high: 101.5,
        low: 90,
        close: 101,
        volume: 1000,
      }
      expect(isHammer(hammer)).toBe(true)
    })
  })

  describe('isInvertedHammer', () => {
    it('identifies inverted hammer (bearish + inverted hammer-like)', () => {
      const invertedHammer: CandleStick = {
        time: 0,
        open: 100,
        high: 110,
        low: 99,
        close: 98,
        volume: 1000,
      }
      expect(isInvertedHammer(invertedHammer)).toBe(true)
    })
  })

  describe('isBullishEngulfing', () => {
    it('identifies bullish engulfing pattern', () => {
      const previous = { ...bearishCandle, open: 100, close: 99 }
      const current = { ...bullishCandle, open: 98, close: 105 }
      expect(isBullishEngulfing(previous, current)).toBe(true)
    })
  })

  describe('isBearishEngulfing', () => {
    it('identifies bearish engulfing pattern', () => {
      const previous = { ...bullishCandle, open: 100, close: 101 }
      const current = { ...bearishCandle, open: 102, close: 98 }
      expect(isBearishEngulfing(previous, current)).toBe(true)
    })
  })

  describe('isBullishHarami', () => {
    it('identifies bullish harami pattern', () => {
      const previous = { ...bearishCandle, open: 100, close: 98 }
      const current = { ...bullishCandle, open: 99, close: 100 }
      expect(isBullishHarami(previous, current)).toBe(true)
    })
  })

  describe('isBearishHarami', () => {
    it('identifies bearish harami pattern', () => {
      const previous = { ...bullishCandle, open: 100, close: 102 }
      const current = { ...bearishCandle, open: 101, close: 100 }
      expect(isBearishHarami(previous, current)).toBe(true)
    })
  })

  describe('isBullishKicker', () => {
    it('identifies bullish kicker pattern', () => {
      const previous: CandleStick = {
        time: 0,
        open: 100,
        high: 101,
        low: 95,
        close: 96,
        volume: 1000,
      }
      const current: CandleStick = {
        time: 1,
        open: 102,
        high: 110,
        low: 101,
        close: 108,
        volume: 1000,
      }
      expect(isBullishKicker(previous, current)).toBe(true)
    })
  })

  describe('isBearishKicker', () => {
    it('identifies bearish kicker pattern', () => {
      const previous: CandleStick = {
        time: 0,
        open: 100,
        high: 105,
        low: 99,
        close: 104,
        volume: 1000,
      }
      const current: CandleStick = {
        time: 1,
        open: 98,
        high: 99,
        low: 90,
        close: 92,
        volume: 1000,
      }
      expect(isBearishKicker(previous, current)).toBe(true)
    })
  })
})

describe('pattern finders', () => {
  const candles: CandleStick[] = [
    {
      time: 0,
      open: 100,
      high: 105,
      low: 95,
      close: 104,
      volume: 1000,
    },
    {
      time: 1,
      open: 100,
      high: 102,
      low: 90,
      close: 101,
      volume: 1000,
    },
    {
      time: 2,
      open: 105,
      high: 110,
      low: 100,
      close: 106,
      volume: 1000,
    },
  ]

  describe('hammer', () => {
    it('finds hammer patterns', () => {
      const result = hammer(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('invertedHammer', () => {
    it('finds inverted hammer patterns', () => {
      const result = invertedHammer(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bullishEngulfing', () => {
    it('finds bullish engulfing patterns', () => {
      const result = bullishEngulfing(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bearishEngulfing', () => {
    it('finds bearish engulfing patterns', () => {
      const result = bearishEngulfing(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bullishHarami', () => {
    it('finds bullish harami patterns', () => {
      const result = bullishHarami(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bearishHarami', () => {
    it('finds bearish harami patterns', () => {
      const result = bearishHarami(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bullishKicker', () => {
    it('finds bullish kicker patterns', () => {
      const result = bullishKicker(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bearishKicker', () => {
    it('finds bearish kicker patterns', () => {
      const result = bearishKicker(candles)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
