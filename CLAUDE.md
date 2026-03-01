# CLAUDE.md — AI Strategy Backtester

## Maintenance Rule (CRITICAL)

**After every iteration that modifies code, verify that this CLAUDE.md is still accurate.** If files were added/removed, strategies changed, config modified, commands updated, or architecture altered — update this file immediately. An outdated CLAUDE.md causes compounding errors across sessions.

---

## Project Overview

Crypto strategy backtester using Binance historical data. Entry point is a plain script (no HTTP server). Fetches historical OHLCV data, applies technical analysis strategies, and runs backtests. Results are persisted locally as JSON files. AI can generate strategies from natural language.

**Active stack:** Node 24 · TypeScript 5.9 · pnpm 10.30 · tsx · Vitest · Biome · Binance Historical API

---

## Architecture

```
strategies/                          # ALL strategies as JSON (no TS strategies)
├── pmax.json                        # PMAX trend following
├── supertrend.json                  # Supertrend trend following
├── turtle.json                      # Turtle Trading (breakout + trailing stop)
├── confluence.json                  # Multi-indicator scoring
├── rsi-macd-buy.json           # RSI oversold + MACD buy
└── breakout-volume.json             # Donchian breakout + volume
src/
├── backtest.ts             # Entry point: backtesting CLI (accepts --report, --config)
├── generate.ts             # CLI entry point for AI strategy generation
├── simulation.ts           # Simulation engine: worker pool, metrics
├── simulation.worker.ts    # Worker process for parallel backtesting
├── report.ts               # HTML report generation from simulation results
├── config.ts               # Config loader (reads config.json → AppConfig)
├── data.ts                 # OHLCV data fetching (Binance) and caching to disk
├── database.ts             # Synchronous JSON file store (plain fs, no lowdb)
├── trade.ts                # Buy/sell execution logic (used by simulation)
├── logger.ts               # Winston logger configuration
├── types.ts                # Core types (CandleStick, Position, DbSchema, BinanceInterval)
├── utils.ts                # Utilities (round, formatDate, addMonths)
├── strategies/
│   ├── registry.ts         # Strategy discovery (JSON-only, no builtin TS strategies)
│   ├── types.ts            # StrategyFn, Signal, StrategyName types
│   └── custom/             # Declarative JSON strategy engine
│       ├── types.ts        # Schema types (CustomStrategyDef, SignalBlock, Condition)
│       ├── catalog.ts      # Indicator name → wrapper fn + metadata (35 indicators)
│       ├── engine.ts       # JSON → StrategyFn interpreter + validator
│       └── loader.ts       # Discover & load JSON files from strategies/
└── indicators/             # Technical analysis — pure functions, no side effects
    ├── index.ts            # Indicator exports
    ├── primitives/         # Internal building blocks (sma, ema, rma, stdev, etc.)
    └── *.ts                # 30+ indicators (see Indicators Reference below)
```

---

## Dev Commands

```bash
pnpm backtest                 # Backtest matrix — generates report but does NOT open it
pnpm backtest:report          # Backtest matrix — generates report AND opens it in browser
pnpm backtest BTCUSDT 4h 2021-01-01 2022-01-01 pmax  # Targeted backtest
pnpm backtest --report BTCUSDT 4h 2021-01-01 2022-01-01 pmax  # Targeted + open report
pnpm report                   # Regenerate HTML report from existing db/ results
pnpm generate-strategy "..."  # AI-generate a custom strategy from natural language

pnpm test                     # Vitest unit tests (run once)
pnpm test:watch               # Vitest watch mode

pnpm lint                     # Biome check (lint + format check)
pnpm format                   # Biome format --write (auto-fix formatting)
pnpm format:check             # Biome format read-only (used in CI)
pnpm typecheck                # tsc --noEmit (type errors only)
pnpm fix                      # Biome check --write (auto-fix lint + format)

pnpm clean                    # Clean all generated data (db + data)
pnpm clean:db                 # Clean database only
pnpm clean:data               # Clean simulation data only
```

---

## Code Quality Workflow (CRITICAL)

