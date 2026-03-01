import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './logger'
import type { DbSchema } from './types'
import { round } from './utils'

type ParsedFilename = {
  pair: string
  interval: string
  strategy: string
  startDate: string
  endDate: string
}

type SimulationResult = ParsedFilename & {
  data: DbSchema
}

type StrategyAverage = {
  strategy: string
  count: number
  avgInitialCapital: number
  avgFinalCapital: number
  avgTrades: number
  avgProfitPercent: number
  avgWinRate: number
  avgSharpe: number
  avgMaxDrawdown: number
}

function parseFilename(filename: string): ParsedFilename | null {
  const name = filename.replace('.json', '')
  const parts = name.split('_')
  if (parts.length < 5) return null
  if (parts.length !== 5) return null

  return {
    pair: parts[0],
    interval: parts[1],
    strategy: parts[2],
    startDate: parts[3],
    endDate: parts[4],
  }
}

function loadResults(dbFolder: string): SimulationResult[] {
  const files = readdirSync(dbFolder).filter((f) => f.endsWith('.json'))
  const results: SimulationResult[] = []

  for (const file of files) {
    const parsed = parseFilename(file)
    if (!parsed) continue

    try {
      const raw = readFileSync(resolve(dbFolder, file), 'utf-8')
      const data = JSON.parse(raw) as DbSchema
      if (data.lastPositionMoney === undefined) continue
      results.push({ ...parsed, data })
    } catch {
      logger.warn(`Skipping unreadable file: ${file}`)
    }
  }

  return results
}

function parsePercent(value: string | undefined): number {
  if (!value) return 0
  return Number.parseFloat(value.replace('%', ''))
}

function computeStrategyAverages(
  results: SimulationResult[],
): StrategyAverage[] {
  const grouped = new Map<string, SimulationResult[]>()
  for (const r of results) {
    const existing = grouped.get(r.strategy) ?? []
    existing.push(r)
    grouped.set(r.strategy, existing)
  }

  const averages: StrategyAverage[] = []
  for (const [strategy, group] of grouped) {
    const count = group.length
    const avgInitialCapital =
      group.reduce((s, r) => s + (r.data.initialCapital ?? 0), 0) / count
    const avgFinalCapital =
      group.reduce((s, r) => s + (r.data.lastPositionMoney ?? 0), 0) / count
    const avgTrades =
      group.reduce((s, r) => s + (r.data.nbPosition ?? 0), 0) / count
    const avgProfitPercent =
      group.reduce((s, r) => s + parsePercent(r.data.percentageProfit), 0) /
      count
    const avgWinRate =
      group.reduce((s, r) => s + parsePercent(r.data.percentagePosition), 0) /
      count
    const avgSharpe =
      group.reduce((s, r) => s + (r.data.sharpeRatio ?? 0), 0) / count
    const avgMaxDrawdown =
      group.reduce((s, r) => s + parsePercent(r.data.maxDrawdown), 0) / count

    averages.push({
      strategy,
      count,
      avgInitialCapital: round(avgInitialCapital),
      avgFinalCapital: round(avgFinalCapital),
      avgTrades: round(avgTrades),
      avgProfitPercent: round(avgProfitPercent),
      avgWinRate: round(avgWinRate),
      avgSharpe: round(avgSharpe),
      avgMaxDrawdown: round(avgMaxDrawdown),
    })
  }

  return averages.sort((a, b) => b.avgFinalCapital - a.avgFinalCapital)
}

function colorClass(value: number): string {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}

