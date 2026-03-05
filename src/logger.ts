import * as winston from 'winston'

let logFile = 'all.log'
try {
  const { loadConfig } = await import('./config')
  logFile = loadConfig().paths.logFile
} catch {
  // Config unavailable — use default log file path
}

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf((info) => {
    const level = info.level.toUpperCase().padEnd(5)
    return `${info.timestamp} ${level} ${info.message}`
  }),
)

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
  winston.format.printf(
    (info) =>
      `${JSON.stringify({
        date: info.timestamp,
        level: info.level,
        message: info.message,
      })}`,
  ),
)

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: logFile,
      format: fileFormat,
    }),
  ],
})
