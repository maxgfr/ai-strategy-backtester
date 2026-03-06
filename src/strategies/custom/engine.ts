import type { ZodError, ZodIssue } from 'zod'
import { StrategyDefSchema } from '../../schemas/strategy'
import type { BinanceInterval, CandleStick } from '../../types'
import type { PositionType, Signal, StrategyFn } from '../types'
import { type CatalogEntry, catalog } from './catalog'
import type {
  Condition,
  CustomStrategyDef,
  IndicatorParams,
  SignalBlock,
  ValueRef,
} from './types'

const CANDLE_FIELDS = new Set(['close', 'high', 'low', 'open', 'volume'])

type IndicatorValue = number | Record<string, number>
type IndicatorCache = Map<string, IndicatorValue[]>

// Maps alias → catalog indicator name (for _type support)
type AliasMap = Map<string, string>

// === Timeframe auto-scaling ===

const TIMEFRAME_MINUTES: Record<string, number> = {
  '1m': 1,
  '3m': 3,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '4h': 240,
  '6h': 360,
  '8h': 480,
  '12h': 720,
  '1d': 1440,
  '3d': 4320,
  '1w': 10080,
}

const REFERENCE_MINUTES = 240 // 4h is the reference timeframe

// Params that represent periods (should be scaled). All others (multiplier, stdDev, etc.) stay fixed.
const PERIOD_PARAMS = new Set([
  'period',
  'fast',
  'slow',
  'signal',
  'emaPeriod',
  'atrPeriod',
  'rsiPeriod',
  'stochasticPeriod',
  'kPeriod',
  'dPeriod',
  'rsvPeriod',
  'conversionPeriod',
  'basePeriod',
  'spanPeriod',
  'maPeriod',
  'smaPeriod',
  'fastPeriod',
  'slowPeriod',
  'signalPeriod',
  'smooth1Period',
  'smooth2Period',
])

function scaleIndicatorParams(
  params: IndicatorParams,
  timeframe: BinanceInterval,
): IndicatorParams {
  const tfMinutes = TIMEFRAME_MINUTES[timeframe]
  if (!tfMinutes || tfMinutes === REFERENCE_MINUTES) return params

  // Scale factor: sqrt dampening to avoid extreme values
  // Shorter timeframes → larger periods, longer timeframes → smaller periods
  const ratio = REFERENCE_MINUTES / tfMinutes
  const scale = Math.sqrt(ratio)

  const scaled: Record<string, number | string | undefined> = {}
  for (const [key, value] of Object.entries(params)) {
    if (key === '_type' || typeof value !== 'number') {
      scaled[key] = value
    } else if (PERIOD_PARAMS.has(key)) {
      scaled[key] = Math.max(2, Math.round(value * scale))
    } else {
      scaled[key] = value
    }
  }
  return scaled as IndicatorParams
}

function scaleStrategyForTimeframe(
  def: CustomStrategyDef,
  timeframe: BinanceInterval,
): CustomStrategyDef {
  const scaledIndicators: Record<string, IndicatorParams> = {}
  for (const [alias, params] of Object.entries(def.indicators)) {
    scaledIndicators[alias] = scaleIndicatorParams(params, timeframe)
  }
  return { ...def, indicators: scaledIndicators }
}

// === Core engine ===

function parseValueRef(ref: ValueRef): {
  indicator?: string
  field?: string
  offset: number
} {
  if (typeof ref === 'number') return { offset: 0 }
  if (CANDLE_FIELDS.has(ref)) return { offset: 0 }

  const match = ref.match(/^([a-zA-Z]+)(?:\.([a-zA-Z]+))?(?:\[(-?\d+)\])?$/)
  if (!match) return { offset: 0 }

  return {
    indicator: match[1],
    field: match[2],
    offset: match[3] ? Number.parseInt(match[3], 10) : 0,
  }
}

