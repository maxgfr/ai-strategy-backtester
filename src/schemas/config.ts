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

const ProfileSchema = z.object({
  maxArraySize: z.number().int().positive(),
  periods: z.array(BinanceIntervalSchema).nonempty(),
  strategies: z.array(z.string().min(1)).nonempty(),
  dates: z.array(DateRangeSchema).nonempty(),
})

const TradingSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  fees: z.number().min(0).max(1),
  initialCapital: z.number().positive(),
})

const SimulationWithProfilesSchema = z.object({
  profiles: z.record(z.string(), ProfileSchema),
})

const SimulationFlatSchema = ProfileSchema

const SimulationSchema = z.union([
  SimulationWithProfilesSchema,
  SimulationFlatSchema,
])

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
  trading: TradingSchema,
  simulation: SimulationSchema,
  generation: GenerationSchema.optional(),
  paths: PathsSchema,
})

export type RawConfigFromSchema = z.infer<typeof RawConfigSchema>
