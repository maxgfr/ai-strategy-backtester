import * as winston from 'winston'
import { loadConfig } from './config'

const config = loadConfig()

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'DD/MM/YYYY HH:mm:ss',
    }),
    winston.format.printf(
      (info) =>
        `${JSON.stringify({
          date: info.timestamp,
          level: info.level,
          message: info.message,
          ...(info.splat !== undefined ? { splat: `${info.splat}` } : {}),
        })},`,
    ),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: config.paths.logFile }),
  ],
})
