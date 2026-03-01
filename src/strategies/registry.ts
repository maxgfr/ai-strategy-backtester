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
