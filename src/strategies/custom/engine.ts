import type { CandleStick } from '../../types'
import type { Signal, StrategyFn } from '../types'
import { type CatalogEntry, catalog } from './catalog'
import type {
  Condition,
  CustomStrategyDef,
  IndicatorParams,
  Op,
  ScoreSignalBlock,
  SignalBlock,
  SimpleSignalBlock,
  ValueRef,
} from './types'

const CANDLE_FIELDS = new Set(['close', 'high', 'low', 'open', 'volume'])
const VALID_OPS = new Set<Op>(['>', '<', '>=', '<=', '==', '!='])

type IndicatorCache = Map<string, unknown[]>

// Maps alias → catalog indicator name (for _type support)
type AliasMap = Map<string, string>

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
    const fieldValue = (value as Record<string, unknown>)[field]
    if (typeof fieldValue === 'number') return fieldValue
    return undefined
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
    const scoreBlock = block as ScoreSignalBlock
    if (scoreBlock.required) {
      const allRequired = scoreBlock.required.every((c) =>
        evaluateCondition(c, candle, cache, aliasMap),
      )
      if (!allRequired) return false
    }
    let score = 0
    for (const c of scoreBlock.scored) {
      if (evaluateCondition(c, candle, cache, aliasMap)) score++
    }
    return score >= scoreBlock.threshold
  }

  const simpleBlock = block as SimpleSignalBlock
  if (block.mode === 'all') {
    return simpleBlock.conditions.every((c) =>
      evaluateCondition(c, candle, cache, aliasMap),
    )
  }

  // mode === 'any'
  return simpleBlock.conditions.some((c) =>
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
    cache.set(alias, entry.compute(candles, stripTypeParam(params)))
  }
  return { cache, aliasMap }
}

export function createCustomStrategy(def: CustomStrategyDef): StrategyFn {
  return (data: CandleStick[]): Signal | null => {
    if (data.length === 0) return null

    const { cache, aliasMap } = computeIndicators(data, def.indicators)
    const candle = data[data.length - 1]

    // Sell takes priority
    if (evaluateSignalBlock(def.sell, candle, cache, aliasMap)) {
      return 'sell'
    }
    if (evaluateSignalBlock(def.buy, candle, cache, aliasMap)) {
      return 'buy'
    }
    return null
  }
}

function collectValueRefs(block: SignalBlock): ValueRef[] {
  const refs: ValueRef[] = []
  if (block.mode === 'score') {
    const sb = block as ScoreSignalBlock
    if (sb.required) {
      for (const [l, , r] of sb.required) {
        refs.push(l, r)
      }
    }
    for (const [l, , r] of sb.scored) {
      refs.push(l, r)
    }
  } else {
    const sb = block as SimpleSignalBlock
    for (const [l, , r] of sb.conditions) {
      refs.push(l, r)
    }
  }
  return refs
}

function collectConditions(block: SignalBlock): Condition[] {
  if (block.mode === 'score') {
    const sb = block as ScoreSignalBlock
    return [...(sb.required ?? []), ...sb.scored]
  }
  return (block as SimpleSignalBlock).conditions
}

export function validateStrategy(
  def: CustomStrategyDef,
  cat: Record<string, CatalogEntry> = catalog,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!def.name || typeof def.name !== 'string') {
    errors.push('Missing or invalid "name"')
  }
  if (!def.description || typeof def.description !== 'string') {
    errors.push('Missing or invalid "description"')
  }

  // Build alias → catalog name mapping for validation
  const aliasMap = new Map<string, string>()
  if (!def.indicators || typeof def.indicators !== 'object') {
    errors.push('Missing or invalid "indicators"')
  } else {
    for (const [alias, params] of Object.entries(def.indicators)) {
      const catalogName = resolveIndicatorName(alias, params)
      aliasMap.set(alias, catalogName)
      if (!cat[catalogName]) {
        errors.push(`Unknown indicator: "${catalogName}" (alias: "${alias}")`)
      }
    }
  }

  for (const blockName of ['buy', 'sell'] as const) {
    const block = def[blockName]
    if (!block) {
      errors.push(`Missing "${blockName}" block`)
      continue
    }

    if (!['all', 'any', 'score'].includes(block.mode)) {
      errors.push(`Invalid mode "${block.mode}" in ${blockName} block`)
    }

    if (block.mode === 'score') {
      const sb = block as ScoreSignalBlock
      if (typeof sb.threshold !== 'number') {
        errors.push(`Missing "threshold" in ${blockName} score block`)
      }
      if (!Array.isArray(sb.scored) || sb.scored.length === 0) {
        errors.push(`Missing or empty "scored" in ${blockName} score block`)
      }
    } else {
      const sb = block as SimpleSignalBlock
      if (!Array.isArray(sb.conditions) || sb.conditions.length === 0) {
        errors.push(`Missing or empty "conditions" in ${blockName} block`)
      }
    }

    const conditions = collectConditions(block)
    for (const cond of conditions) {
      if (!Array.isArray(cond) || cond.length !== 3) {
        errors.push(
          `Invalid condition format in ${blockName}: expected [left, op, right]`,
        )
        continue
      }
      const [, op] = cond
      if (!VALID_OPS.has(op as Op)) {
        errors.push(`Invalid operator "${op}" in ${blockName} condition`)
      }
    }

    const refs = collectValueRefs(block)
    for (const ref of refs) {
      if (typeof ref === 'number') continue
      if (CANDLE_FIELDS.has(ref)) continue

      const parsed = parseValueRef(ref)
      if (!parsed.indicator) {
        errors.push(`Invalid value reference "${ref}" in ${blockName}`)
        continue
      }

      // Check if indicator is declared (either directly or as alias)
      const catalogName = aliasMap.get(parsed.indicator)
      if (!catalogName && !def.indicators[parsed.indicator]) {
        errors.push(
          `Reference "${ref}" uses undeclared indicator "${parsed.indicator}" in ${blockName}`,
        )
      }
      // Validate field exists on catalog entry
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
