import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { discoverCustomStrategies, loadStrategyFile } from '../loader'
import type { CustomStrategyDef } from '../types'

const TEST_DIR = resolve(process.cwd(), '.test-strategies')

const validDef: CustomStrategyDef = {
  name: 'test-loader-valid',
  description: 'A valid test strategy',
  indicators: { rsi: { period: 14 } },
  buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
  sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
}

const invalidDef = {
  name: 'invalid',
  description: 'Missing indicators field properly',
  indicators: { fakeindicator: {} },
  buy: { mode: 'all', conditions: [['fakeindicator', '<', 30]] },
  sell: { mode: 'all', conditions: [['close', '>', 70]] },
}

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
  writeFileSync(
    resolve(TEST_DIR, 'valid.json'),
    JSON.stringify(validDef, null, 2),
  )
  writeFileSync(
    resolve(TEST_DIR, 'invalid.json'),
    JSON.stringify(invalidDef, null, 2),
  )
  writeFileSync(resolve(TEST_DIR, 'broken.json'), '{ not valid json }')
  writeFileSync(resolve(TEST_DIR, 'readme.txt'), 'not a json file')
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('loadStrategyFile', () => {
  it('loads a valid JSON file', () => {
    const def = loadStrategyFile(resolve(TEST_DIR, 'valid.json'))
    expect(def.name).toBe('test-loader-valid')
    expect(def.indicators).toHaveProperty('rsi')
  })

  it('throws on broken JSON', () => {
    expect(() => loadStrategyFile(resolve(TEST_DIR, 'broken.json'))).toThrow()
  })
})

describe('discoverCustomStrategies', () => {
  it('returns only valid strategies', () => {
    const strategies = discoverCustomStrategies(TEST_DIR)
    expect(strategies).toHaveLength(1)
    expect(strategies[0].name).toBe('test-loader-valid')
  })

  it('returns empty array for non-existent directory', () => {
    const strategies = discoverCustomStrategies('/tmp/nonexistent-dir-12345')
    expect(strategies).toEqual([])
  })

  it('ignores non-JSON files', () => {
    const strategies = discoverCustomStrategies(TEST_DIR)
    expect(strategies.every((s) => s.name !== 'readme')).toBe(true)
  })
})
