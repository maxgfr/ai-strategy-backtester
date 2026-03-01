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
  let previousFinalUpperBand = 0
  let previousFinalLowerBand = 0
  for (let i = 0; i < r.length; i++) {
    if (
      basicUpperBand[i] < previousFinalUpperBand ||
      (r[i - 1] && r[i - 1].close > previousFinalUpperBand)
    ) {
      finalUpperBand.push(basicUpperBand[i])
    } else {
      finalUpperBand.push(previousFinalUpperBand)
    }
    if (
      basicLowerBand[i] > previousFinalLowerBand ||
      (r[i - 1] && r[i - 1].close < previousFinalLowerBand)
    ) {
      finalLowerBand.push(basicLowerBand[i])
    } else {
      finalLowerBand.push(previousFinalLowerBand)
    }
    previousFinalUpperBand = finalUpperBand[i]
    previousFinalLowerBand = finalLowerBand[i]
  }

  const result = []
  let previousSuperTrend = 0
  for (let i = 0; i < r.length; i++) {
    let nowSuperTrend = 0
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
    }
    result.push(nowSuperTrend)
    previousSuperTrend = result[i]
  }

  return result
}
