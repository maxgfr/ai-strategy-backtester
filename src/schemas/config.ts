import { z } from 'zod'

const BinanceIntervalSchema = z.enum([
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
])

const DateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
})

const StrategyConfigSchema = z.object({
  timeframes: z.array(BinanceIntervalSchema).nonempty(),
  stop_loss_pct: z.number().min(0).max(1).optional(),
  trailing_stop_pct: z.number().min(0).max(1).optional(),
})

const GenerationSchema = z.object({
  enabled: z.boolean(),
  model: z.string().min(1),
  baseUrl: z.string().url(),
  maxTokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
})

const PathsSchema = z.object({
  dbFolder: z.string().min(1),
  dbFile: z.string().min(1),
  logFile: z.string().min(1),
})

export const RawConfigSchema = z.object({
  fees: z.number().min(0).max(1),
  fundingRate: z.number().min(0).max(0.01).optional(),
  slippage: z.number().min(0).max(0.1).optional(),
  initialCapital: z.number().positive(),
  symbols: z.array(z.string().min(1)).nonempty(),
  dates: z.array(DateRangeSchema).nonempty(),
  strategies: z.record(z.string(), StrategyConfigSchema),
  generation: GenerationSchema.optional(),
  paths: PathsSchema,
})

export type RawConfigFromSchema = z.infer<typeof RawConfigSchema>
