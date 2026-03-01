import type { CandleStick } from '../types'

export function bodyLen(candlestick: CandleStick): number {
  return Math.abs(candlestick.open - candlestick.close)
}

export function wickLen(candlestick: CandleStick): number {
  return candlestick.high - Math.max(candlestick.open, candlestick.close)
}

export function tailLen(candlestick: CandleStick): number {
  return Math.min(candlestick.open, candlestick.close) - candlestick.low
}

export function isBullish(candlestick: CandleStick): boolean {
  return candlestick.open < candlestick.close
}

export function isBearish(candlestick: CandleStick): boolean {
  return candlestick.open > candlestick.close
}

export function isHammerLike(candlestick: CandleStick): boolean {
  return (
    tailLen(candlestick) > bodyLen(candlestick) * 2 &&
    wickLen(candlestick) < bodyLen(candlestick)
  )
}

export function isInvertedHammerLike(candlestick: CandleStick): boolean {
  return (
    wickLen(candlestick) > bodyLen(candlestick) * 2 &&
    tailLen(candlestick) < bodyLen(candlestick)
  )
}

export function isEngulfed(shortest, longest): boolean {
  return bodyLen(shortest) < bodyLen(longest)
}

export function isGap(lowest, upmost): boolean {
  return (
    Math.max(lowest.open, lowest.close) < Math.min(upmost.open, upmost.close)
  )
}

export function isGapUp(previous, current) {
  return isGap(previous, current)
}

export function isGapDown(previous, current) {
  return isGap(current, previous)
}

// Dynamic array search for callback arguments.
export function findPattern(dataArray, callback) {
  const upperBound = dataArray.length - callback.length + 1
  const matches = []

  for (let i = 0; i < upperBound; i++) {
    const args = []

    // Read the leftmost j values at position i in array.
    // The j values are callback arguments.
    for (let j = 0; j < callback.length; j++) {
      args.push(dataArray[i + j])
    }

    // Destructure args and find matches.
    if (callback(...args)) {
      matches.push(args[1])
    }
  }

  return matches
}

export function isHammer(candlestick: CandleStick): boolean {
  return isBullish(candlestick) && isHammerLike(candlestick)
}

export function isInvertedHammer(candlestick: CandleStick): boolean {
  return isBearish(candlestick) && isInvertedHammerLike(candlestick)
}

export function isHangingMan(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return (
    isBullish(previous) &&
    isBearish(current) &&
    isGapUp(previous, current) &&
    isHammerLike(current)
  )
}

export function isShootingStar(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return (
    isBullish(previous) &&
    isBearish(current) &&
    isGapUp(previous, current) &&
    isInvertedHammerLike(current)
  )
}

export function isBullishEngulfing(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return (
    isBearish(previous) && isBullish(current) && isEngulfed(previous, current)
  )
}

export function isBearishEngulfing(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return (
    isBullish(previous) && isBearish(current) && isEngulfed(previous, current)
  )
}

export function isBullishHarami(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return (
    isBearish(previous) && isBullish(current) && isEngulfed(current, previous)
  )
}

export function isBearishHarami(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return (
    isBullish(previous) && isBearish(current) && isEngulfed(current, previous)
  )
}

export function isBullishKicker(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return isBearish(previous) && isBullish(current) && isGapUp(previous, current)
}

export function isBearishKicker(
  previous: CandleStick,
  current: CandleStick,
): boolean {
  return (
    isBullish(previous) && isBearish(current) && isGapDown(previous, current)
  )
}

export function hammer(dataArray) {
  return findPattern(dataArray, isHammer)
}

export function invertedHammer(dataArray) {
  return findPattern(dataArray, isInvertedHammer)
}

export function hangingMan(dataArray) {
  return findPattern(dataArray, isShootingStar)
}

export function shootingStar(dataArray) {
  return findPattern(dataArray, isShootingStar)
}

export function bullishEngulfing(dataArray) {
  return findPattern(dataArray, isBullishEngulfing)
}

export function bearishEngulfing(dataArray) {
  return findPattern(dataArray, isBearishEngulfing)
}

export function bullishHarami(dataArray) {
  return findPattern(dataArray, isBullishHarami)
}

export function bearishHarami(dataArray) {
  return findPattern(dataArray, isBearishHarami)
}

export function bullishKicker(dataArray) {
  return findPattern(dataArray, isBullishKicker)
}

export function bearishKicker(dataArray) {
  return findPattern(dataArray, isBearishKicker)
}