**After every iteration — ALWAYS run:**

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm typecheck
```

This is mandatory. All four must pass:
1. `pnpm test` — Vitest unit tests
2. `pnpm lint` — Biome linting (code quality, suspicious patterns, performance)
3. `pnpm format:check` — Biome formatting consistency
4. `pnpm typecheck` — TypeScript type checking

**Never skip this step.** Run it after every code change, even small ones. Run it before suggesting the user commit or push. A broken push wastes time and blocks the CI.

---

## Configuration (`config.json`)

All configuration is externalized in `config.json` at the project root. Loaded by `src/config.ts` into an `AppConfig` object.

### Trading

| Field | Default | Description |
|---|---|---|
| `trading.from` / `trading.to` | `ETH` / `USDT` | Trading pair (combined as `ETHUSDT`) |
| `trading.period` | `4h` | Candlestick interval |
| `trading.fees` | `0.0026` | Trading fees (0.26%) |
| `trading.initialCapital` | `10000` | Starting capital |

### Simulation

| Field | Default | Description |
|---|---|---|
| `simulation.maxArraySize` | `1000` | Max candles kept in sliding window |
| `simulation.periods` | `["4h","6h","8h"]` | Timeframes to test |
| `simulation.strategies` | `["*"]` | Strategy names (`"*"` = all JSON files in `strategies/`) |
| `simulation.dates` | Date range array | Backtesting periods |

### Generation (AI Strategy Generation)

| Field | Default | Description |
|---|---|---|
| `generation.enabled` | `false` | Enable/disable AI strategy generation |
| `generation.model` | `mistral-small-latest` | OpenAI-compatible model |
| `generation.baseUrl` | `https://api.mistral.ai/v1` | API endpoint (OpenAI-compatible) |
| `generation.maxTokens` | `4096` | Max tokens |
| `generation.temperature` | `0.3` | Temperature |

---

## Environment Variables

Optional in `.env`:

```
GENERATION_API_KEY=   # API key for AI strategy generation (optional)
```

---

## Strategies (Declarative JSON — No TypeScript)

**All strategies are JSON-only.** There are no hardcoded TypeScript strategies. Each strategy is a `.json` file in `strategies/` that composes indicators from the catalog.

### Built-in Strategies

| Strategy | File | Description |
|----------|------|-------------|
| **PMAX** | `pmax.json` | EMA + ATR-based Supertrend — buy when pmax equals pmaxLong |
| **Supertrend** | `supertrend.json` | ATR-based trend-following — buy when close > supertrend |
| **Turtle** | `turtle.json` | 200-period Donchian breakout entry, 10-period trailing stop exit (uses `_type` aliasing) |
| **Confluence** | `confluence.json` | Multi-indicator scoring (PMAX + Supertrend + ADX + RSI + MACD + Volume + ATR + EMA). Score mode with threshold. |
| **RSI-MACD Buy** | `rsi-macd-buy.json` | RSI oversold + MACD histogram positive entry, RSI overbought exit |
| **Breakout Volume** | `breakout-volume.json` | Donchian breakout + ADX trending + volume confirmation |

The registry (`src/strategies/registry.ts`) discovers JSON files from `strategies/` — no builtin factories. Each returns `Signal = 'buy' | 'sell' | null`.

### JSON Strategy Format

```json
{
  "name": "kebab-case-name",
  "description": "What this strategy does",
  "indicators": { "rsi": { "period": 14 }, "macd": { "fast": 12, "slow": 26, "signal": 9 } },
  "buy": { "mode": "all", "conditions": [["rsi", "<", 35], ["macd.histogram", ">", 0]] },
  "sell": { "mode": "any", "conditions": [["rsi", ">", 70]] }
}
```

**Value references:** numbers (`35`), candle fields (`"close"`, `"high"`), indicators (`"rsi"`), object fields (`"macd.histogram"`), previous bar (`"rsi[-1]"`).

**Signal modes:** `all` (AND), `any` (OR), `score` (count-based with threshold + optional required conditions).