function resolveValue(
  ref: ValueRef,
  candle: CandleStick,
  cache: IndicatorCache,
  aliasMap: AliasMap,
): number | undefined {
  if (typeof ref === 'number') return ref

  if (CANDLE_FIELDS.has(ref)) {
    return candle[ref as keyof CandleStick] as number
  }

  const parsed = parseValueRef(ref)
  if (!parsed.indicator) return undefined

  const results = cache.get(parsed.indicator)
  if (!results || results.length === 0) return undefined

  const index = results.length - 1 + parsed.offset
  if (index < 0 || index >= results.length) return undefined

  const value = results[index]
  if (value == null) return undefined

  if (typeof value === 'number') return value

  if (typeof value === 'object') {
    const catalogName = aliasMap.get(parsed.indicator) ?? parsed.indicator
    const field = parsed.field ?? catalog[catalogName]?.defaultField
    if (!field) return undefined
    return value[field]
  }

  return undefined
}

function evaluateCondition(
  condition: Condition,
  candle: CandleStick,
  cache: IndicatorCache,
  aliasMap: AliasMap,
): boolean {
  const [leftRef, op, rightRef] = condition
  const left = resolveValue(leftRef, candle, cache, aliasMap)
  const right = resolveValue(rightRef, candle, cache, aliasMap)

  if (left === undefined || right === undefined) return false

  switch (op) {
    case '>':
      return left > right
    case '<':
      return left < right
    case '>=':
      return left >= right
    case '<=':
      return left <= right
    case '==':
      return left === right
    case '!=':
      return left !== right
    default:
      return false
  }
}

function evaluateSignalBlock(
  block: SignalBlock,
  candle: CandleStick,
  cache: IndicatorCache,
  aliasMap: AliasMap,
): boolean {
  if (block.mode === 'score') {
    if (block.required) {
      const allRequired = block.required.every((c) =>
        evaluateCondition(c, candle, cache, aliasMap),
      )
      if (!allRequired) return false
    }
    let score = 0
    for (const c of block.scored) {
      if (evaluateCondition(c, candle, cache, aliasMap)) score++
    }
    return score >= block.threshold
  }

  if (block.mode === 'all') {
    return block.conditions.every((c) =>
      evaluateCondition(c, candle, cache, aliasMap),
    )
  }

  // mode === 'any'
  return block.conditions.some((c) =>
    evaluateCondition(c, candle, cache, aliasMap),
  )
}

function resolveIndicatorName(alias: string, params: IndicatorParams): string {
  return typeof params._type === 'string' ? params._type : alias
}

function stripTypeParam(params: IndicatorParams): Record<string, number> {
  const clean: Record<string, number> = {}
  for (const [k, v] of Object.entries(params)) {
    if (k !== '_type' && typeof v === 'number') {
      clean[k] = v
    }
  }
  return clean
}

function computeIndicators(
  candles: CandleStick[],
  indicatorDefs: Record<string, IndicatorParams>,
): { cache: IndicatorCache; aliasMap: AliasMap } {
  const cache: IndicatorCache = new Map()
  const aliasMap: AliasMap = new Map()
  for (const [alias, params] of Object.entries(indicatorDefs)) {
    const catalogName = resolveIndicatorName(alias, params)
    aliasMap.set(alias, catalogName)
    const entry = catalog[catalogName]
    if (!entry) continue
    cache.set(
      alias,
      entry.compute(candles, stripTypeParam(params)) as IndicatorValue[],
    )
  }
  return { cache, aliasMap }
}

export function createCustomStrategy(
  def: CustomStrategyDef,
  timeframe?: BinanceInterval,
): StrategyFn {
  const effectiveDef = timeframe
    ? scaleStrategyForTimeframe(def, timeframe)
    : def

  return (data: CandleStick[], positionType?: PositionType): Signal | null => {
    if (data.length === 0) return null

    const { cache, aliasMap } = computeIndicators(data, effectiveDef.indicators)
    const candle = data[data.length - 1]

    // Position-aware signal evaluation:
    // - When long (positionType='buy'), only sell conditions are actionable
    // - When short (positionType='short'), only cover conditions are actionable
    // - When flat (positionType='sell' or undefined), buy and short conditions are checked
    if (positionType === 'buy') {
      if (evaluateSignalBlock(effectiveDef.sell, candle, cache, aliasMap)) {
        return 'sell'
      }
    } else if (positionType === 'short') {
      if (
        effectiveDef.cover &&
        evaluateSignalBlock(effectiveDef.cover, candle, cache, aliasMap)
      ) {
        return 'cover'
      }
    } else {
      if (evaluateSignalBlock(effectiveDef.buy, candle, cache, aliasMap)) {
        return 'buy'
      }
      if (
        effectiveDef.short &&
        evaluateSignalBlock(effectiveDef.short, candle, cache, aliasMap)
      ) {
        return 'short'
      }
    }
    return null
  }
}

