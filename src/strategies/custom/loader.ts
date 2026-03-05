import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { logger } from '../../logger'
import { getErrorMessage } from '../../utils'
import { validateStrategy } from './engine'
import type { CustomStrategyDef } from './types'

const DEFAULT_DIR = resolve(process.cwd(), 'strategies')

export function loadStrategyFile(filePath: string): CustomStrategyDef {
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as CustomStrategyDef
}

export function discoverCustomStrategies(
  dir: string = DEFAULT_DIR,
): CustomStrategyDef[] {
  if (!existsSync(dir)) return []

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const strategies: CustomStrategyDef[] = []

  for (const file of files) {
    const filePath = resolve(dir, file)
    try {
      const def = loadStrategyFile(filePath)
      const { valid, errors } = validateStrategy(def)
      if (valid) {
        strategies.push(def)
      } else {
        logger.warn(`Invalid custom strategy "${file}": ${errors.join('; ')}`)
      }
    } catch (err) {
      logger.warn(
        `Failed to load custom strategy "${file}": ${getErrorMessage(err)}`,
      )
    }
  }

  return strategies
}
