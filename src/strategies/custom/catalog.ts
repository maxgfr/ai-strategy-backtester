import {
  ad,
  adx,
  ao,
  aroon,
  atrTrailingStop,
  bollingerBands,
  cci,
  chandelier,
  cmf,
  donchian,
  ema,
  ichimoku,
  keltner,
  macd,
  mfi,
  movingAverage,
  movingAverageEnvelope,
  obv,
  pmax,
  pmo,
  psar,
  roc,
  rsi,
  starcBands,
  stochastic,
  supertrend,
  trix,
  volumeOscillator,
  vortex,
  vwap,
  williamsR,
} from '../../indicators'
import { ATR } from '../../indicators/atr'
import { KDJ } from '../../indicators/kdj'
import { SMA } from '../../indicators/primitives/sma'
import type { Candle } from '../../indicators/primitives/types'
import { StochRSI } from '../../indicators/stochRsi'
import type { CandleStick } from '../../types'

type ParamDef = { readonly name: string; readonly default: number }

export type CatalogEntry = {
  readonly compute: (
    candles: CandleStick[],
    params: Record<string, number>,
  ) => unknown[]
  readonly params: ParamDef[]
  readonly outputType: 'number' | 'object'
  readonly fields?: string[]
  readonly defaultField?: string
}

function kdjWrapper(
  candles: CandleStick[],
  params: Record<string, number>,
): Array<{ k: number; d: number; j: number }> {
  const factory = KDJ({
    candles: [],
    rsvPeriod: params.rsvPeriod ?? 9,
    kPeriod: params.kPeriod ?? 3,
    dPeriod: params.dPeriod ?? 3,
  })
  for (const c of candles) {
    factory.update(c)
  }
  return factory.result().map((r) => ({ k: r.k, d: r.d, j: r.j }))
}

function stochRsiWrapper(
  candles: CandleStick[],
  params: Record<string, number>,
): Array<{ k: number; d: number | undefined }> {
  const factory = StochRSI({
    candles: [],
    rsiPeriod: params.rsiPeriod ?? 14,
    stochasticPeriod: params.stochasticPeriod ?? 14,
    kPeriod: params.kPeriod ?? 3,
    dPeriod: params.dPeriod ?? 3,
  })
  for (const c of candles) {
    factory.update(c)
  }
  return factory.result().map((r) => ({ k: r.k, d: r.d }))
}

function atrTrailingStopAdapter(
  candles: CandleStick[],
  params: Record<string, number>,
): Array<{ stop: number; trend: number }> {
  const raw = atrTrailingStop(
    candles,
    params.period ?? 14,
    params.multiplier ?? 3,
  )
  return raw.map((r) => ({ stop: r.stop, trend: r.trend === 'bull' ? 1 : -1 }))
}

function volumeSmaWrapper(
  candles: CandleStick[],
  params: Record<string, number>,
): number[] {
  const period = params.period ?? 20
  const volumeCandles: Candle[] = candles.map((c, i) => ({
    time: i,
    close: c.volume,
  }))
  const sma = SMA({ candles: [], period })
  const results: number[] = []
  for (const vc of volumeCandles) {
    const r = sma.update(vc)
    results.push(r ? r.value : 0)
  }
  return results
}

function atrRatioWrapper(
  candles: CandleStick[],
  params: Record<string, number>,
): number[] {
  const atrPeriod = params.atrPeriod ?? 14
  const smaPeriod = params.smaPeriod ?? 50
  const atr = ATR({ candles: [], period: atrPeriod })
  const atrSma = SMA({ candles: [], period: smaPeriod })
  const results: number[] = []
  for (const c of candles) {
    const atrResult = atr.update(c)
    if (!atrResult) {
      results.push(0)
      continue
    }
    const smaResult = atrSma.update({
      time: atrResult.time,
      close: atrResult.value,
    })
    if (!smaResult || smaResult.value === 0) {
      results.push(0)
      continue
    }
    results.push(atrResult.value / smaResult.value)
  }
  return results
}

