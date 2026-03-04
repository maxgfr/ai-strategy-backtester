import { ATR } from './atr'

export function supertrend(
  initialArray: Array<{
    high: number
    low: number
    close: number
  }>,
  atrPeriod: number,
  multiplier: number,
): Array<number> {
  const candles = initialArray.map((c, i) => ({
    time: i,
    high: c.high,
    low: c.low,
    close: c.close,
  }))

  // Local ATR outputs N - period + 1 values (starts at period-1 index)
  const atr = ATR({ candles, period: atrPeriod })
    .result()
    .map((x) => x.value)

  // Align r with atr: slice period-1 items instead of period
  const r = initialArray.slice(atrPeriod - 1)

  const basicUpperBand = []
  const basicLowerBand = []
  for (let i = 0; i < r.length; i++) {
    basicUpperBand.push((r[i].high + r[i].low) / 2 + multiplier * atr[i])
    basicLowerBand.push((r[i].high + r[i].low) / 2 - multiplier * atr[i])
  }

  const finalUpperBand = []
  const finalLowerBand = []
  for (let i = 0; i < r.length; i++) {
    if (i === 0) {
      finalUpperBand.push(basicUpperBand[i])
      finalLowerBand.push(basicLowerBand[i])
      continue
    }
    const prevFinalUpper = finalUpperBand[i - 1]
    const prevFinalLower = finalLowerBand[i - 1]
    if (basicUpperBand[i] < prevFinalUpper || r[i - 1].close > prevFinalUpper) {
      finalUpperBand.push(basicUpperBand[i])
    } else {
      finalUpperBand.push(prevFinalUpper)
    }
    if (basicLowerBand[i] > prevFinalLower || r[i - 1].close < prevFinalLower) {
      finalLowerBand.push(basicLowerBand[i])
    } else {
      finalLowerBand.push(prevFinalLower)
    }
  }

  const result: number[] = []
  for (let i = 0; i < r.length; i++) {
    if (i === 0) {
      // Default to lower band (bullish) for the first bar
      result.push(finalLowerBand[i])
      continue
    }
    const previousSuperTrend = result[i - 1]
    let nowSuperTrend: number
    if (
      previousSuperTrend === finalUpperBand[i - 1] &&
      r[i].close <= finalUpperBand[i]
    ) {
      nowSuperTrend = finalUpperBand[i]
    } else if (
      previousSuperTrend === finalUpperBand[i - 1] &&
      r[i].close > finalUpperBand[i]
    ) {
      nowSuperTrend = finalLowerBand[i]
    } else if (
      previousSuperTrend === finalLowerBand[i - 1] &&
      r[i].close >= finalLowerBand[i]
    ) {
      nowSuperTrend = finalLowerBand[i]
    } else if (
      previousSuperTrend === finalLowerBand[i - 1] &&
      r[i].close < finalLowerBand[i]
    ) {
      nowSuperTrend = finalUpperBand[i]
    } else {
      nowSuperTrend = finalLowerBand[i]
    }
    result.push(nowSuperTrend)
  }

  return result
}
