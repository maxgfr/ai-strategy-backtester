import type { IDatabase } from '../database'
import { executeBuy, executeCover, executeSell, executeShort } from '../trade'
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

describe('executeShort', () => {
  test('opens short position with capital minus fees', () => {
    const db = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 10000,
      assets: 0,
    })
    executeShort(100, new Date('2023-01-01'), db, 0.0026)

    expect(db.data.position.type).toBe('short')
    expect(db.data.position.price).toBe(100)
    expect(db.data.position.capital).toBeCloseTo(9974, 0)
    expect(db.data.position.assets).toBeCloseTo(99.74, 1)
  })

  test('does nothing when capital is 0', () => {
    const db = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 0,
      assets: 0,
    })
    executeShort(100, new Date('2023-01-01'), db, 0.0026)

    expect(db.data.position.capital).toBe(0)
    expect(db.data.position.type).toBe('sell')
  })
})

describe('executeCover', () => {
  test('covers short with profit when price drops', () => {
    const db = createMockDb({
      date: '',
      type: 'short',
      price: 100,
      capital: 9974,
      assets: 99.74,
    })
    executeCover(80, new Date('2023-01-02'), db, 0.0026)

    expect(db.data.position.type).toBe('sell')
    expect(db.data.position.assets).toBe(0)
    // Price dropped 20%, so we profit
    expect(db.data.position.capital).toBeGreaterThan(9974)
    expect(db.data.position.tradeProfit).toBeGreaterThan(0)
  })

  test('covers short with loss when price rises', () => {
    const db = createMockDb({
      date: '',
      type: 'short',
      price: 100,
      capital: 9974,
      assets: 99.74,
    })
    executeCover(120, new Date('2023-01-02'), db, 0.0026)

    expect(db.data.position.type).toBe('sell')
    expect(db.data.position.assets).toBe(0)
    // Price rose 20%, so we lose
    expect(db.data.position.capital).toBeLessThan(9974)
    expect(db.data.position.tradeProfit).toBeLessThan(0)
  })

  test('does nothing when assets is 0', () => {
    const db = createMockDb({
      date: '',
      type: 'short',
      price: 100,
      capital: 10000,
      assets: 0,
    })
    executeCover(80, new Date('2023-01-02'), db, 0.0026)

    expect(db.data.position.capital).toBe(10000)
    expect(db.data.position.assets).toBe(0)
  })

  test('capital cannot go below 0', () => {
    const db = createMockDb({
      date: '',
      type: 'short',
      price: 100,
      capital: 9974,
      assets: 99.74,
    })
    // Price triples — total loss
    executeCover(300, new Date('2023-01-02'), db, 0.0026)

    expect(db.data.position.type).toBe('sell')
    expect(db.data.position.capital).toBe(0)
  })
})

describe('leverage', () => {
  test('executeBuy with 2x leverage doubles asset position', () => {
    const db = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 10000,
      assets: 0,
    })
    executeBuy(100, new Date('2023-01-01'), db, 0.0026, 2)

    expect(db.data.position.type).toBe('buy')
    // assets = (10000 * 0.9974) * 2 / 100 = ~199.48
    expect(db.data.position.assets).toBeCloseTo(199.48, 0)
    // capital (margin) stays the same
    expect(db.data.position.capital).toBeCloseTo(9974, 0)
  })

  test('executeSell with 2x leverage amplifies profit', () => {
    const db = createMockDb({
      date: '',
      type: 'buy',
      price: 100,
      capital: 10000,
      assets: 200, // 2x leveraged position
    })
    // Price up 20%: profit should be ~40% (2x leverage)
    executeSell(120, new Date('2023-01-02'), db, 0, 2)

    // grossValue = 120 * 200 = 24000
    // borrowed = 10000 * (2-1) = 10000
    // capital = 24000 - 10000 = 14000
    expect(db.data.position.capital).toBe(14000)
    expect(db.data.position.tradeProfit).toBe(4000)
  })

  test('executeSell with 2x leverage amplifies loss', () => {
    const db = createMockDb({
      date: '',
      type: 'buy',
      price: 100,
      capital: 10000,
      assets: 200,
    })
    // Price down 30%: loss should be ~60% (2x leverage)
    executeSell(70, new Date('2023-01-02'), db, 0, 2)

    // grossValue = 70 * 200 = 14000
    // borrowed = 10000
    // capital = 14000 - 10000 = 4000
    expect(db.data.position.capital).toBe(4000)
    expect(db.data.position.tradeProfit).toBe(-6000)
  })

  test('executeSell with leverage clamps at 0 (liquidation)', () => {
    const db = createMockDb({
      date: '',
      type: 'buy',
      price: 100,
      capital: 10000,
      assets: 200,
    })
    // Price down 60%: with 2x leverage, total loss
    executeSell(40, new Date('2023-01-02'), db, 0, 2)

    // grossValue = 40 * 200 = 8000
    // borrowed = 10000
    // capital = 8000 - 10000 = -2000 → clamped to 0
    expect(db.data.position.capital).toBe(0)
  })

  test('executeShort with 3x leverage triples asset position', () => {
    const db = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 10000,
      assets: 0,
    })
    executeShort(100, new Date('2023-01-01'), db, 0, 3)

    // assets = 10000 * 3 / 100 = 300
    expect(db.data.position.assets).toBe(300)
    expect(db.data.position.capital).toBe(10000)
  })

  test('executeCover with leveraged short amplifies profit', () => {
    const db = createMockDb({
      date: '',
      type: 'short',
      price: 100,
      capital: 10000,
      assets: 200, // 2x leveraged short
    })
    // Price drops 20%: 40% profit with 2x
    executeCover(80, new Date('2023-01-02'), db, 0)

    // capital = 10000 + (100 - 80) * 200 = 10000 + 4000 = 14000
    expect(db.data.position.capital).toBe(14000)
    expect(db.data.position.tradeProfit).toBe(4000)
  })

  test('executeCover with leveraged short amplifies loss', () => {
    const db = createMockDb({
      date: '',
      type: 'short',
      price: 100,
      capital: 10000,
      assets: 200,
    })
    // Price up 30%: 60% loss with 2x
    executeCover(130, new Date('2023-01-02'), db, 0)

    // capital = 10000 + (100 - 130) * 200 = 10000 - 6000 = 4000
    expect(db.data.position.capital).toBe(4000)
    expect(db.data.position.tradeProfit).toBe(-6000)
  })

  test('backward compatible: leverage=1 matches original behavior', () => {
    const db1 = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 10000,
      assets: 0,
    })
    const db2 = createMockDb({
      date: '',
      type: 'sell',
      price: 100,
      capital: 10000,
      assets: 0,
    })

    // Without leverage param (defaults to 1)
    executeBuy(100, new Date('2023-01-01'), db1, 0.0026)
    // With explicit leverage=1
    executeBuy(100, new Date('2023-01-01'), db2, 0.0026, 1)

    expect(db1.data.position.assets).toBe(db2.data.position.assets)
    expect(db1.data.position.capital).toBe(db2.data.position.capital)
  })
})
