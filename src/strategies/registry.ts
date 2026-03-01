import { createCustomStrategy } from './custom/engine'
import { discoverCustomStrategies } from './custom/loader'
import type { StrategyFn } from './types'

export function getStrategy(name: string): StrategyFn {
  const customs = discoverCustomStrategies()
  const def = customs.find((d) => d.name === name)
  if (def) {
    return createCustomStrategy(def)
  }

  throw new Error(
    `Unknown strategy: "${name}". Available: ${customs.map((d) => d.name).join(', ')}`,
  )
}

export function listStrategies(): string[] {
  return discoverCustomStrategies().map((d) => d.name)
}

/**
 * Resolve a strategy pattern to a list of strategy names.
 * - `"*"` → all strategies WITHOUT `st-` prefix (long-term)
 * - `"st-*"` → all strategies WITH `st-` prefix (short-term)
 * - Exact name → just that strategy
 */
export function listStrategiesByPattern(patterns: string[]): string[] {
  const all = listStrategies()

  const result = new Set<string>()
  for (const pattern of patterns) {
    if (pattern === '*') {
      for (const name of all) {
        if (!name.startsWith('st-')) {
          result.add(name)
        }
      }
    } else if (pattern === 'st-*') {
      for (const name of all) {
        if (name.startsWith('st-')) {
          result.add(name)
        }
      }
    } else {
      if (all.includes(pattern)) {
        result.add(pattern)
      }
    }
  }

  return [...result]
}
