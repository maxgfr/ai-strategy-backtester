import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import 'dotenv/config'
import { loadConfig } from './config'
import { logger } from './logger'
import { catalog } from './strategies/custom/catalog'
import { validateStrategy } from './strategies/custom/engine'
import type { CustomStrategyDef } from './strategies/custom/types'

function buildCatalogDescription(): string {
  const lines: string[] = []
  for (const [name, entry] of Object.entries(catalog)) {
    const params = entry.params.map((p) => `${p.name}=${p.default}`).join(', ')
    if (entry.outputType === 'object' && entry.fields) {
      lines.push(
        `- ${name}(${params}) → {${entry.fields.join(', ')}} (default: ${entry.defaultField})`,
      )
    } else {
      lines.push(`- ${name}(${params}) → number`)
    }
  }
  return lines.join('\n')
}

function buildSystemPrompt(): string {
  return `You are a trading strategy generator. You produce JSON strategy definitions for a crypto backtester.

## Output Schema

\`\`\`json
{
  "name": "kebab-case-name",
  "description": "Short description of the strategy",
  "indicators": {
    "indicatorName": { "param1": value, "param2": value }
  },
  "buy": {
    "mode": "all" | "any" | "score",
    "conditions": [["valueRef", "op", "valueRef"], ...],
    "threshold": number,       // only for mode "score"
    "required": [...],         // only for mode "score", optional
    "scored": [...]            // only for mode "score"
  },
  "sell": {
    "mode": "all" | "any" | "score",
    "conditions": [["valueRef", "op", "valueRef"], ...]
  }
}
\`\`\`

## Value References

- Numbers: \`30\`, \`0.5\`
- Candle fields: \`"close"\`, \`"high"\`, \`"low"\`, \`"open"\`, \`"volume"\`
- Indicator (number output): \`"rsi"\`, \`"ema"\`
- Indicator field (object output): \`"macd.histogram"\`, \`"adx.adx"\`
- Previous bar: \`"rsi[-1]"\`, \`"donchian.upper[-1]"\`

## Operators

\`>\`, \`<\`, \`>=\`, \`<=\`, \`==\`, \`!=\`

## Available Indicators

${buildCatalogDescription()}

## Signal Modes

- **all**: ALL conditions must be true
- **any**: at least ONE condition must be true
- **score**: required conditions must ALL pass, then count scored conditions >= threshold

## Examples

### RSI + MACD Reversal
\`\`\`json
{
  "name": "rsi-macd-reversal",
  "description": "Buy RSI oversold + MACD momentum, sell RSI overbought",
  "indicators": { "rsi": { "period": 14 }, "macd": { "fast": 12, "slow": 26, "signal": 9 }, "ema": { "period": 50 } },
  "buy": { "mode": "all", "conditions": [["rsi", "<", 35], ["macd.histogram", ">", 0], ["close", ">", "ema"]] },
  "sell": { "mode": "any", "conditions": [["rsi", ">", 70]] }
}
\`\`\`

### Breakout + Volume
\`\`\`json
{
  "name": "breakout-volume",
  "description": "Donchian breakout + ADX trending + volume confirmation",
  "indicators": { "donchian": { "period": 50 }, "adx": { "period": 14 }, "volumeOscillator": { "fastPeriod": 5, "slowPeriod": 20 } },
  "buy": { "mode": "all", "conditions": [["close", ">", "donchian.upper[-1]"], ["adx.adx", ">", 25], ["volumeOscillator", ">", 0]] },
  "sell": { "mode": "any", "conditions": [["close", "<", "donchian.lower[-1]"]] }
}
\`\`\`

## Rules

1. Only use indicators from the catalog above
2. Only reference fields that exist for each indicator
3. Use kebab-case for the strategy name
4. Output ONLY the JSON object, no explanation
5. Every indicator referenced in conditions MUST be declared in "indicators"
`
}

async function generateStrategy(description: string): Promise<void> {
  const config = loadConfig()

  if (!config.generation.enabled) {
    logger.error(
      'Generation is disabled. Set generation.enabled=true in config.json',
    )
    process.exit(1)
  }

  if (!config.generation.apiKey) {
    logger.error('Missing GENERATION_API_KEY environment variable')
    process.exit(1)
  }

  logger.info(`Generating strategy from: "${description}"`)

  const response = await fetch(
    `${config.generation.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.generation.apiKey}`,
      },
      body: JSON.stringify({
        model: config.generation.model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: description },
        ],
        max_tokens: config.generation.maxTokens,
        temperature: config.generation.temperature,
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    logger.error(`API error ${response.status}: ${body}`)
    process.exit(1)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const content = data.choices?.[0]?.message?.content ?? ''

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    logger.error('No JSON found in AI response')
    logger.info(`Raw response: ${content}`)
    process.exit(1)
  }

  let def: CustomStrategyDef
  try {
    def = JSON.parse(jsonMatch[0]) as CustomStrategyDef
  } catch {
    logger.error(`Failed to parse JSON: ${jsonMatch[0]}`)
    process.exit(1)
  }

  const { valid, errors } = validateStrategy(def)
  if (!valid) {
    logger.error(`Generated strategy is invalid:\n  - ${errors.join('\n  - ')}`)
    logger.info(`Raw JSON: ${JSON.stringify(def, null, 2)}`)
    process.exit(1)
  }

  const outPath = resolve(process.cwd(), 'strategies', `${def.name}.json`)
  writeFileSync(outPath, JSON.stringify(def, null, 2), 'utf-8')
  logger.info(`Strategy saved to ${outPath}`)
  logger.info(`Name: ${def.name}`)
  logger.info(`Description: ${def.description}`)
  logger.info(`Indicators: ${Object.keys(def.indicators).join(', ')}`)
  logger.info(
    `To backtest: pnpm backtest ETHUSDT 4h 2024-01-01 2025-01-01 ${def.name}`,
  )
}

const description = process.argv.slice(2).join(' ')
if (!description) {
  logger.error(
    'Usage: pnpm generate-strategy "Buy when RSI < 30 and MACD histogram > 0"',
  )
  process.exit(1)
}

generateStrategy(description)
