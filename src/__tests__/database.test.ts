import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { Database } from '../database'
import type { DbSchema } from '../types'

const TEST_DIR = resolve(import.meta.dirname, '../../tmp/test-db')

const defaultModel: DbSchema = {
  version: 1,
  initialParameters: { period: '4h', pair: 'BTCUSDT' },
  historicPosition: [],
  position: { date: '', type: 'sell', price: 0, capital: 10000, assets: 0 },
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
})

describe('Database', () => {
  test('creates file when it does not exist', () => {
    const dbPath = resolve(TEST_DIR, 'new.json')
    const db = new Database(dbPath, defaultModel)

    expect(existsSync(dbPath)).toBe(true)
    expect(db.get('version')).toBe(1)
    expect(db.get('position').capital).toBe(10000)
  })

  test('loads existing file', () => {
    const dbPath = resolve(TEST_DIR, 'existing.json')
    const modified = {
      ...defaultModel,
      position: {
        date: '2023-01-01',
        type: 'buy' as const,
        price: 50000,
        capital: 9974,
        assets: 0.1995,
      },
    }
    writeFileSync(dbPath, JSON.stringify(modified))

    const db = new Database(dbPath, defaultModel)

    expect(db.get('position').type).toBe('buy')
    expect(db.get('position').price).toBe(50000)
  })

  test('throws on corrupted JSON', () => {
    const dbPath = resolve(TEST_DIR, 'corrupt.json')
    writeFileSync(dbPath, '{not valid json')

    expect(() => new Database(dbPath, defaultModel)).toThrow('Corrupted')
  })

  test('get and set work correctly', () => {
    const dbPath = resolve(TEST_DIR, 'getset.json')
    const db = new Database(dbPath, defaultModel)

    db.set('initialCapital', 5000)
    expect(db.get('initialCapital')).toBe(5000)
  })

  test('push appends to historicPosition', () => {
    const dbPath = resolve(TEST_DIR, 'push.json')
    const db = new Database(dbPath, defaultModel)

    const pos = {
      date: '2023-01-01',
      type: 'buy' as const,
      price: 100,
      capital: 9974,
      assets: 99.74,
    }
    db.push('historicPosition', pos)

    expect(db.get('historicPosition')).toHaveLength(1)
    expect(db.get('historicPosition')[0].price).toBe(100)
  })

  test('flush writes data to disk', () => {
    const dbPath = resolve(TEST_DIR, 'flush.json')
    const db = new Database(dbPath, defaultModel)

    db.set('initialCapital', 20000)
    db.flush()

    const raw = readFileSync(dbPath, 'utf-8')
    const data = JSON.parse(raw)
    expect(data.initialCapital).toBe(20000)
  })

  test('flush does nothing when not dirty', () => {
    const dbPath = resolve(TEST_DIR, 'nodirty.json')
    const db = new Database(dbPath, defaultModel)

    const before = readFileSync(dbPath, 'utf-8')
    db.flush()
    const after = readFileSync(dbPath, 'utf-8')

    expect(before).toBe(after)
  })
})
