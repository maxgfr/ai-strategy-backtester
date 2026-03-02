import { z } from 'zod'

const OperatorSchema = z.enum(['>', '<', '>=', '<=', '==', '!='])

const ValueRefSchema = z.union([z.number(), z.string()])

const ConditionSchema = z.tuple([
  ValueRefSchema,
  OperatorSchema,
  ValueRefSchema,
])

const SimpleSignalBlockSchema = z.object({
  mode: z.enum(['all', 'any']),
  conditions: z.array(ConditionSchema).nonempty(),
})

const ScoreSignalBlockSchema = z.object({
  mode: z.literal('score'),
  threshold: z.number(),
  required: z.array(ConditionSchema).optional(),
  scored: z.array(ConditionSchema).nonempty(),
})

const SignalBlockSchema = z.union([
  ScoreSignalBlockSchema,
  SimpleSignalBlockSchema,
])

// Indicator params: _type is optional string, rest are number values
const IndicatorParamsSchema = z
  .record(z.string(), z.union([z.number(), z.string()]))
  .refine(
    (obj) => {
      if ('_type' in obj && obj._type !== undefined) {
        return typeof obj._type === 'string'
      }
      return true
    },
    { message: '_type must be a string if provided' },
  )

export const StrategyDefSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*$/, {
      message:
        'Strategy name must be kebab-case (lowercase letters, numbers, hyphens)',
    }),
  description: z.string().min(1),
  indicators: z.record(
    z.string().regex(/^[a-zA-Z]+$/, {
      message: 'Indicator alias must contain only letters (no numbers)',
    }),
    IndicatorParamsSchema,
  ),
  buy: SignalBlockSchema,
  sell: SignalBlockSchema,
})

export type StrategyDefFromSchema = z.infer<typeof StrategyDefSchema>
