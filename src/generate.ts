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

function buildSystemPrompt(shortTerm: boolean): string {
  const categoryGuidance = shortTerm
    ? `
## IMPORTANT: Short-Term Strategy Mode

You are generating a SHORT-TERM strategy for 15m/30m/1h timeframes.

**Naming:** The strategy name MUST start with \`st-\` (e.g., \`st-my-strategy\`).

**Parameter tuning:** Use SHORTER indicator periods for faster signals:
- RSI: period 7 (not 14)
- MACD: fast 6, slow 13, signal 5 (not 12/26/9)
- ADX: period 10 (not 14)
- Supertrend: atrPeriod 5, multiplier 2 (not 10/3)
- Bollinger Bands: period 12 (not 20)
- Keltner: maPeriod 10 (not 20)
- volumeSma: period 10 (not 20)
- CMF: period 10 (not 20)
- MFI: period 7 (not 14)
- ROC: period 5 (not 12)
- StochRSI: rsiPeriod 7, stochasticPeriod 7 (not 14/14)
- KDJ: rsvPeriod 5, kPeriod 2, dPeriod 2 (not 9/3/3)
- PSAR: step 0.03, max 0.25 (not 0.02/0.2)
- Donchian: period 10-20 (not 50-200)
- EMA: period 5-13 (not 20-50)

**Style:** Focus on scalping, mean reversion, quick momentum catches. Use volume confirmation (volumeSma with period 10).
`
    : `
## Long-Term Strategy Mode

You are generating a LONG-TERM strategy for 4h/6h/8h timeframes.

**Naming:** Use standard kebab-case name (no \`st-\` prefix).

**Parameters:** Use standard indicator defaults. Focus on trend following, breakouts, swing reversals.
`

  return `You are a trading strategy generator. You produce JSON strategy definitions for a crypto backtester.

${categoryGuidance}

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
    "scored": [...]            // only for mode "score" (NOT "conditions")
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

## Indicator Aliasing

Use \`_type\` to create multiple instances: \`{"_type": "ema", "period": 5}\` under alias \`"emaFast"\`.
**Alias names must be letters only** (no numbers): \`emaSlow\` not \`ema50\`.

## Available Indicators

${buildCatalogDescription()}

## Signal Modes

- **all**: ALL conditions must be true (use \`conditions\` array)
- **any**: at least ONE condition must be true (use \`conditions\` array)
- **score**: required conditions must ALL pass, then count scored conditions >= threshold (use \`scored\` array, NOT \`conditions\`)

## Rules

1. Only use indicators from the catalog above
2. Only reference fields that exist for each indicator
3. Use kebab-case for the strategy name${shortTerm ? '\n4. Name MUST start with `st-`' : ''}
4. Output ONLY the JSON object, no explanation
5. Every indicator referenced in conditions MUST be declared in "indicators"
6. Alias names: letters only [a-zA-Z]+ (no numbers)
7. Score mode: use \`scored\` array, not \`conditions\`
`
}

async function generateStrategy(
  description: string,
  shortTerm: boolean,
): Promise<void> {
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

  const category = shortTerm ? 'short-term' : 'long-term'
  logger.info(`Generating ${category} strategy from: "${description}"`)

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
          { role: 'system', content: buildSystemPrompt(shortTerm) },
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

  // Validate st- prefix for short-term strategies
  if (shortTerm && !def.name.startsWith('st-')) {
    logger.warn(
      `Short-term strategy name "${def.name}" missing st- prefix, adding it`,
    )
    def = { ...def, name: `st-${def.name}` }
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
  logger.info(`Category: ${category}`)
  logger.info(`Description: ${def.description}`)
  logger.info(`Indicators: ${Object.keys(def.indicators).join(', ')}`)

  const exampleInterval = shortTerm ? '1h' : '4h'
  const exampleDates = shortTerm
    ? '2025-06-01 2026-02-01'
    : '2024-01-01 2025-01-01'
  logger.info(
    `To backtest: pnpm backtest ETHUSDT ${exampleInterval} ${exampleDates} ${def.name}`,
  )
}

const args = process.argv.slice(2)

const shortTermIndex = args.indexOf('--short-term')
const shortTerm = shortTermIndex !== -1
if (shortTermIndex !== -1) {
  args.splice(shortTermIndex, 1)
}

const description = args.join(' ')
if (!description) {
  logger.error(
    'Usage: pnpm generate-strategy [--short-term] "Buy when RSI < 30 and MACD histogram > 0"',
  )
  process.exit(1)
}

generateStrategy(description, shortTerm)
