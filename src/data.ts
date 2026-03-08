import fs from 'node:fs'
import path from 'node:path'
import { getKline } from 'binance-historical'
import { logger } from './logger'
import type { BinanceInterval, CandleStick } from './types'

function validateCandles(candles: CandleStick[]): CandleStick[] {
  if (candles.length === 0) {
    logger.warn('Empty candle data received')
    return candles
  }

  const validated: CandleStick[] = []
  let prevTime = -1

  for (const c of candles) {
    if (
      Number.isNaN(c.open) ||
      Number.isNaN(c.high) ||
      Number.isNaN(c.low) ||
      Number.isNaN(c.close) ||
      Number.isNaN(c.volume)
    ) {
      logger.warn(`Skipping candle with NaN values at time ${c.time}`)
      continue
    }
    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0) {
      logger.warn(`Skipping candle with non-positive prices at time ${c.time}`)
      continue
    }
    // Fix OHLC inconsistency instead of discarding (immutable — create new object)
    let { high, low } = c
    if (high < Math.max(c.open, c.close) || low > Math.min(c.open, c.close)) {
      high = Math.max(c.open, high, c.close)
      low = Math.min(c.open, low, c.close)
    }
    // Skip duplicate or out-of-order timestamps
    if (c.time <= prevTime) {
      continue
    }
    prevTime = c.time
    validated.push({ ...c, high, low })
  }

  const skipped = candles.length - validated.length
  if (skipped > 0) {
    logger.warn(
      `Filtered ${skipped} invalid candles (${validated.length} remaining)`,
    )
  }

  return validated
}

export const readJsonData = (fileName: string): Array<CandleStick> => {
  const rawData = fs.readFileSync(fileName, 'utf-8')
  return validateCandles(JSON.parse(rawData))
}

export const readAndLoadData = async (
  interval: BinanceInterval,
  pair: string,
  startDate: Date,
  endDate: Date,
  fileOutputName: string,
): Promise<Array<CandleStick>> => {
  if (!fs.existsSync(fileOutputName)) {
    logger.info(
      `Data file not found, downloading ${pair} ${interval} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    )
    const klines = await getKline(pair, interval, startDate, endDate)
    const candles: Array<CandleStick> = klines.map((k) => ({
      open: Number.parseFloat(k.open),
      high: Number.parseFloat(k.high),
      low: Number.parseFloat(k.low),
      close: Number.parseFloat(k.close),
      volume: Number.parseFloat(k.volume),
      time: Math.floor(k.openTime / 1000),
    }))
    const validated = validateCandles(candles)
    const dir = path.dirname(fileOutputName)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(fileOutputName, JSON.stringify(validated), 'utf-8')
    logger.info(
      `Downloaded ${validated.length} candles, saved to ${fileOutputName}`,
    )
    return validated
  }
  return readJsonData(fileOutputName)
}
