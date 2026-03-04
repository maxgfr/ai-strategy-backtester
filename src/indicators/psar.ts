import type { Candle } from './primitives/types'

interface PSARResultItem {
  time: Candle['time']
  value: number
}

export function PSAR({
  candles,
  step = 0.02,
  max = 0.2,
}: {
  candles: Candle[]
  step?: number
  max?: number
}) {
  let result: PSARResultItem[] = []

  let sar: number
  let extreme: number
  let accel = step
  let up = true
  let prevLow: number | undefined
  let prevHigh: number | undefined
  let prevSar: number | undefined

  let isFirst = true

  // Snapshot for update() rollback
  let snapshot: {
    sar: number
    extreme: number
    accel: number
    up: boolean
    prevLow: number | undefined
    prevHigh: number | undefined
    prevSar: number | undefined
    isFirst: boolean
  }

  function saveSnapshot() {
    snapshot = {
      sar,
      extreme,
      accel,
      up,
      prevLow,
      prevHigh,
      prevSar,
      isFirst,
    }
  }

  function restoreSnapshot() {
    ;({ sar, extreme, accel, up, prevLow, prevHigh, prevSar, isFirst } =
      snapshot)
  }

  function calculate(candle: Candle): PSARResultItem | undefined {
    const high = candle.high ?? candle.close
    const low = candle.low ?? candle.close

    if (isFirst) {
      isFirst = false
      prevHigh = high
      prevLow = low
      return undefined
    }

    if (prevSar === undefined) {
      sar = prevLow ?? low
      extreme = prevHigh ?? high
      up = true
      accel = step
    } else {
      sar = sar + accel * (extreme - sar)

      if (up) {
        sar = Math.min(sar, prevLow ?? low, low)
        if (high > extreme) {
          extreme = high
          accel = Math.min(accel + step, max)
        }
      } else {
        sar = Math.max(sar, prevHigh ?? high, high)
        if (low < extreme) {
          extreme = low
          accel = Math.min(accel + step, max)
        }
      }

      if ((up && low < sar) || (!up && high > sar)) {
        accel = step
        sar = extreme
        up = !up
        extreme = up ? high : low
      }
    }

    prevSar = sar
    prevHigh = high
    prevLow = low

    return { time: candle.time, value: sar }
  }

  for (const item of candles) {
    saveSnapshot()
    const res = calculate(item)
    if (res) result.push(res)
  }

  return {
    result: () => result,
    update: (candle: Candle) => {
      if (result.length && result[result.length - 1].time === candle.time) {
        result = result.slice(0, -1)
        restoreSnapshot()
      }
      saveSnapshot()
      const item = calculate(candle)
      if (item) result.push(item)
      return item
    },
  }
}

export function psar(
  candles: Array<{ high: number; low: number; close: number }>,
  step = 0.02,
  max = 0.2,
): number[] {
  const mapped = candles.map((c, i) => ({
    time: i,
    close: c.close,
    high: c.high,
    low: c.low,
  }))
  return PSAR({ candles: mapped, step, max })
    .result()
    .map((x) => x.value)
}
