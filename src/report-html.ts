import type { LastPosition } from './types'
import { round } from './utils'

export type SimulationResult = {
  pair: string
  interval: string
  strategy: string
  startDate: string
  endDate: string
  data: {
    initialCapital?: number
    lastPositionMoney?: number
    profit?: number
    percentageProfit?: string
    nbPosition?: number
    percentagePosition?: string
    profitFactor?: number
    maxDrawdown?: string
    sharpeRatio?: number
    avgTradeProfit?: number
    historicPosition?: LastPosition[]
  }
  category: 'Short-Term' | 'Long-Term'
}

type StrategyAverage = {
  strategy: string
  category: 'Short-Term' | 'Long-Term'
  count: number
  avgInitialCapital: number
  avgFinalCapital: number
  avgTrades: number
  avgProfitPercent: number
  avgWinRate: number
  avgSharpe: number
  avgMaxDrawdown: number
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
    const key = `${r.strategy}|${r.category}`
    const existing = grouped.get(key) ?? []
    existing.push(r)
    grouped.set(key, existing)
  }

  const averages: StrategyAverage[] = []
  for (const [, group] of grouped) {
    const count = group.length
    const strategy = group[0].strategy
    const category = group[0].category
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
      category,
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

function buildBestCard(
  label: string,
  best: SimulationResult | undefined,
  accentColor: string,
  borderColor: string,
): string {
  if (!best) return ''
  return `<div class="best-card" style="border-color: ${borderColor}">
        <h2 style="color: ${accentColor}">${label}</h2>
        <div class="best-grid">
          <div class="best-item"><span class="label">Strategy</span><span class="value">${best.strategy.toUpperCase()}</span></div>
          <div class="best-item"><span class="label">Pair</span><span class="value">${best.pair}</span></div>
          <div class="best-item"><span class="label">Period</span><span class="value">${best.interval}</span></div>
          <div class="best-item"><span class="label">Dates</span><span class="value">${best.startDate} \u2192 ${best.endDate}</span></div>
          <div class="best-item"><span class="label">Initial Capital</span><span class="value">$${round(best.data.initialCapital ?? 0).toLocaleString()}</span></div>
          <div class="best-item highlight" style="border-color: ${accentColor}"><span class="label">Final Capital</span><span class="value">$${round(best.data.lastPositionMoney ?? 0).toLocaleString()}</span></div>
          <div class="best-item"><span class="label">Profit vs HODL</span><span class="value ${colorClass(best.data.profit ?? 0)}">${best.data.percentageProfit ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Win Rate</span><span class="value">${best.data.percentagePosition ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Profit Factor</span><span class="value">${best.data.profitFactor ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Max Drawdown</span><span class="value">${best.data.maxDrawdown ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Sharpe Ratio</span><span class="value">${best.data.sharpeRatio ?? 'N/A'}</span></div>
          <div class="best-item"><span class="label">Trades</span><span class="value">${best.data.nbPosition ?? 0}</span></div>
          <div class="best-item"><span class="label">Avg Trade Profit</span><span class="value ${colorClass(best.data.avgTradeProfit ?? 0)}">$${best.data.avgTradeProfit ?? 0}</span></div>
        </div>
      </div>`
}

/** Escape </script> in JSON to prevent breaking out of script tags */
function safeJsonEmbed(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>')
}

function buildStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e1e4e8; padding: 2rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
    .header { margin-bottom: 2rem; border-bottom: 1px solid #30363d; padding-bottom: 1rem; }
    .header-meta { color: #8b949e; font-size: 0.9rem; }
    .comparison-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .best-card { background: linear-gradient(135deg, #1a2332, #1e293b); border: 1px solid #2d6a4f; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    .comparison-row .best-card { margin-bottom: 0; }
    .best-card h2 { color: #40c057; margin-bottom: 1rem; font-size: 1.3rem; }
    .best-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .best-item { background: #161b22; border-radius: 8px; padding: 0.75rem 1rem; }
    .best-item .label { display: block; font-size: 0.75rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; }
    .best-item .value { display: block; font-size: 1.1rem; font-weight: 600; margin-top: 0.25rem; }
    .best-item.highlight { border: 1px solid #40c057; }
    .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .filter-btn { background: #161b22; border: 1px solid #30363d; color: #8b949e; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .filter-btn:hover { border-color: #58a6ff; color: #c9d1d9; }
    .filter-btn.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
    .category-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .cat-long { background: #2d6a4f33; color: #40c057; }
    .cat-short { background: #1864ab33; color: #339af0; }
    h2.section-title { font-size: 1.2rem; margin: 2rem 0 1rem; color: #c9d1d9; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #161b22; color: #8b949e; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; padding: 0.75rem; text-align: left; border-bottom: 2px solid #30363d; cursor: pointer; user-select: none; white-space: nowrap; }
    th:hover { color: #58a6ff; }
    th .sort-arrow { margin-left: 4px; font-size: 0.6rem; }
    td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #21262d; }
    tr:hover { background: #161b22; }
    tr.hidden-row { display: none; }
    .positive { color: #40c057; }
    .negative { color: #f03e3e; }
    .beats-hodl { border-left: 3px solid #40c057; }
    .loses-hodl { border-left: 3px solid #f03e3e; }
    .table-wrapper { overflow-x: auto; background: #0d1117; border-radius: 8px; border: 1px solid #30363d; }
    .chart-btn { background: #1f6feb; border: none; color: #fff; padding: 0.25rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: 500; transition: background 0.2s; }
    .chart-btn:hover { background: #388bfd; }
    .modal { display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; }
    .modal.hidden { display: none; }
    .modal-backdrop { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); }
    .modal-content { position: relative; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; width: 95vw; max-height: 95vh; overflow-y: auto; padding: 1.5rem; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .modal-header h2 { font-size: 1.3rem; color: #e1e4e8; margin: 0; }
    .modal-metrics { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .modal-metrics .metric { background: #161b22; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; color: #8b949e; }
    .modal-metrics .metric strong { color: #e1e4e8; }
    .modal-close { background: none; border: none; color: #8b949e; font-size: 2rem; cursor: pointer; padding: 0 0.5rem; line-height: 1; flex-shrink: 0; }
    .modal-close:hover { color: #e1e4e8; }
    #chart-container { height: 500px; margin-bottom: 1rem; }
    #trade-table-container { max-height: 400px; overflow-y: auto; border-radius: 8px; border: 1px solid #30363d; }
    .trade-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .trade-table th { background: #161b22; color: #8b949e; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; padding: 0.5rem 0.75rem; text-align: left; border-bottom: 2px solid #30363d; position: sticky; top: 0; cursor: default; }
    .trade-table td { padding: 0.4rem 0.75rem; border-bottom: 1px solid #21262d; }
    .trade-table tr:hover { background: #161b22; }
    @media (max-width: 900px) { .comparison-row { grid-template-columns: 1fr; } #chart-container { height: 350px; } }`
}

function buildChartScript(
  candleData: Record<string, number[][]>,
  tradeData: Record<string, LastPosition[]>,
  resultMeta: Record<string, unknown>,
): string {
  return `(function() {
  var CANDLE_DATA = ${safeJsonEmbed(candleData)};
  var TRADE_DATA = ${safeJsonEmbed(tradeData)};
  var RESULT_META = ${safeJsonEmbed(resultMeta)};

  var currentChart = null;
  var resizeHandler = null;

  // Deduplicate candles by timestamp (Binance sometimes returns duplicates)
  function deduplicateCandles(candles) {
    var seen = {};
    var result = [];
    for (var i = 0; i < candles.length; i++) {
      var time = candles[i][0];
      if (!seen[time]) {
        seen[time] = true;
        result.push(candles[i]);
      }
    }
    return result;
  }

  function findClosestTime(times, target) {
    var closest = times[0];
    for (var i = 1; i < times.length; i++) {
      if (times[i] <= target) closest = times[i];
      else break;
    }
    return closest;
  }

  function createChart(candles, trades) {
    var container = document.getElementById('chart-container');
    container.innerHTML = '';

    if (typeof LightweightCharts === 'undefined') {
      container.innerHTML = '<p style="color:#f03e3e;padding:2rem;text-align:center;">Failed to load chart library. Check your internet connection.</p>';
      return;
    }

    // Ensure container has dimensions
    var width = container.clientWidth;
    if (width < 100) width = container.parentElement.clientWidth || 800;
    var height = Math.min(500, window.innerHeight * 0.5);

    try {
      var chart = LightweightCharts.createChart(container, {
        layout: {
          background: { type: 'solid', color: '#0d1117' },
          textColor: '#8b949e',
        },
        grid: {
          vertLines: { color: '#21262d' },
          horzLines: { color: '#21262d' },
        },
        crosshair: { mode: 0 },
        rightPriceScale: { borderColor: '#30363d' },
        timeScale: {
          borderColor: '#30363d',
          timeVisible: true,
          secondsVisible: false,
        },
        width: width,
        height: height,
      });

      currentChart = chart;

      // Candlestick series
      var candleSeries = chart.addCandlestickSeries({
        upColor: '#40c057',
        downColor: '#f03e3e',
        borderUpColor: '#40c057',
        borderDownColor: '#f03e3e',
        wickUpColor: '#40c057',
        wickDownColor: '#f03e3e',
      });

      var candleFormatted = candles.map(function(c) {
        return { time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] };
      });
      candleSeries.setData(candleFormatted);

      // Volume histogram on separate scale
      var volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      var volumeFormatted = candles.map(function(c) {
        return {
          time: c[0],
          value: c[5],
          color: c[4] >= c[1] ? 'rgba(64,192,87,0.25)' : 'rgba(240,62,62,0.25)',
        };
      });
      volumeSeries.setData(volumeFormatted);

      // Trade markers
      if (trades && trades.length > 0) {
        var markers = [];
        var candleTimes = candles.map(function(c) { return c[0]; });

        for (var i = 0; i < trades.length; i++) {
          var trade = trades[i];
          var tradeTime = Math.floor(new Date(trade.date).getTime() / 1000);
          var closest = findClosestTime(candleTimes, tradeTime);

          if (trade.type === 'buy') {
            markers.push({
              time: closest,
              position: 'belowBar',
              color: '#40c057',
              shape: 'arrowUp',
              text: 'BUY $' + trade.price.toFixed(2),
            });
          } else {
            var pText = '';
            if (trade.tradeProfit != null) {
              pText = ' (' + (trade.tradeProfit > 0 ? '+' : '') + '$' + trade.tradeProfit.toFixed(0) + ')';
            }
            markers.push({
              time: closest,
              position: 'aboveBar',
              color: '#f03e3e',
              shape: 'arrowDown',
              text: 'SELL $' + trade.price.toFixed(2) + pText,
            });
          }
        }

        markers.sort(function(a, b) { return a.time - b.time; });
        candleSeries.setMarkers(markers);
      }

      chart.timeScale().fitContent();

      resizeHandler = function() {
        chart.applyOptions({ width: container.clientWidth });
      };
      window.addEventListener('resize', resizeHandler);
    } catch (err) {
      container.innerHTML = '<p style="color:#f03e3e;padding:2rem;text-align:center;">Chart error: ' + err.message + '</p>';
      console.error('Chart creation error:', err);
    }
  }

  function buildTradeTable(trades) {
    var container = document.getElementById('trade-table-container');
    if (!trades || trades.length === 0) {
      container.innerHTML = '<p style="color:#8b949e;padding:1rem;text-align:center;">No trades executed</p>';
      return;
    }

    var html = '<table class="trade-table"><thead><tr>' +
      '<th>#</th><th>Date</th><th>Type</th><th>Price</th><th>Capital</th><th>Assets</th><th>Trade Profit</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < trades.length; i++) {
      var t = trades[i];
      var date = new Date(t.date).toLocaleDateString('en-CA');
      var typeClass = t.type === 'buy' ? 'positive' : 'negative';
      var profitCell = '\\u2014';
      if (t.tradeProfit != null) {
        var pClass = t.tradeProfit > 0 ? 'positive' : 'negative';
        var sign = t.tradeProfit > 0 ? '+' : '';
        profitCell = '<span class="' + pClass + '">' + sign + '$' + t.tradeProfit.toFixed(2) + '</span>';
      }

      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + date + '</td>' +
        '<td class="' + typeClass + '">' + t.type.toUpperCase() + '</td>' +
        '<td>$' + t.price.toFixed(2) + '</td>' +
        '<td>$' + t.capital.toFixed(2) + '</td>' +
        '<td>' + (t.assets ? t.assets.toFixed(4) : '0') + '</td>' +
        '<td>' + profitCell + '</td>' +
        '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  window.openChart = function(resultKey) {
    var meta = RESULT_META[resultKey];
    if (!meta) return;

    var rawCandles = CANDLE_DATA[meta.dataKey];
    var trades = TRADE_DATA[resultKey];

    document.getElementById('modal-title').textContent = meta.strategy + ' \\u2014 ' + meta.pair + ' ' + meta.interval;
    document.getElementById('modal-metrics').innerHTML =
      '<span class="metric"><strong>Profit:</strong> ' + meta.profit + '</span>' +
      '<span class="metric"><strong>Trades:</strong> ' + meta.trades + '</span>' +
      '<span class="metric"><strong>Win Rate:</strong> ' + meta.winRate + '</span>' +
      '<span class="metric"><strong>Max DD:</strong> ' + meta.maxDrawdown + '</span>' +
      '<span class="metric"><strong>Sharpe:</strong> ' + meta.sharpe + '</span>' +
      '<span class="metric"><strong>PF:</strong> ' + meta.profitFactor + '</span>';

    var modal = document.getElementById('chart-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (!rawCandles) {
      document.getElementById('chart-container').innerHTML = '<p style="color:#f03e3e;padding:2rem;text-align:center;">Candle data not available. Run the backtest to generate data files.</p>';
      buildTradeTable(trades);
      return;
    }

    var candles = deduplicateCandles(rawCandles);
    buildTradeTable(trades);

    // Double rAF ensures browser has reflowed after modal display change
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        createChart(candles, trades);
      });
    });
  };

  window.closeChart = function() {
    document.getElementById('chart-modal').classList.add('hidden');
    document.body.style.overflow = '';
    if (currentChart) { currentChart.remove(); currentChart = null; }
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') window.closeChart();
  });

  document.getElementById('chart-modal-backdrop').addEventListener('click', window.closeChart);

  // Table sorting
  var table = document.getElementById('rankings');
  var thead = table.querySelector('thead');
  var tbody = table.querySelector('tbody');
  var headers = thead.querySelectorAll('th[data-col]');
  var currentSort = { col: -1, asc: true };

  function parseVal(td, type) {
    var text = td.textContent.trim();
    if (type === 'money') return parseFloat(text.replace(/[$,]/g, '')) || 0;
    if (type === 'percent') return parseFloat(text.replace('%', '')) || 0;
    if (type === 'number') { var n = parseFloat(text); return isNaN(n) ? 0 : n; }
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

      thead.querySelectorAll('th').forEach(function(h) {
        var arrow = h.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = '';
      });
      th.querySelector('.sort-arrow').textContent = asc ? '\\u25B2' : '\\u25BC';
    });
  });

  // Multi-dimension filter (category + pair)
  var activeFilters = { category: 'all', pair: 'all' };
  var avgTable = document.getElementById('averages');
  var avgRows = avgTable ? avgTable.querySelectorAll('tbody tr') : [];

  function applyFilters() {
    tbody.querySelectorAll('tr').forEach(function(row) {
      var catMatch = activeFilters.category === 'all' || row.getAttribute('data-category') === activeFilters.category;
      var pairMatch = activeFilters.pair === 'all' || row.getAttribute('data-pair') === activeFilters.pair;
      row.classList.toggle('hidden-row', !(catMatch && pairMatch));
    });
    avgRows.forEach(function(row) {
      var catMatch = activeFilters.category === 'all' || row.getAttribute('data-category') === activeFilters.category;
      row.classList.toggle('hidden-row', !catMatch);
    });
  }

  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var filter = btn.getAttribute('data-filter');
      var filterType = btn.getAttribute('data-filter-type');
      activeFilters[filterType] = filter;

      // Toggle active state within same filter-bar
      var bar = btn.parentElement;
      bar.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      applyFilters();
    });
  });
})();`
}

function buildComparisonCards(
  results: SimulationResult[],
  sorted: SimulationResult[],
): string {
  const hasShortTerm = results.some((r) => r.category === 'Short-Term')
  const hasLongTerm = results.some((r) => r.category === 'Long-Term')
  const hasBothCategories = hasShortTerm && hasLongTerm

  const cards: string[] = []

  if (hasBothCategories) {
    const bestLT = sorted.find((r) => r.category === 'Long-Term')
    const bestST = sorted.find((r) => r.category === 'Short-Term')
    cards.push(`<div class="comparison-row">
        ${buildBestCard('Best Long-Term', bestLT, '#40c057', '#2d6a4f')}
        ${buildBestCard('Best Short-Term', bestST, '#339af0', '#1864ab')}
      </div>`)
  } else {
    cards.push(
      buildBestCard(
        hasShortTerm ? 'Best Short-Term' : 'Best Long-Term',
        sorted[0],
        hasShortTerm ? '#339af0' : '#40c057',
        hasShortTerm ? '#1864ab' : '#2d6a4f',
      ),
    )
  }

  // Per-pair best cards when multiple pairs
  const uniquePairs = [...new Set(results.map((r) => r.pair))].sort()
  if (uniquePairs.length > 1) {
    const pairCards = uniquePairs
      .map((pair) => {
        const best = sorted.find((r) => r.pair === pair)
        return buildBestCard(`Best ${pair}`, best, '#e8a838', '#5c4813')
      })
      .join('')
    cards.push(`<div class="comparison-row">${pairCards}</div>`)
  }

  return cards.join('')
}

function buildFilterButtons(results: SimulationResult[]): string {
  const hasShortTerm = results.some((r) => r.category === 'Short-Term')
  const hasLongTerm = results.some((r) => r.category === 'Long-Term')
  const uniquePairs = [...new Set(results.map((r) => r.pair))].sort()
  const hasMultiplePairs = uniquePairs.length > 1

  if (!hasShortTerm && !hasLongTerm && !hasMultiplePairs) return ''

  let html = ''

  if (hasShortTerm && hasLongTerm) {
    const longCount = results.filter((r) => r.category === 'Long-Term').length
    const shortCount = results.filter((r) => r.category === 'Short-Term').length
    html += `<div class="filter-bar">
        <button class="filter-btn active" data-filter="all" data-filter-type="category">All (${results.length})</button>
        <button class="filter-btn" data-filter="Long-Term" data-filter-type="category">Long-Term (${longCount})</button>
        <button class="filter-btn" data-filter="Short-Term" data-filter-type="category">Short-Term (${shortCount})</button>
      </div>`
  }

  if (hasMultiplePairs) {
    const pairButtons = uniquePairs
      .map((p) => {
        const count = results.filter((r) => r.pair === p).length
        return `<button class="filter-btn" data-filter="${p}" data-filter-type="pair">${p} (${count})</button>`
      })
      .join('\n        ')
    html += `<div class="filter-bar">
        <button class="filter-btn active" data-filter="all" data-filter-type="pair">All Pairs (${results.length})</button>
        ${pairButtons}
      </div>`
  }

  return html
}

function buildAveragesTable(results: SimulationResult[]): string {
  const averages = computeStrategyAverages(results)
  const rows = averages
    .map(
      (a) =>
        `<tr data-category="${a.category}">
          <td><strong>${a.strategy.toUpperCase()}</strong></td>
          <td><span class="category-badge ${a.category === 'Short-Term' ? 'cat-short' : 'cat-long'}">${a.category}</span></td>
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

  return `<table id="averages">
      <thead>
        <tr>
          <th>Strategy</th><th>Category</th><th>Simulations</th>
          <th>Avg Initial Capital</th><th>Avg Final Capital</th><th>Avg Trades</th>
          <th>Avg Profit vs HODL</th><th>Avg Win Rate</th><th>Avg Sharpe</th><th>Avg Max Drawdown</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function buildRankingsTable(sorted: SimulationResult[]): string {
  const rows = sorted
    .map((r, i) => {
      const profit = r.data.profit ?? 0
      const beatsHodl = profit > 0
      const resultKey = `${r.pair}_${r.interval}_${r.strategy}_${r.startDate}_${r.endDate}`
      return `<tr class="${beatsHodl ? 'beats-hodl' : 'loses-hodl'}" data-category="${r.category}" data-pair="${r.pair}">
          <td>${i + 1}</td>
          <td>${r.strategy.toUpperCase()}</td>
          <td>${r.pair}</td>
          <td><span class="category-badge ${r.category === 'Short-Term' ? 'cat-short' : 'cat-long'}">${r.category}</span></td>
          <td>${r.interval}</td>
          <td>${r.startDate} \u2192 ${r.endDate}</td>
          <td>$${round(r.data.initialCapital ?? 0).toLocaleString()}</td>
          <td>$${round(r.data.lastPositionMoney ?? 0).toLocaleString()}</td>
          <td class="${colorClass(profit)}">${r.data.percentageProfit ?? 'N/A'}</td>
          <td>${r.data.percentagePosition ?? 'N/A'}</td>
          <td>${r.data.profitFactor ?? 'N/A'}</td>
          <td>${r.data.maxDrawdown ?? 'N/A'}</td>
          <td>${r.data.sharpeRatio ?? 'N/A'}</td>
          <td>${r.data.nbPosition ?? 0}</td>
          <td><button class="chart-btn" onclick="openChart('${resultKey}')">Chart</button></td>
        </tr>`
    })
    .join('\n')

  return `<table id="rankings">
      <thead>
        <tr>
          <th data-col="0" data-type="number">Rank <span class="sort-arrow"></span></th>
          <th data-col="1" data-type="string">Strategy <span class="sort-arrow"></span></th>
          <th data-col="2" data-type="string">Pair <span class="sort-arrow"></span></th>
          <th data-col="3" data-type="string">Category <span class="sort-arrow"></span></th>
          <th data-col="4" data-type="string">Period <span class="sort-arrow"></span></th>
          <th data-col="5" data-type="string">Dates <span class="sort-arrow"></span></th>
          <th data-col="6" data-type="money">Initial Capital <span class="sort-arrow"></span></th>
          <th data-col="7" data-type="money">Final Capital <span class="sort-arrow"></span></th>
          <th data-col="8" data-type="percent">Profit vs HODL <span class="sort-arrow"></span></th>
          <th data-col="9" data-type="percent">Win Rate <span class="sort-arrow"></span></th>
          <th data-col="10" data-type="number">Profit Factor <span class="sort-arrow"></span></th>
          <th data-col="11" data-type="percent">Max Drawdown <span class="sort-arrow"></span></th>
          <th data-col="12" data-type="number">Sharpe <span class="sort-arrow"></span></th>
          <th data-col="13" data-type="number">Trades <span class="sort-arrow"></span></th>
          <th>Chart</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

export function generateHtml(
  results: SimulationResult[],
  candleData: Record<string, number[][]>,
): string {
  const sorted = [...results].sort(
    (a, b) => (b.data.lastPositionMoney ?? 0) - (a.data.lastPositionMoney ?? 0),
  )
  const uniquePairs = [...new Set(results.map((r) => r.pair))].sort()
  const pairsLabel = uniquePairs.join(', ')
  const now = new Date().toLocaleString()

  // Build chart data maps
  const tradeData: Record<string, LastPosition[]> = {}
  const resultMeta: Record<
    string,
    {
      strategy: string
      pair: string
      interval: string
      dates: string
      dataKey: string
      profit: string
      trades: number
      winRate: string
      maxDrawdown: string
      sharpe: number
      profitFactor: number | string
    }
  > = {}

  for (const r of sorted) {
    const resultKey = `${r.pair}_${r.interval}_${r.strategy}_${r.startDate}_${r.endDate}`
    const dataKey = `${r.pair}_${r.interval}_${r.startDate}_${r.endDate}`
    tradeData[resultKey] = r.data.historicPosition ?? []
    resultMeta[resultKey] = {
      strategy: r.strategy.toUpperCase(),
      pair: r.pair,
      interval: r.interval,
      dates: `${r.startDate} \u2192 ${r.endDate}`,
      dataKey,
      profit: r.data.percentageProfit ?? 'N/A',
      trades: r.data.nbPosition ?? 0,
      winRate: r.data.percentagePosition ?? 'N/A',
      maxDrawdown: r.data.maxDrawdown ?? 'N/A',
      sharpe: r.data.sharpeRatio ?? 0,
      profitFactor: r.data.profitFactor ?? 'N/A',
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backtest Report \u2014 ${pairsLabel}</title>
  <script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"></script>
  <style>${buildStyles()}</style>
</head>
<body>
  <div class="header">
    <h1>Backtest Report</h1>
    <div class="header-meta">Pairs: ${pairsLabel} &middot; Generated: ${now} &middot; ${results.length} simulations</div>
  </div>

  ${buildComparisonCards(results, sorted)}

  <h2 class="section-title">Strategy Averages</h2>
  <div class="table-wrapper">${buildAveragesTable(results)}</div>

  <h2 class="section-title">Full Rankings</h2>
  ${buildFilterButtons(results)}
  <div class="table-wrapper">${buildRankingsTable(sorted)}</div>

  <div id="chart-modal" class="modal hidden">
    <div id="chart-modal-backdrop" class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2 id="modal-title"></h2>
          <div id="modal-metrics" class="modal-metrics"></div>
        </div>
        <button class="modal-close" onclick="closeChart()">&times;</button>
      </div>
      <div id="chart-container"></div>
      <div id="trade-table-container"></div>
    </div>
  </div>

  <script>${buildChartScript(candleData, tradeData, resultMeta)}</script>
</body>
</html>`
}
