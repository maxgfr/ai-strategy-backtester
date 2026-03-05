import type { Candle } from './primitives/types'

interface ADResultItem {
  time: Candle['time']
  value: number
}

export function AD({ candles }: { candles: Candle[] }) {
  const result: ADResultItem[] = []

  function calculate(candle: Candle): ADResultItem {
    const high = candle.high ?? candle.close
    const low = candle.low ?? candle.close
    const volume = candle.volume ?? 0
    const diff = high - low
    const mfv =
      diff === 0
        ? 0
        : ((candle.close - low - (high - candle.close)) / diff) * volume
    const prevAd = result.length > 0 ? result[result.length - 1].value : 0
    return { time: candle.time, value: prevAd + mfv }
  }

  for (const c of candles) {
    result.push(calculate(c))
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
      }
      const item = calculate(candle)
      result.push(item)
      return item
    },
  }
}

export function ad(
  candles: Array<{
    high: number
    low: number
    close: number
    volume: number
  }>,
): number[] {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume,
  }))
  return AD({ candles: mapped })
    .result()
    .map((x) => x.value)
}
