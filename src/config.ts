import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ZodError } from 'zod'
import { RawConfigSchema } from './schemas/config'
import { TIMEFRAME_MINUTES } from './timeframes'
import type { BinanceInterval, DbSchema } from './types'

export type DateRange = {
  readonly start: Date
  readonly end: Date
}

export type StrategyConfig = {
  readonly timeframes: BinanceInterval[]
  readonly stop_loss_pct?: number
  readonly trailing_stop_pct?: number
  readonly max_drawdown_pct?: number
  readonly risk_per_trade?: number
}

export type GenerationConfig = {
  readonly enabled: boolean
  readonly apiKey: string
  readonly model: string
  readonly baseUrl: string
  readonly maxTokens: number
  readonly temperature: number
}

export type WalkForwardConfig = {
  readonly enabled: boolean
  readonly trainRatio: number
}

export type AppConfig = {
  readonly fees: number
  readonly makerFee: number
  readonly takerFee: number
  readonly fundingRate: number
  readonly slippage: number
  readonly initialCapital: number
  readonly symbols: string[]
  readonly dates: DateRange[]
  readonly strategies: Record<string, StrategyConfig>
  readonly generation: GenerationConfig
  readonly walkForward?: WalkForwardConfig
  readonly paths: {
    readonly dbFolder: string
    readonly dbFile: string
    readonly logFile: string
  }
}

export function maxArraySizeForInterval(interval: BinanceInterval): number {
  const minutes = TIMEFRAME_MINUTES[interval] ?? 240
  // 1000 candles for 4h+ (covers 5x EMA(200)), scale up for shorter timeframes
  return Math.max(1000, Math.round((1000 * 240) / minutes))
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `  - ${path}${issue.message}`
    })
    .join('\n')
}

function resolveDate(value: string): Date {
  return value === 'now' ? new Date() : new Date(value)
}

export function loadConfig(path?: string): AppConfig {
  const configPath = path ?? resolve(process.cwd(), 'config.json')
  const json = JSON.parse(readFileSync(configPath, 'utf-8'))

  const result = RawConfigSchema.safeParse(json)
  if (!result.success) {
    throw new Error(
      `Invalid config (${configPath}):\n${formatZodError(result.error)}`,
    )
  }

  const raw = result.data

  const defaultGeneration = {
    enabled: false,
    model: 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    maxTokens: 4096,
    temperature: 0.7,
  }

  const dates = raw.dates.map((d) => ({
    start: resolveDate(d.start),
    end: resolveDate(d.end),
  }))

  const strategies: Record<string, StrategyConfig> = {}
  for (const [name, cfg] of Object.entries(raw.strategies)) {
    strategies[name] = {
      timeframes: cfg.timeframes as BinanceInterval[],
      stop_loss_pct: cfg.stop_loss_pct,
      trailing_stop_pct: cfg.trailing_stop_pct,
      max_drawdown_pct: cfg.max_drawdown_pct,
      risk_per_trade: cfg.risk_per_trade,
    }
  }

  return {
    fees: raw.fees,
    makerFee: raw.makerFee ?? raw.fees,
    takerFee: raw.takerFee ?? raw.fees,
    fundingRate: raw.fundingRate ?? 0,
    slippage: raw.slippage ?? 0,
    initialCapital: raw.initialCapital,
    symbols: raw.symbols,
    dates,
    strategies,
    generation: {
      ...(raw.generation ?? defaultGeneration),
      apiKey: process.env.GENERATION_API_KEY ?? '',
    },
    walkForward: raw.walkForward,
    paths: raw.paths,
  }
}

export function buildDbModel(
  pair: string,
  interval: BinanceInterval,
): DbSchema {
  return {
    version: 1,
    initialParameters: {
      period: interval,
      pair,
    },
    historicPosition: [],
    position: { date: '', type: 'sell', price: 0, capital: 0, assets: 0 },
  }
}
