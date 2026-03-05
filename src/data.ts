import fs from 'node:fs'
import path from 'node:path'
import { getKline } from 'binance-historical'
import { logger } from './logger'
import type { BinanceInterval, CandleStick } from './types'

export const readJsonData = (fileName: string): Array<CandleStick> => {
  const rawData = fs.readFileSync(fileName, 'utf-8')
  return JSON.parse(rawData)
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
    const dir = path.dirname(fileOutputName)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(fileOutputName, JSON.stringify(candles), 'utf-8')
    logger.info(
      `Downloaded ${candles.length} candles, saved to ${fileOutputName}`,
    )
    return candles
  }
  return readJsonData(fileOutputName)
}