export const catalog: Record<string, CatalogEntry> = {
  rsi: {
    compute: (c, p) => rsi(c, p.period ?? 14),
    params: [{ name: 'period', default: 14 }],
    outputType: 'number',
  },
  ema: {
    compute: (c, p) => ema(c, p.period ?? 20),
    params: [{ name: 'period', default: 20 }],
    outputType: 'number',
  },
  supertrend: {
    compute: (c, p) => supertrend(c, p.atrPeriod ?? 10, p.multiplier ?? 3),
    params: [
      { name: 'atrPeriod', default: 10 },
      { name: 'multiplier', default: 3 },
    ],
    outputType: 'number',
  },
  bollingerBands: {
    compute: (c, p) => bollingerBands(c, p.period ?? 20, p.stdDev ?? 2),
    params: [
      { name: 'period', default: 20 },
      { name: 'stdDev', default: 2 },
    ],
    outputType: 'number',
  },
  obv: {
    compute: (c) => obv(c),
    params: [],
    outputType: 'number',
  },
  vwap: {
    compute: (c) => vwap(c),
    params: [],
    outputType: 'number',
  },
  cmf: {
    compute: (c, p) => cmf(c, p.period ?? 20),
    params: [{ name: 'period', default: 20 }],
    outputType: 'number',
  },
  williamsR: {
    compute: (c, p) => williamsR(c, p.period ?? 14),
    params: [{ name: 'period', default: 14 }],
    outputType: 'number',
  },
  cci: {
    compute: (c, p) => cci(c, p.period ?? 20),
    params: [{ name: 'period', default: 20 }],
    outputType: 'number',
  },
  roc: {
    compute: (c, p) => roc(c, p.period ?? 12),
    params: [{ name: 'period', default: 12 }],
    outputType: 'number',
  },
  ad: {
    compute: (c) => ad(c),
    params: [],
    outputType: 'number',
  },
  mfi: {
    compute: (c, p) => mfi(c, p.period ?? 14),
    params: [{ name: 'period', default: 14 }],
    outputType: 'number',
  },
  psar: {
    compute: (c, p) => psar(c, p.step ?? 0.02, p.max ?? 0.2),
    params: [
      { name: 'step', default: 0.02 },
      { name: 'max', default: 0.2 },
    ],
    outputType: 'number',
  },
  ao: {
    compute: (c, p) => ao(c, p.fastPeriod ?? 5, p.slowPeriod ?? 34),
    params: [
      { name: 'fastPeriod', default: 5 },
      { name: 'slowPeriod', default: 34 },
    ],
    outputType: 'number',
  },
  movingAverage: {
    compute: (c, p) => movingAverage(c, p.period ?? 20),
    params: [{ name: 'period', default: 20 }],
    outputType: 'number',
  },
  trix: {
    compute: (c, p) => trix(c, p.period ?? 14),
    params: [{ name: 'period', default: 14 }],
    outputType: 'number',
  },
  volumeOscillator: {
    compute: (c, p) =>
      volumeOscillator(c, p.fastPeriod ?? 14, p.slowPeriod ?? 28),
    params: [
      { name: 'fastPeriod', default: 14 },
      { name: 'slowPeriod', default: 28 },
    ],
    outputType: 'number',
  },
  macd: {
    compute: (c, p) => macd(c, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9),
    params: [
      { name: 'fast', default: 12 },
      { name: 'slow', default: 26 },
      { name: 'signal', default: 9 },
    ],
    outputType: 'object',
    fields: ['macd', 'signal', 'histogram'],
    defaultField: 'macd',
  },
  pmax: {
    compute: (c, p) =>
      pmax(c, p.emaPeriod ?? 10, p.atrPeriod ?? 10, p.multiplier ?? 3),
    params: [
      { name: 'emaPeriod', default: 10 },
      { name: 'atrPeriod', default: 10 },
      { name: 'multiplier', default: 3 },
    ],
    outputType: 'object',
    fields: ['pmax', 'pmaxLong', 'pmaxShort'],
    defaultField: 'pmax',
  },
  adx: {
    compute: (c, p) => adx(c, p.period ?? 14),
    params: [{ name: 'period', default: 14 }],
    outputType: 'object',
    fields: ['adx', 'pdi', 'mdi'],
    defaultField: 'adx',
  },
  donchian: {
    compute: (c, p) => donchian(c, p.period ?? 20),
    params: [{ name: 'period', default: 20 }],
    outputType: 'object',
    fields: ['upper', 'lower', 'middle'],
    defaultField: 'middle',
  },
  stochastic: {
    compute: (c, p) => stochastic(c, p.period ?? 14, p.signalPeriod ?? 3),
    params: [
      { name: 'period', default: 14 },
      { name: 'signalPeriod', default: 3 },
    ],
    outputType: 'object',
    fields: ['k', 'd'],
    defaultField: 'k',
  },
  aroon: {
    compute: (c, p) => aroon(c, p.period ?? 25),
    params: [{ name: 'period', default: 25 }],
    outputType: 'object',
    fields: ['up', 'down', 'oscillator'],
    defaultField: 'oscillator',
  },
  ichimoku: {
    compute: (c, p) =>
      ichimoku(
        c,
        p.conversionPeriod ?? 9,
        p.basePeriod ?? 26,
        p.spanPeriod ?? 52,
      ),
    params: [
      { name: 'conversionPeriod', default: 9 },
      { name: 'basePeriod', default: 26 },
      { name: 'spanPeriod', default: 52 },
    ],
    outputType: 'object',
    fields: [
      'conversion',
      'base',
      'spanA',
      'spanB',
      'chikou',
      'cloudTop',
      'cloudBottom',
    ],
    defaultField: 'conversion',
  },
  vortex: {
    compute: (c, p) => vortex(c, p.period ?? 14),
    params: [{ name: 'period', default: 14 }],
    outputType: 'object',
    fields: ['plusVI', 'minusVI'],
    defaultField: 'plusVI',
  },
  chandelier: {
    compute: (c, p) => chandelier(c, p.period ?? 22, p.multiplier ?? 3),
    params: [
      { name: 'period', default: 22 },
      { name: 'multiplier', default: 3 },
    ],
    outputType: 'object',
    fields: ['exitLong', 'exitShort'],
    defaultField: 'exitLong',
  },
  keltner: {
    compute: (c, p) =>
      keltner(c, p.maPeriod ?? 20, p.atrPeriod ?? 10, p.multiplier ?? 1.5),
    params: [
      { name: 'maPeriod', default: 20 },
      { name: 'atrPeriod', default: 10 },
      { name: 'multiplier', default: 1.5 },
    ],
    outputType: 'object',
    fields: ['upper', 'middle', 'lower'],
    defaultField: 'middle',
  },
  starcBands: {
    compute: (c, p) =>
      starcBands(c, p.smaPeriod ?? 6, p.atrPeriod ?? 15, p.multiplier ?? 1.33),
    params: [
      { name: 'smaPeriod', default: 6 },
      { name: 'atrPeriod', default: 15 },
      { name: 'multiplier', default: 1.33 },
    ],
    outputType: 'object',
    fields: ['upper', 'middle', 'lower'],
    defaultField: 'middle',
  },
  movingAverageEnvelope: {
    compute: (c, p) =>
      movingAverageEnvelope(c, p.period ?? 20, p.percentage ?? 2.5),
    params: [
      { name: 'period', default: 20 },
      { name: 'percentage', default: 2.5 },
    ],
    outputType: 'object',
    fields: ['upper', 'middle', 'lower'],
    defaultField: 'middle',
  },
  atrTrailingStop: {
    compute: atrTrailingStopAdapter,
    params: [
      { name: 'period', default: 14 },
      { name: 'multiplier', default: 3 },
    ],
    outputType: 'object',
    fields: ['stop', 'trend'],
    defaultField: 'stop',
  },
  pmo: {
    compute: (c, p) =>
      pmo(
        c,
        p.smooth1Period ?? 35,
        p.smooth2Period ?? 20,
        p.signalPeriod ?? 10,
      ),
    params: [
      { name: 'smooth1Period', default: 35 },
      { name: 'smooth2Period', default: 20 },
      { name: 'signalPeriod', default: 10 },
    ],
    outputType: 'object',
    fields: ['pmo', 'signal'],
    defaultField: 'pmo',
  },
  kdj: {
    compute: kdjWrapper,
    params: [
      { name: 'rsvPeriod', default: 9 },
      { name: 'kPeriod', default: 3 },
      { name: 'dPeriod', default: 3 },
    ],
    outputType: 'object',
    fields: ['k', 'd', 'j'],
    defaultField: 'k',
  },
  stochRsi: {
    compute: stochRsiWrapper,
    params: [
      { name: 'rsiPeriod', default: 14 },
      { name: 'stochasticPeriod', default: 14 },
      { name: 'kPeriod', default: 3 },
      { name: 'dPeriod', default: 3 },
    ],
    outputType: 'object',
    fields: ['k', 'd'],
    defaultField: 'k',
  },
  volumeSma: {
    compute: volumeSmaWrapper,
    params: [{ name: 'period', default: 20 }],
    outputType: 'number',
  },
  atrRatio: {
    compute: atrRatioWrapper,
    params: [
      { name: 'atrPeriod', default: 14 },
      { name: 'smaPeriod', default: 50 },
    ],
    outputType: 'number',
  },
}