**`_type` aliasing:** Use `{"_type": "donchian", "period": 200}` to create multiple instances of the same indicator under different aliases (e.g., turtle uses `"breakout"` and `"exit"` both backed by donchian).

**35 indicators available** in the catalog (`src/strategies/custom/catalog.ts`): rsi, ema, supertrend, bollingerBands, obv, vwap, cmf, williamsR, cci, roc, ad, mfi, psar, ao, movingAverage, trix, volumeOscillator, macd, pmax, adx, donchian, stochastic, aroon, ichimoku, vortex, chandelier, keltner, starcBands, movingAverageEnvelope, atrTrailingStop, pmo, kdj, stochRsi, volumeSma, atrRatio.

**AI generation:** `pnpm generate-strategy "Buy when RSI < 30 and MACD histogram > 0"` — uses an OpenAI-compatible endpoint to generate, validate, and save a strategy JSON.

**Manual generation:** When the user asks to create or generate a strategy (without using `pnpm generate-strategy`), follow the spec in `STRATEGY_PROMPT.md` at the project root. It contains the full JSON schema, all 35 indicators with parameters and fields, value reference syntax, and examples. Write the JSON file directly to `strategies/` — it will be auto-discovered on the next backtest.

---

## Backtesting Architecture

- **Single backtest**: `pnpm backtest PAIR INTERVAL START END STRATEGY` — runs in main process
- **Full matrix**: `pnpm backtest` (no args) — generates all strategy x period x date combinations, pre-downloads data, then dispatches to a worker pool (`child_process.fork()`) with concurrency = CPU core count
- Results saved as `db/{pair}_{interval}_{strategy}_{start}_{end}.json`
- Report generated as `reports/report.html` with best strategy, averages, and full rankings

---

## Types

Core types in `src/types.ts`:

```typescript
type Position = 'buy' | 'sell'
type Signal = 'buy' | 'sell'                    // in strategies/types.ts
type StrategyName = string                       // builtin: pmax, supertrend, turtle, confluence + custom
type CandleStick = { open, high, close, low, volume, time }
type LastPosition = { date, type, price, capital, assets, tradeProfit? }
type DbSchema = { version, initialParameters, historicPosition, position, ...metrics }
```

---

## Important Notes for AI Assistance

- **No HTTP server** — Entry point is a plain script. State persisted locally in `./db/*.json`
- **All simulation data** is written to `./data/` and DB state to `./db/` — both ignored by git
- **Reports** are written to `./reports/` — also ignored by git
- **Immutability**: always create new objects, never mutate
- **No `console.log`**: use `logger` from `./logger` (winston)
- **Database** is a plain `fs.readFileSync`/`writeFileSync` JSON store (`src/database.ts`), no external DB dependency
- **Data fetching** uses `binance-historical` package to download OHLCV klines

---

## File Conventions

- `src/indicators/` — pure TA functions, no side effects, fully testable. Each indicator file contains the factory (stateful, `.result()`/`.update()`) and a simpler wrapper. Shared primitives (SMA, RMA, etc.) live in `primitives/`
- `src/strategies/` — orchestrate indicator results into buy/sell signals
- Tests live in `src/**/__tests__/` directories

---

## Indicators Reference

All indicators follow a **factory pattern** with stateful `.result()` / `.update()` methods. Most also export a simpler wrapper function for one-shot usage.

```typescript
// Factory: stateful, incremental updates
const indicator = IndicatorName({ candles, period })
indicator.result()        // → ResultItem[]
indicator.update(candle)  // → ResultItem | undefined

// Wrapper: one-shot array in → array out
indicatorName(candles, period) // → number[] or object[]
```