function collectValueRefs(block: SignalBlock): ValueRef[] {
  const refs: ValueRef[] = []
  if (block.mode === 'score') {
    if (block.required) {
      for (const [l, , r] of block.required) {
        refs.push(l, r)
      }
    }
    for (const [l, , r] of block.scored) {
      refs.push(l, r)
    }
  } else {
    for (const [l, , r] of block.conditions) {
      refs.push(l, r)
    }
  }
  return refs
}

function flattenZodIssues(
  issues: ZodIssue[],
  parentPath: (string | number)[] = [],
): { message: string; path: (string | number)[] }[] {
  const flat: { message: string; path: (string | number)[] }[] = []
  for (const issue of issues) {
    const fullPath = [...parentPath, ...(issue.path as (string | number)[])]
    if (issue.code === 'invalid_union' && 'errors' in issue) {
      const branches = issue.errors as ZodIssue[][]
      let best = branches[0] ?? []
      for (const branch of branches) {
        if (branch.length < best.length) best = branch
      }
      flat.push(...flattenZodIssues(best, fullPath))
    } else {
      flat.push({ message: issue.message, path: fullPath })
    }
  }
  return flat
}

function formatZodErrors(error: ZodError): string[] {
  return flattenZodIssues(error.issues).map(({ message, path }) => {
    const loc = path.length > 0 ? ` at ${path.join('.')}` : ''
    return `${message}${loc}`
  })
}

export function validateStrategy(
  def: CustomStrategyDef,
  cat: Record<string, CatalogEntry> = catalog,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Structural validation via Zod
  const parseResult = StrategyDefSchema.safeParse(def)
  if (!parseResult.success) {
    errors.push(...formatZodErrors(parseResult.error))
    return { valid: false, errors }
  }

  // Semantic validation: check indicators exist in catalog
  const aliasMap = new Map<string, string>()
  for (const [alias, params] of Object.entries(def.indicators)) {
    const catalogName = resolveIndicatorName(alias, params)
    aliasMap.set(alias, catalogName)
    if (!cat[catalogName]) {
      errors.push(`Unknown indicator: "${catalogName}" (alias: "${alias}")`)
    }
  }

  // Semantic validation: check value references resolve to declared indicators/fields
  const blocksToValidate: { name: string; block: SignalBlock | undefined }[] = [
    { name: 'buy', block: def.buy },
    { name: 'sell', block: def.sell },
    { name: 'short', block: def.short },
    { name: 'cover', block: def.cover },
  ]

  // short and cover must both be present or both absent
  if ((def.short && !def.cover) || (!def.short && def.cover)) {
    errors.push('Short and cover blocks must both be defined or both absent')
  }

  for (const { name: blockName, block } of blocksToValidate) {
    if (!block) continue
    const refs = collectValueRefs(block)
    for (const ref of refs) {
      if (typeof ref === 'number') continue
      if (CANDLE_FIELDS.has(ref)) continue

      const parsed = parseValueRef(ref)
      if (!parsed.indicator) {
        errors.push(`Invalid value reference "${ref}" in ${blockName}`)
        continue
      }

      const catalogName = aliasMap.get(parsed.indicator)
      if (!catalogName && !def.indicators[parsed.indicator]) {
        errors.push(
          `Reference "${ref}" uses undeclared indicator "${parsed.indicator}" in ${blockName}`,
        )
      }
      const entryName = catalogName ?? parsed.indicator
      const entry = cat[entryName]
      if (entry && parsed.field && entry.fields) {
        if (!entry.fields.includes(parsed.field)) {
          errors.push(
            `Unknown field "${parsed.field}" for indicator "${entryName}" in ${blockName} (available: ${entry.fields.join(', ')})`,
          )
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
