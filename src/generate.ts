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

## Strategy Mode

You are generating a strategy that automatically adapts its indicator periods based on the timeframe it runs on.
The backtester will auto-scale periods: shorter timeframes get larger periods, longer timeframes get smaller periods.
Define all indicator periods for a 4h reference timeframe — the engine handles the rest.

**Naming:** Use standard kebab-case name (e.g., "my-strategy"). No prefixes needed.

**Parameters:** Use standard indicator defaults for 4h reference. Focus on trend following, breakouts, swing reversals, or mean reversion.

**Shorting:** You can optionally add "short" and "cover" signal blocks (both must be present or both absent). Add a "leverage" field (1-125) for shorting strategies.

## Output Schema

\`\`\`json
{
  "name": "kebab-case-name",
  "description": "Short description of the strategy",
  "leverage": 1,
  "indicators": {
    "indicatorName": { "param1": value, "param2": value }
  },
  "buy": {
    "mode": "all" | "any" | "score",
    "conditions": [["valueRef", "op", "valueRef"], ...],
    "threshold": number,
    "required": [...],
    "scored": [...]
  },
  "sell": {
    "mode": "all" | "any" | "score",
    "conditions": [["valueRef", "op", "valueRef"], ...]
  },
  "short": { ... },
  "cover": { ... }
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
3. Use kebab-case for the strategy name
4. Output ONLY the JSON object, no explanation
5. Every indicator referenced in conditions MUST be declared in "indicators"
6. Alias names: letters only [a-zA-Z]+ (no numbers)
7. Score mode: use \`scored\` array, not \`conditions\`
8. Both short and cover must be present together or both absent

## Anti-Patterns (AVOID)

- Too many AND conditions on buy (5+) = almost never triggers = 0 trades. Keep buy to 2-4 conditions max.
- Overlapping buy/sell thresholds (buy RSI < 50, sell RSI > 45) — sell takes priority, blocks buys.
- Aggressive sell exits (RSI > 60) cut winners short. Use RSI > 70-75 for sell.
- Score threshold too low (3/10) = noisy trades. Use threshold >= 50% of scored conditions.
- Missing trend filter on RSI-based strategies — gets destroyed in bear markets. Add Supertrend or ADX gate.
- No volume confirmation on breakout strategies — many false breakouts. Add volumeSma or cmf.
- Same RSI threshold for buy and sell (buy < 30, sell > 30) = constant whipsaw. Use asymmetric thresholds.

## Design Tips

- Simple > Complex: best strategy has 2 buy + 1 sell condition, not 6+6.
- Rare signals win: RSI < 35 + MACD > 0 = only 9 trades in 4 years but 249% profit.
- ADX > 20 filters out ranging/choppy markets.
- Buy-the-dip in uptrend works well: Supertrend UP + RSI pullback + MACD positive.
- Let winners run: tight sell conditions kill great entries.

## Typical Threshold Ranges

- rsi: oversold < 30 (aggressive < 35), overbought > 70
- stochRsi.k: oversold < 20, overbought > 80
- williamsR: oversold < -80, overbought > -20
- adx.adx: trending > 20, strong > 25, ranging < 20
- cmf: accumulation > 0.05, distribution < -0.1
- kdj.j: oversold < 0 (extreme < 20), overbought > 80
- macd.histogram: bullish > 0, bearish < 0
- bollingerBands.bbr: below lower band < 0, above upper band > 1, middle = 0.5
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

const args = process.argv.slice(2)
const description = args.join(' ')
if (!description) {
  logger.error(
    'Usage: pnpm generate-strategy "Buy when RSI < 30 and MACD histogram > 0"',
  )
  process.exit(1)
}

generateStrategy(description)
