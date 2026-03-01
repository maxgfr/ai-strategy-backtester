import type { CandleStick } from '../types'

type ComponentConfig = { rocPeriod: number; smaPeriod: number; weight: number }

const COMPONENTS: ComponentConfig[] = [
  { rocPeriod: 10, smaPeriod: 10, weight: 1 },
  { rocPeriod: 13, smaPeriod: 13, weight: 2 },
  { rocPeriod: 14, smaPeriod: 14, weight: 3 },
  { rocPeriod: 20, smaPeriod: 20, weight: 4 },
  { rocPeriod: 35, smaPeriod: 35, weight: 1 },
  { rocPeriod: 40, smaPeriod: 40, weight: 2 },
  { rocPeriod: 50, smaPeriod: 50, weight: 3 },
  { rocPeriod: 65, smaPeriod: 65, weight: 4 },
]

function rocArray(closes: number[], period: number): number[] {
  return closes.reduce<number[]>((acc, c, i) => {
    if (i < period) return acc
    const prev = closes[i - period]
    return prev === 0 ? acc : [...acc, ((c - prev) / prev) * 100]
  }, [])
}

function smaArray(values: number[], period: number): number[] {
  return values.reduce<number[]>((acc, _, i) => {
    if (i < period - 1) return acc
    const slice = values.slice(i + 1 - period, i + 1)
    return [...acc, slice.reduce((a, b) => a + b, 0) / period]
  }, [])
}

// Pring Special K — weighted sum of multiple SMA-smoothed ROC components.
// Requires ~130+ candles for meaningful output (longest component: ROC(65) SMA(65)).
export function pringSpecialK(
  candles: CandleStick[],
  signalPeriod = 10,
): Array<{ sk: number; signal: number | undefined }> {
  const closes = candles.map((c) => c.close)

  const componentArrays = COMPONENTS.map(
    ({ rocPeriod, smaPeriod, weight }) => ({
      values: smaArray(rocArray(closes, rocPeriod), smaPeriod),
      weight,
    }),
  )

  const minLen = Math.min(...componentArrays.map((c) => c.values.length))
  if (minLen === 0) return []

  const skValues = Array.from({ length: minLen }, (_, i) =>
    componentArrays.reduce(
      (acc, { values, weight }) =>
        acc + weight * values[values.length - minLen + i],
      0,
    ),
  )

  const signalValues = smaArray(skValues, signalPeriod)
  const signalOffset = skValues.length - signalValues.length

  return skValues.map((sk, i) => ({
    sk,
    signal: i >= signalOffset ? signalValues[i - signalOffset] : undefined,
  }))
}
