import type { IDatabase } from '../database'
import { executeBuy, executeSell } from '../trade'
import type { DbSchema, LastPosition } from '../types'

const createMockDb = (
  position: LastPosition,
): IDatabase & { data: Pick<DbSchema, 'position' | 'historicPosition'> } => {
  const data = {
    position,
    historicPosition: [] as LastPosition[],
  }
  return {
    get: ((key: keyof typeof data) => data[key]) as IDatabase['get'],
    set: ((key: keyof typeof data, value: unknown) => {
      ;(data as Record<string, unknown>)[key] = value
    }) as IDatabase['set'],
    push: (_key: 'historicPosition', value: LastPosition) => {
      data.historicPosition.push(value)
    },
    flush: () => {},
    data,
  }
}

describe('executeBuy', () => {
  test('buys assets with capital minus fees', () => {
    const db = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 10000,
      assets: 0,
    })
    executeBuy(100, new Date('2023-01-01'), db, 0.0026)

    expect(db.data.position.type).toBe('buy')
    expect(db.data.position.price).toBe(100)
    expect(db.data.position.capital).toBeCloseTo(9974, 0)
    expect(db.data.position.assets).toBeCloseTo(99.74, 1)
  })

  test('does nothing when capital is 0', () => {
    const db = createMockDb({
      date: '',
      type: 'buy',
      price: 100,
      capital: 0,
      assets: 50,
    })
    executeBuy(200, new Date('2023-01-01'), db, 0.0026)

    expect(db.data.position.capital).toBe(0)
    expect(db.data.position.assets).toBe(50)
  })
})

describe('executeSell', () => {
  test('sells assets and computes trade profit', () => {
    const db = createMockDb({
      date: '',
      type: 'buy',
      price: 100,
      capital: 9974,
      assets: 99.74,
    })
    executeSell(120, new Date('2023-01-02'), db, 0.0026)

    expect(db.data.position.type).toBe('sell')
    expect(db.data.position.price).toBe(120)
    expect(db.data.position.assets).toBe(0)
    expect(db.data.position.capital).toBeGreaterThan(9974)
    expect(db.data.position.tradeProfit).toBeGreaterThan(0)
  })

  test('does nothing when assets is 0', () => {
    const db = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 10000,
      assets: 0,
    })
    executeSell(120, new Date('2023-01-02'), db, 0.0026)

    expect(db.data.position.capital).toBe(10000)
    expect(db.data.position.assets).toBe(0)
  })

  test('computes negative trade profit on loss', () => {
    const db = createMockDb({
      date: '',
      type: 'buy',
      price: 100,
      capital: 9974,
      assets: 99.74,
    })
    executeSell(80, new Date('2023-01-02'), db, 0.0026)

    expect(db.data.position.type).toBe('sell')
    expect(db.data.position.tradeProfit).toBeLessThan(0)
    expect(db.data.position.capital).toBeLessThan(9974)
  })
})
