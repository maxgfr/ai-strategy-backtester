import type { CandleStick } from '../types'
import type { Candle } from './primitives/types'

interface IchimokuCoreResultItem {
  time: Candle['time']
  conversion: number
  base: number
  spanA: number
  spanB: number
}

function Ichimoku({
  candles,
  conversionPeriod = 9,
  basePeriod = 26,
  spanPeriod = 52,
}: {
  candles: Candle[]
  conversionPeriod?: number
  basePeriod?: number
  spanPeriod?: number
}) {
  const result: IchimokuCoreResultItem[] = []
  const maxPeriod = Math.max(conversionPeriod, basePeriod, spanPeriod)
  const convHighs: number[] = []
  const convLows: number[] = []
  const baseHighs: number[] = []
  const baseLows: number[] = []
  const spanHighs: number[] = []
  const spanLows: number[] = []
  let counter = 0

  function periodHighLow(highs: number[], lows: number[], period: number) {
    const h = highs.slice(-period)
    const l = lows.slice(-period)
    return { high: Math.max(...h), low: Math.min(...l) }
  }

  function calculate(candle: Candle): IchimokuCoreResultItem | undefined {
    counter++
    const high = candle.high ?? candle.close
    const low = candle.low ?? candle.close

    convHighs.push(high)
    convLows.push(low)
    baseHighs.push(high)
    baseLows.push(low)
    spanHighs.push(high)
    spanLows.push(low)

    if (convHighs.length > spanPeriod) convHighs.shift()
    if (convLows.length > spanPeriod) convLows.shift()
    if (baseHighs.length > spanPeriod) baseHighs.shift()
    if (baseLows.length > spanPeriod) baseLows.shift()
    if (spanHighs.length > spanPeriod) spanHighs.shift()
    if (spanLows.length > spanPeriod) spanLows.shift()

    if (counter < maxPeriod) return undefined

    const conv = periodHighLow(convHighs, convLows, conversionPeriod)
    const base = periodHighLow(baseHighs, baseLows, basePeriod)
    const span = periodHighLow(spanHighs, spanLows, spanPeriod)

    const conversion = (conv.high + conv.low) / 2
    const baseLine = (base.high + base.low) / 2
    const spanA = (conversion + baseLine) / 2
    const spanB = (span.high + span.low) / 2

    return { time: candle.time, conversion, base: baseLine, spanA, spanB }
  }

  for (const c of candles) {
    const res = calculate(c)
    if (res) result.push(res)
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result.pop()
        convHighs.pop()
        convLows.pop()
        baseHighs.pop()
        baseLows.pop()
        spanHighs.pop()
        spanLows.pop()
        counter--
      }
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export interface IchimokuResult {
  time: number
  /** Tenkan-sen : moyenne (9 periodes) — reactivite court terme */
  conversion: number
  /** Kijun-sen : moyenne (26 periodes) — tendance moyen terme */
  base: number
  /** Senkou Span A : (conversion + base) / 2 — bord superieur du nuage */
  spanA: number
  /** Senkou Span B : moyenne (52 periodes) — bord inferieur du nuage */
  spanB: number
  /** Chikou Span : close actuel projete 26 periodes en arriere */
  chikou: number
  /** Borne haute du nuage */
  cloudTop: number
  /** Borne basse du nuage */
  cloudBottom: number
}

export type IchimokuSignal = 'bullish' | 'bearish' | 'neutral'

/**
 * Ichimoku Kinko Hyo — lignes brutes.
 * Les resultats demarrent a partir de la periode max (52 bougies par defaut).
 */
export function ichimoku(
  candles: CandleStick[],
  conversionPeriod = 9,
  basePeriod = 26,
  spanPeriod = 52,
): IchimokuResult[] {
  const raw = Ichimoku({
    candles: candles as Candle[],
    conversionPeriod,
    basePeriod,
    spanPeriod,
  }).result()

  return raw.map((item, i) => {
    const candleIndex = candles.length - raw.length + i
    const chikou = candles[candleIndex]?.close ?? item.conversion

    const cloudTop = Math.max(item.spanA, item.spanB)
    const cloudBottom = Math.min(item.spanA, item.spanB)

    return {
      time: item.time,
      conversion: item.conversion,
      base: item.base,
      spanA: item.spanA,
      spanB: item.spanB,
      chikou,
      cloudTop,
      cloudBottom,
    }
  })
}

/**
 * Signal Ichimoku simplifie — logique classique a 3 conditions :
 *   1. Prix par rapport au nuage (au-dessus = haussier, en-dessous = baissier)
 *   2. Tenkan-sen vs Kijun-sen (conversion > base = haussier)
 *   3. Couleur du nuage (spanA > spanB = nuage vert = haussier)
 *
 * Retourne 'bullish' si les 3 conditions sont haussieres,
 *          'bearish' si les 3 conditions sont baissieres,
 *          'neutral' sinon.
 */
export function ichimokuSignal(
  line: IchimokuResult,
  close: number,
): IchimokuSignal {
  const aboveCloud = close > line.cloudTop
  const belowCloud = close < line.cloudBottom
  const crossBullish = line.conversion > line.base
  const crossBearish = line.conversion < line.base
  const greenCloud = line.spanA > line.spanB
  const redCloud = line.spanA < line.spanB

  if (aboveCloud && crossBullish && greenCloud) return 'bullish'
  if (belowCloud && crossBearish && redCloud) return 'bearish'
  return 'neutral'
}
