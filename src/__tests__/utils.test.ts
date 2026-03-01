import { addMonths, round } from '../utils'

describe('Date', () => {
  test('addMonths', () => {
    expect(addMonths(new Date(2020, 0, 1), 2).getMonth()).toBe(2)
    expect(addMonths(new Date(2020, 0, 1), -2).getMonth()).toBe(10)
  })

  test('round', () => {
    expect(round(58.23464412)).toBe(58.23)
    expect(round(0.03572548844364937)).toBe(0.04)
    expect(round(0.03472548844364937, 8)).toBe(0.03472549)
    expect(parseFloat('0.03472548844364937')).toBe(0.03472548844364937)
  })
})