function generateHtml(results: SimulationResult[]): string {
  const sorted = [...results].sort(
    (a, b) => (b.data.lastPositionMoney ?? 0) - (a.data.lastPositionMoney ?? 0),
  )
  const best = sorted[0]
  const averages = computeStrategyAverages(results)
  const pair = best?.pair ?? 'N/A'
  const now = new Date().toLocaleString()

  const bestCard = best
    ? `<div class="best-card">
        <h2>Best Strategy</h2>
        <div class="best-grid">
          <div class="best-item"><span class="label">Strategy</span><span class="value">${best.strategy.toUpperCase()}</span></div>
          <div class="best-item"><span class="label">Period</span><span class="value">${best.interval}</span></div>
          <div class="best-item"><span class="label">Dates</span><span class="value">${best.startDate} → ${best.endDate}</span></div>
          <div class="best-item"><span class="label">Initial Capital</span><span class="value">$${round(best.data.initialCapital ?? 0).toLocaleString()}</span></div>
          <div class="best-item highlight"><span class="label">Final Capital</span><span class="value">$${round(best.data.lastPositionMoney ?? 0).toLocaleString()}</span></div>
          <div class="best-item"><span class="label">Profit vs HODL</span><span class="value ${colorClass(best.data.profit ?? 0)}">${best.data.percentageProfit ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Win Rate</span><span class="value">${best.data.percentagePosition ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Profit Factor</span><span class="value">${best.data.profitFactor ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Max Drawdown</span><span class="value">${best.data.maxDrawdown ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Sharpe Ratio</span><span class="value">${best.data.sharpeRatio ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Trades</span><span class="value">${best.data.nbPosition ?? 0}</span></div>
          <div class="best-item"><span class="label">Avg Trade Profit</span><span class="value ${colorClass(best.data.avgTradeProfit ?? 0)}">$${best.data.avgTradeProfit ?? 0}</span></div>
        </div>
      </div>`
    : ''

  const avgRows = averages
    .map(
      (a) =>
        `<tr>
          <td><strong>${a.strategy.toUpperCase()}</strong></td>
          <td>${a.count}</td>
          <td>$${a.avgInitialCapital.toLocaleString()}</td>
          <td>$${a.avgFinalCapital.toLocaleString()}</td>
          <td>${a.avgTrades}</td>
          <td class="${colorClass(a.avgProfitPercent)}">${a.avgProfitPercent}%</td>
          <td>${a.avgWinRate}%</td>
          <td>${a.avgSharpe}</td>
          <td>${a.avgMaxDrawdown}%</td>
        </tr>`,
    )
    .join('\n')

  const fullRows = sorted
    .map((r, i) => {
      const profit = r.data.profit ?? 0
      const beatsHodl = profit > 0
      return `<tr class="${beatsHodl ? 'beats-hodl' : 'loses-hodl'}">
          <td>${i + 1}</td>
          <td>${r.strategy.toUpperCase()}</td>
          <td>${r.interval}</td>
          <td>${r.startDate} → ${r.endDate}</td>
          <td>$${round(r.data.initialCapital ?? 0).toLocaleString()}</td>
          <td>$${round(r.data.lastPositionMoney ?? 0).toLocaleString()}</td>
          <td class="${colorClass(profit)}">${r.data.percentageProfit ?? 'N/A'}</td>
          <td>${r.data.percentagePosition ?? 'N/A'}</td>
          <td>${r.data.profitFactor ?? 'N/A'}</td>
          <td>${r.data.maxDrawdown ?? 'N/A'}</td>
          <td>${r.data.sharpeRatio ?? 'N/A'}</td>
          <td>${r.data.nbPosition ?? 0}</td>
        </tr>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backtest Report — ${pair}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e1e4e8; padding: 2rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
    .header { margin-bottom: 2rem; border-bottom: 1px solid #30363d; padding-bottom: 1rem; }
    .header-meta { color: #8b949e; font-size: 0.9rem; }
    .best-card { background: linear-gradient(135deg, #1a2332, #1e293b); border: 1px solid #2d6a4f; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    .best-card h2 { color: #40c057; margin-bottom: 1rem; font-size: 1.3rem; }
    .best-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .best-item { background: #161b22; border-radius: 8px; padding: 0.75rem 1rem; }
    .best-item .label { display: block; font-size: 0.75rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; }
    .best-item .value { display: block; font-size: 1.1rem; font-weight: 600; margin-top: 0.25rem; }
    .best-item.highlight { border: 1px solid #40c057; }
    h2.section-title { font-size: 1.2rem; margin: 2rem 0 1rem; color: #c9d1d9; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #161b22; color: #8b949e; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; padding: 0.75rem; text-align: left; border-bottom: 2px solid #30363d; cursor: pointer; user-select: none; white-space: nowrap; }
    th:hover { color: #58a6ff; }
    th .sort-arrow { margin-left: 4px; font-size: 0.6rem; }
    td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #21262d; }
    tr:hover { background: #161b22; }
    .positive { color: #40c057; }
    .negative { color: #f03e3e; }
    .beats-hodl { border-left: 3px solid #40c057; }
    .loses-hodl { border-left: 3px solid #f03e3e; }
    .table-wrapper { overflow-x: auto; background: #0d1117; border-radius: 8px; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Backtest Report</h1>
    <div class="header-meta">Pair: ${pair} &middot; Generated: ${now} &middot; ${results.length} simulations</div>
  </div>

  ${bestCard}

  <h2 class="section-title">Strategy Averages</h2>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Strategy</th>
          <th>Simulations</th>
          <th>Avg Initial Capital</th>
          <th>Avg Final Capital</th>
          <th>Avg Trades</th>
          <th>Avg Profit vs HODL</th>
          <th>Avg Win Rate</th>
          <th>Avg Sharpe</th>
          <th>Avg Max Drawdown</th>
        </tr>
      </thead>
      <tbody>
        ${avgRows}
      </tbody>
    </table>
  </div>

  <h2 class="section-title">Full Rankings</h2>
  <div class="table-wrapper">
    <table id="rankings">
      <thead>
        <tr>
          <th data-col="0" data-type="number">Rank <span class="sort-arrow"></span></th>
          <th data-col="1" data-type="string">Strategy <span class="sort-arrow"></span></th>
          <th data-col="2" data-type="string">Period <span class="sort-arrow"></span></th>
          <th data-col="3" data-type="string">Dates <span class="sort-arrow"></span></th>
          <th data-col="4" data-type="money">Initial Capital <span class="sort-arrow"></span></th>
          <th data-col="5" data-type="money">Final Capital <span class="sort-arrow"></span></th>
          <th data-col="6" data-type="percent">Profit vs HODL <span class="sort-arrow"></span></th>
          <th data-col="7" data-type="percent">Win Rate <span class="sort-arrow"></span></th>
          <th data-col="8" data-type="number">Profit Factor <span class="sort-arrow"></span></th>
          <th data-col="9" data-type="percent">Max Drawdown <span class="sort-arrow"></span></th>
          <th data-col="10" data-type="number">Sharpe <span class="sort-arrow"></span></th>
          <th data-col="11" data-type="number">Trades <span class="sort-arrow"></span></th>
        </tr>
      </thead>
      <tbody>
        ${fullRows}
      </tbody>
    </table>
  </div>

  <script>
    (function() {
      var table = document.getElementById('rankings');
      var thead = table.querySelector('thead');
      var tbody = table.querySelector('tbody');
      var headers = thead.querySelectorAll('th');
      var currentSort = { col: -1, asc: true };

      function parseVal(td, type) {
        var text = td.textContent.trim();
        if (type === 'money') return parseFloat(text.replace(/[$,]/g, '')) || 0;
        if (type === 'percent') return parseFloat(text.replace('%', '')) || 0;
        if (type === 'number') {
          var n = parseFloat(text);
          return isNaN(n) ? 0 : n;
        }
        return text.toLowerCase();
      }

      headers.forEach(function(th) {
        th.addEventListener('click', function() {
          var col = parseInt(th.getAttribute('data-col'));
          var type = th.getAttribute('data-type');
          var asc = currentSort.col === col ? !currentSort.asc : true;
          currentSort = { col: col, asc: asc };

          var rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort(function(a, b) {
            var va = parseVal(a.children[col], type);
            var vb = parseVal(b.children[col], type);
            if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
            return asc ? va - vb : vb - va;
          });
          rows.forEach(function(row) { tbody.appendChild(row); });

          headers.forEach(function(h) {
            h.querySelector('.sort-arrow').textContent = '';
          });
          th.querySelector('.sort-arrow').textContent = asc ? '\u25B2' : '\u25BC';
        });
      });
    })();
  </script>
</body>
</html>`
}

export function generateReport(): string | null {
  const dbFolder = resolve(process.cwd(), 'db')
  const outputDir = resolve(process.cwd(), 'reports')
  const outputPath = resolve(outputDir, 'report.html')

  logger.info('Loading simulation results...')
  const results = loadResults(dbFolder)

  if (results.length === 0) {
    logger.error('No simulation results found in db/. Run pnpm backtest first.')
    return null
  }

  logger.info(`Found ${results.length} simulation results`)

  mkdirSync(outputDir, { recursive: true })
  const html = generateHtml(results)
  writeFileSync(outputPath, html)
  logger.info(`Report generated: ${outputPath}`)
  return outputPath
}

// Allow direct execution via `pnpm report`
const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]).replace(/\.ts$/, '') ===
    fileURLToPath(import.meta.url).replace(/\.ts$/, '')

if (isDirectExecution) {
  generateReport()
}
