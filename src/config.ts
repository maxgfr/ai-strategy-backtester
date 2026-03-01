import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BinanceInterval, DbSchema } from './types'

export type DateRange = {
  readonly start: Date
  readonly end: Date
}

export type SimulationProfile = {
  readonly name: string
  readonly maxArraySize: number
  readonly periods: BinanceInterval[]
  readonly strategies: string[]
  readonly dates: DateRange[]
}

export type GenerationConfig = {
  readonly enabled: boolean
  readonly apiKey: string
  readonly model: string
  readonly baseUrl: string
  readonly maxTokens: number
  readonly temperature: number
}

export type AppConfig = {
  readonly trading: {
    readonly from: string
    readonly to: string
    readonly pair: string
    readonly period: BinanceInterval
    readonly fees: number
    readonly initialCapital: number
  }
  readonly simulation: {
    readonly profiles: SimulationProfile[]
  }
  readonly generation: GenerationConfig
  readonly paths: {
    readonly dbFolder: string
    readonly dbFile: string
    readonly logFile: string
  }
}

type RawDateRange = { start: string; end: string }

type RawGenerationConfig = {
  enabled: boolean
  model: string
  baseUrl: string
  maxTokens: number
  temperature: number
}

type RawProfile = {
  maxArraySize: number
  periods: BinanceInterval[]
  strategies: string[]
  dates: RawDateRange[]
}

type RawConfig = {
  trading: {
    from: string
    to: string
    period: BinanceInterval
    fees: number
    initialCapital: number
  }
  simulation:
    | {
        profiles: Record<string, RawProfile>
      }
    | {
        maxArraySize: number
        periods: BinanceInterval[]
        strategies: string[]
        dates: RawDateRange[]
      }
  generation?: RawGenerationConfig
  paths: AppConfig['paths']
}

function resolveDate(value: string): Date {
  return value === 'now' ? new Date() : new Date(value)
}

function parseDates(dates: RawDateRange[]): DateRange[] {
  return dates.map((d) => ({
    start: resolveDate(d.start),
    end: resolveDate(d.end),
  }))
}

function parseProfiles(raw: RawConfig['simulation']): SimulationProfile[] {
  if ('profiles' in raw) {
    return Object.entries(raw.profiles).map(([name, profile]) => ({
      name,
      maxArraySize: profile.maxArraySize,
      periods: profile.periods,
      strategies: profile.strategies,
      dates: parseDates(profile.dates),
    }))
  }

  // Backward compat: flat simulation config → single unnamed profile
  return [
    {
      name: 'default',
      maxArraySize: raw.maxArraySize,
      periods: raw.periods,
      strategies: raw.strategies,
      dates: parseDates(raw.dates),
    },
  ]
}

export function loadConfig(path?: string): AppConfig {
  const configPath = path ?? resolve(process.cwd(), 'config.json')
  const raw: RawConfig = JSON.parse(readFileSync(configPath, 'utf-8'))

  const defaultGeneration: RawGenerationConfig = {
    enabled: false,
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    maxTokens: 4096,
    temperature: 0.3,
  }

  return {
    trading: {
      ...raw.trading,
      pair: raw.trading.from + raw.trading.to,
    },
    simulation: {
      profiles: parseProfiles(raw.simulation),
    },
    generation: {
      ...(raw.generation ?? defaultGeneration),
      apiKey: process.env.GENERATION_API_KEY ?? '',
    },
    paths: raw.paths,
  }
}

export function buildDbModel(config: AppConfig): DbSchema {
  return {
    version: 1,
    initialParameters: {
      period: config.trading.period,
      pair: config.trading.pair,
    },
    historicPosition: [],
    position: { date: '', type: 'sell', price: 0, capital: 0, assets: 0 },
  }
}
