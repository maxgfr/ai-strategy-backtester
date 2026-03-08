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

const WalkForwardSchema = z.object({
  enabled: z.boolean(),
  trainRatio: z.number().min(0.1).max(0.9),
})

const GenerationSchema = z.object({
  enabled: z.boolean(),
  model: z.string().min(1),
  baseUrl: z.url(),
  maxTokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
})

const DefaultsSchema = z
  .object({
    timeframes: z.array(BinanceIntervalSchema).nonempty().optional(),
    stop_loss_pct: z.number().min(0).max(1).optional(),
    trailing_stop_pct: z.number().min(0).max(1).optional(),
    max_drawdown_pct: z.number().min(0).max(1).optional(),
    risk_per_trade: z.number().min(0).max(1).optional(),
  })
  .optional()

const PartialStrategyConfigSchema = z.object({
  timeframes: z.array(BinanceIntervalSchema).nonempty().optional(),
  stop_loss_pct: z.number().min(0).max(1).optional(),
  trailing_stop_pct: z.number().min(0).max(1).optional(),
  max_drawdown_pct: z.number().min(0).max(1).optional(),
  risk_per_trade: z.number().min(0).max(1).optional(),
})

export const RawConfigSchema = z.object({
  fees: z.number().min(0).max(1),
  makerFee: z.number().min(0).max(1).optional(),
  takerFee: z.number().min(0).max(1).optional(),
  fundingRate: z.number().min(0).max(0.01).optional(),
  slippage: z.number().min(0).max(0.1).optional(),
  initialCapital: z.number().positive(),
  symbols: z.array(z.string().min(1)).nonempty(),
  dates: z.array(DateRangeSchema).nonempty(),
  defaults: DefaultsSchema,
  strategies: z.record(z.string(), PartialStrategyConfigSchema),
  generation: GenerationSchema.optional(),
  walkForward: WalkForwardSchema.optional(),
})
