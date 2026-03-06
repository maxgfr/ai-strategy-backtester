import type { BinanceInterval } from '../types'
import { createCustomStrategy } from './custom/engine'
import { discoverCustomStrategies } from './custom/loader'
import type { ResolvedStrategy } from './types'

export function getStrategy(
  name: string,
  timeframe?: BinanceInterval,
): ResolvedStrategy {
  const customs = discoverCustomStrategies()
  const def = customs.find((d) => d.name === name)
  if (def) {
    return {
      fn: createCustomStrategy(def, timeframe),
      leverage: def.leverage ?? 1,
    }
  }

  throw new Error(
    `Unknown strategy: "${name}". Available: ${customs.map((d) => d.name).join(', ')}`,
  )
}

export function listStrategies(): string[] {
  return discoverCustomStrategies().map((d) => d.name)
}