### Trend Indicators

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **EMA** | `ema.ts` | `period` |
| **SMA** | `primitives/sma.ts` | `period` |
| **WMA** | `primitives/wma.ts` | `period` |
| **WWMA** | `primitives/wwma.ts` | `period` |
| **MACD** | `macd.ts` | `fastPeriod=12`, `slowPeriod=26`, `signalPeriod=9` |
| **ADX** | `adx.ts` | `period=14` |
| **Supertrend** | `supertrend.ts` | `period=10`, `multiplier=3` |
| **PMAX** | `pmax.ts` | `emaPeriod=10`, `atrPeriod=10`, `multiplier=3` |
| **Aroon** | `aroon.ts` | `period=25` |
| **Ichimoku** | `ichimoku.ts` | `conversionPeriod=9`, `basePeriod=26`, `spanPeriod=52` |
| **TRIX** | `trix.ts` | `period` |
| **Vortex** | `vortex.ts` | `period=14` |
| **Heikin Ashi** | `heikinAshi.ts` | (none) |
| **PSAR** | `psar.ts` | `step=0.02`, `max=0.2` |

### Momentum / Oscillators

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **RSI** | `rsi.ts` | `period=14` |
| **Stochastic** | `stochastic.ts` | `period=14`, `kPeriod=3`, `dPeriod=3` |
| **Stochastic RSI** | `stochRsi.ts` | `rsiPeriod`, `stochasticPeriod`, `kPeriod`, `dPeriod` |
| **Williams %R** | `williamsr.ts` | `period=14` |
| **Williams Vix** | `williams.ts` | `lookBackPeriodStDevHigh=22`, `bbLength=20` |
| **CCI** | `cci.ts` | `period=20` |
| **ROC** | `roc.ts` | `period` |
| **AO** | `ao.ts` | `fastPeriod=5`, `slowPeriod=34` |
| **KDJ** | `kdj.ts` | `rsvPeriod=9`, `kPeriod=3`, `dPeriod=3` |
| **PMO** | `pmo.ts` | `period` |
| **Pring Special K** | `pringSpecialK.ts` | (internal periods) |
| **RAVI** | `ravi.ts` | `fastPeriod=7`, `slowPeriod=65` |

### Volatility / Bands

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **ATR** | `atr.ts` | `period=14` |
| **Bollinger Bands** | `bollingerBands.ts` | `period=20`, `stdDev=2` |
| **Keltner** | `keltner.ts` | `emaPeriod=20`, `atrPeriod=10`, `multiplier=1` |
| **Donchian** | `donchian.ts` | `period=20` |
| **STARC Bands** | `starcBands.ts` | `smaPeriod=5`, `atrPeriod=15`, `multiplier=1.33` |
| **Chandelier** | `chandelier.ts` | `period=22`, `multiplier=3` |
| **ATR Trailing Stop** | `atrTrailingStop.ts` | `period=14`, `multiplier=3` |
| **MA Envelope** | `movingAverageEnvelope.ts` | `period=20`, `percentage=2.5` |

### Volume Indicators

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **OBV** | `obv.ts` | (none) |
| **MFI** | `mfi.ts` | `period=14` |
| **CMF** | `cmf.ts` | `period=20` |
| **AD** | `ad.ts` | (none) |
| **VWAP** | `vwap.ts` | (none) |
| **Volume Oscillator** | `volumeOscillator.ts` | `fastPeriod=5`, `slowPeriod=10` |

### Catalog-Only (Composite Indicators)

These indicators exist only in the strategy catalog (`src/strategies/custom/catalog.ts`), not as standalone indicator files. They compose primitives for use in JSON strategies.

| Indicator | Catalog Name | Key Parameters | Output |
|-----------|-------------|----------------|--------|
| **Volume SMA** | `volumeSma` | `period=20` | SMA applied to volume (not close price) |
| **ATR Ratio** | `atrRatio` | `atrPeriod=14`, `smaPeriod=50` | ATR / SMA(ATR) — volatility regime filter |

### Other

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **Candlestick** | `candlestick.ts` | (none) — pattern recognition (hammer, engulfing, kicker, etc.) |
| **Elder Ray** | `elderRay.ts` | `period=13` |
| **Shinohara** | `shinohara.ts` | `period=26` |
| **Twiggs** | `twiggs.ts` | `period` |
| **Lowest Low** | `lowestLow.ts` | `period` |
| **Moving Average** | `movingAverage.ts` | `period=20`, `type='ema'` |
