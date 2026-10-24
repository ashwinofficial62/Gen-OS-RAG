/**
 * GenOS: TopoSafe-RAG Dashboard Application Logic
 * Strict monochromatic data visualizer with local JSON loading, Chart.js integrations,
 * pattern fills, accessible data drawers, and incident explorer drawer.
 */

// Global State
const state = {
  theme: 'dark',
  overview: null,
  mcda: null,
  toporag: null,
  chronoos: null,
  staterag: null,
  safeneuroos: null,
  toposaferag: null,
  incidents: [],
  filteredIncidents: [],
  currentPage: 1,
  pageSize: 10,
  filters: {
    eventType: 'ALL',
    severity: 'ALL',
    safety: 'ALL'
  },
  charts: {}
};

// Canvas Hatch / Dot Pattern Generators for Monochromatic Series Distinction
function createDiagonalPattern(color = '#f5f5f5', bgColor = '#141414', width = 8) {
  const pCanvas = document.createElement('canvas');
  pCanvas.width = width;
  pCanvas.height = width;
  const pCtx = pCanvas.getContext('2d');
  pCtx.fillStyle = bgColor;
  pCtx.fillRect(0, 0, width, width);
  pCtx.strokeStyle = color;
  pCtx.lineWidth = 1.5;
  pCtx.beginPath();
  pCtx.moveTo(0, width);
  pCtx.lineTo(width, 0);
  pCtx.stroke();
  return pCtx.createPattern(pCanvas, 'repeat');
}

function createDotPattern(color = '#f5f5f5', bgColor = '#141414', size = 8, dotRadius = 1.5) {
  const pCanvas = document.createElement('canvas');
  pCanvas.width = size;
  pCanvas.height = size;
  const pCtx = pCanvas.getContext('2d');
  pCtx.fillStyle = bgColor;
  pCtx.fillRect(0, 0, size, size);
  pCtx.fillStyle = color;
  pCtx.beginPath();
  pCtx.arc(size / 2, size / 2, dotRadius, 0, Math.PI * 2);
  pCtx.fill();
  return pCtx.createPattern(pCanvas, 'repeat');
}

// Global Palette Tokens based on CSS variables
function getThemeTokens() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isDark = theme === 'dark';
  return {
    isDark,
    ink: isDark ? '#f5f5f5' : '#0a0a0a',
    ink2: isDark ? '#e5e5e5' : '#262626',
    ink3: isDark ? '#a3a3a3' : '#525252',
    line: isDark ? '#262626' : '#d4d4d4',
    paper: isDark ? '#0a0a0a' : '#ffffff',
    paper2: isDark ? '#141414' : '#f5f5f5',
    paper3: isDark ? '#1f1f1f' : '#e5e5e5',
    // Grayscale shade steps
    shades: isDark 
      ? ['#f5f5f5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626']
      : ['#0a0a0a', '#262626', '#525252', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5']
  };
}

// -----------------------------------------------------------------------------
// DATA LOADING
// -----------------------------------------------------------------------------
async function loadAllData() {
  try {
    const [overview, mcda, toporag, chronoos, staterag, safeneuroos, toposaferag, incidents] = await Promise.all([
      fetch('data/overview.json').then(r => r.json()),
      fetch('data/mcda.json').then(r => r.json()),
      fetch('data/toporag.json').then(r => r.json()),
      fetch('data/chronoos.json').then(r => r.json()),
      fetch('data/stateRAG.json').then(r => r.json()),
      fetch('data/safeneuroos.json').then(r => r.json()),
      fetch('data/toposaferag.json').then(r => r.json()),
      fetch('data/incidents.json').then(r => r.json())
    ]);

    state.overview = overview;
    state.mcda = mcda;
    state.toporag = toporag;
    state.chronoos = chronoos;
    state.staterag = staterag;
    state.safeneuroos = safeneuroos;
    state.toposaferag = toposaferag;
    state.incidents = incidents;
    state.filteredIncidents = [...incidents];

    renderStaticTables();
    renderAllCharts();
    renderProvenanceTable();
  } catch (err) {
    console.error('Error loading dashboard data JSONs:', err);
    showDataLoadBanner(err);
  }
}

function showDataLoadBanner(err) {
  const isFileProto = window.location.protocol === 'file:';
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:99999;background:#b71c1c;color:#fff;padding:1rem 1.5rem;border:2px solid #ff5252;max-width:480px;font-family:sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.6);';
  banner.innerHTML = `
    <h4 style="margin:0 0 0.5rem 0;font-size:1rem;color:#ffea00;">⚠️ Charts & Data Cannot Load</h4>
    <p style="margin:0 0 0.5rem 0;font-size:0.85rem;line-height:1.4;">
      ${isFileProto 
        ? 'You opened the page directly using <code>file:///</code>. Browsers block JSON data loading (CORS) on local files.' 
        : 'Could not fetch data JSON files: ' + (err.message || err)}
    </p>
    <p style="margin:0;font-size:0.85rem;line-height:1.4;">
      <strong>Solution:</strong> Double-click <code style="background:#222;padding:2px 5px;">start_dashboard.bat</code> or run:
      <br><code style="background:#222;padding:2px 5px;display:inline-block;margin-top:4px;">python -m http.server 8000 --directory Frontend</code>
      <br>Then open <a href="http://localhost:8000" style="color:#00e5ff;font-weight:bold;">http://localhost:8000</a>.
    </p>
  `;
  document.body.appendChild(banner);
}

// -----------------------------------------------------------------------------
// STATIC TABLES RENDERING
// -----------------------------------------------------------------------------
function renderStaticTables() {
  // 1. Burst episodes table in ChronoOS
  const burstTbody = document.getElementById('burst-tbody');
  if (burstTbody && state.chronoos && state.chronoos.top_burst_episodes) {
    burstTbody.innerHTML = state.chronoos.top_burst_episodes.map(ep => `
      <tr>
        <td class="num font-mono">#${ep.episode_id}</td>
        <td class="font-mono">${ep.start_time.replace('T', ' ')}</td>
        <td class="font-mono">${ep.end_time.replace('T', ' ')}</td>
        <td class="num font-mono">${ep.duration_sec.toFixed(2)}s</td>
        <td class="num font-mono font-bold">${ep.event_count}</td>
        <td class="num font-mono">${ep.peak_rate_per_sec.toFixed(2)}/s</td>
        <td>${ep.modules_involved.join(', ')}</td>
      </tr>
    `).join('');
  }

  // 2. POSIX Safety Invariant Rules table in SafeNeuroOS
  const rulesTbody = document.getElementById('rules-tbody');
  if (rulesTbody && state.safeneuroos && state.safeneuroos.posix_invariant_rules) {
    rulesTbody.innerHTML = state.safeneuroos.posix_invariant_rules.map(r => `
      <tr>
        <td class="num font-mono font-bold">${r.rule_id}</td>
        <td><strong>${r.name}</strong></td>
        <td><code class="font-mono">${r.pattern}</code></td>
        <td>${r.hazard_class}</td>
        <td>${r.posix_rationale}</td>
      </tr>
    `).join('');
  }

  // 3. Side-by-side solution comparison in TopoSafe-RAG
  const compTbody = document.getElementById('comparison-tbody');
  if (compTbody && state.toposaferag && state.toposaferag.solution_comparison) {
    compTbody.innerHTML = state.toposaferag.solution_comparison.map(c => `
      <tr class="${c.solution === 'TopoSafe-RAG' ? 'highlight-winner' : ''}">
        <td><strong>${c.solution}</strong></td>
        <td>${c.gap_addressed}</td>
        <td>${c.mechanism}</td>
        <td class="font-mono">${c.data_evidence}</td>
        <td><em>${c.status}</em></td>
      </tr>
    `).join('');
  }
}

// -----------------------------------------------------------------------------
// CHARTS RENDERING
// -----------------------------------------------------------------------------
function renderAllCharts() {
  const tokens = getThemeTokens();
  destroyAllCharts();

  const chartFns = [
    renderMCDAChart,
    renderEventTypesChart,
    renderTopFilesChart,
    renderModuleMatrixChart,
    renderModuleDonutChart,
    renderTopoRAGCorrChart,
    renderCumulativeFailuresChart,
    renderDeltaTHistChart,
    renderEmpiricalRateChart,
    renderChronoCorrChart,
    renderDurationProxyChart,
    renderStateRAGCorrChart,
    renderConformalDistChart,
    renderSeverityDonutChart,
    renderSeverityStackedChart,
    renderSafeNeuroCorrChart,
    renderFunnelChart,
    renderTopoSafeCorrChart,
    renderTopoSafeStagesChart,
    renderTopoSafeTaxonomyChart,
    renderTopoSafeTimelineChart
  ];

  chartFns.forEach(fn => {
    try {
      fn(tokens);
    } catch (err) {
      console.warn(`Chart error in ${fn.name}:`, err);
    }
  });
}

function destroyAllCharts() {
  Object.keys(state.charts).forEach(key => {
    if (state.charts[key]) {
      state.charts[key].destroy();
    }
  });
  state.charts = {};
}

// 0. MCDA Scores Bar Chart
function renderMCDAChart(tokens) {
  const canvas = document.getElementById('chart-mcda');
  if (!canvas || !state.mcda) return;
  const ctx = canvas.getContext('2d');

  const labels = state.mcda.architectures.map(a => a.name);
  const data = state.mcda.architectures.map(a => a.weighted_total);

  // Distinguish winner using dark fill vs lighter gray for candidates
  const bgColors = state.mcda.architectures.map(a => 
    a.is_winner ? tokens.ink : tokens.shades[4]
  );

  state.charts.mcda = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Weighted Score (out of 10.0)',
        data: data,
        backgroundColor: bgColors,
        borderColor: tokens.ink,
        borderWidth: 1.5,
        borderRadius: 0
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Score: ${ctx.raw.toFixed(3)} / 10.0`
          }
        }
      },
      scales: {
        x: {
          min: 6.5,
          max: 10.0,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          grid: { display: false },
          ticks: { color: tokens.ink, font: { family: 'var(--font-sans)', weight: 'bold' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-mcda', labels, ['Architecture', 'Weighted Total Score'], 
    state.mcda.architectures.map(a => [a.name, a.weighted_total.toFixed(3)])
  );
}

// 1. Failures by Event Type (matches RUN_3/failures_by_event_type.png)
function renderEventTypesChart(tokens) {
  const canvas = document.getElementById('chart-event-types');
  if (!canvas || !state.toporag) return;
  const ctx = canvas.getContext('2d');

  const items = state.toporag.failures_by_event_type;
  const labels = items.map(d => d.event_type);
  const counts = items.map(d => d.count);
  const percentages = items.map(d => d.percentage);

  // Monochromatic shade steps
  const bgColors = items.map((_, i) => tokens.shades[i % tokens.shades.length]);

  state.charts.eventTypes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Failure Incidents',
        data: counts,
        backgroundColor: bgColors,
        borderColor: tokens.ink,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} logs (${percentages[ctx.dataIndex]}%)`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink2, font: { family: 'var(--font-mono)', size: 10 }, maxRotation: 25 }
        },
        y: {
          beginAtZero: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-event-types', labels, ['Event Type', 'Failures', 'Percentage'], 
    items.map(d => [d.event_type, d.count, `${d.percentage}%`])
  );
}

// 2. Top Failing Components (matches RUN_3/top_failing_components.png)
function renderTopFilesChart(tokens) {
  const canvas = document.getElementById('chart-top-files');
  if (!canvas || !state.toporag) return;
  const ctx = canvas.getContext('2d');

  const items = state.toporag.top_failing_modules;
  const labels = items.map(d => d.module);
  const counts = items.map(d => d.count);
  const percentages = items.map(d => d.percentage);

  const bgColors = items.map((_, i) => tokens.shades[i % tokens.shades.length]);

  state.charts.topFiles = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Incident Frequency',
        data: counts,
        backgroundColor: bgColors,
        borderColor: tokens.ink,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} incidents (${percentages[ctx.dataIndex]}%)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          grid: { display: false },
          ticks: { 
            color: tokens.ink2, 
            font: { family: 'var(--font-mono)', size: 9 },
            callback: (val, idx) => {
              const str = labels[idx] || '';
              return str.length > 32 ? '...' + str.slice(-29) : str;
            }
          }
        }
      }
    }
  });

  populateDataDrawer('drawer-top-files', labels, ['Source File / OS Component', 'Count', 'Share'], 
    items.map(d => [d.module, d.count, `${d.percentage}%`])
  );
}

// 3. Module x Event Type Cross Tabulation
function renderModuleMatrixChart(tokens) {
  const canvas = document.getElementById('chart-module-matrix');
  if (!canvas || !state.toporag) return;
  const ctx = canvas.getContext('2d');

  const matrix = state.toporag.module_event_matrix;
  const modules = matrix.map(m => m.module.split('/').pop().split('\\').pop());
  const eventKeys = ['SERVER_ERROR', 'ROUTING_ERROR', 'LOG', 'HTTP_EXCEPTION', 'DB_ERROR', 'HTTP_ERROR'];

  // Distinct hatch patterns for each event type series in the stacked bar
  const datasets = eventKeys.map((key, kIdx) => {
    return {
      label: key,
      data: matrix.map(m => m[key] || 0),
      backgroundColor: tokens.shades[kIdx % tokens.shades.length],
      borderColor: tokens.ink,
      borderWidth: 1
    };
  });

  state.charts.moduleMatrix = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: modules,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: tokens.ink2, font: { family: 'var(--font-mono)' } }
        },
        y: {
          stacked: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: tokens.ink, boxWidth: 12, font: { family: 'var(--font-mono)', size: 10 } }
        }
      }
    }
  });

  populateDataDrawer('drawer-module-matrix', modules, ['Module', ...eventKeys], 
    matrix.map(m => [m.module, ...eventKeys.map(k => m[k] || 0)])
  );
}

// 4. Module Group Share Donut
function renderModuleDonutChart(tokens) {
  const canvas = document.getElementById('chart-module-donut');
  if (!canvas || !state.toporag) return;
  const ctx = canvas.getContext('2d');

  const groups = state.toporag.module_groups;
  const labels = groups.map(g => g.label.split('/').pop().split('\\').pop());
  const counts = groups.map(g => g.count);

  state.charts.moduleDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: tokens.shades.slice(0, groups.length),
        borderColor: tokens.paper,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 }, boxWidth: 10 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw} (${groups[ctx.dataIndex].percentage}%)`
          }
        }
      },
      cutout: '60%'
    }
  });

  populateDataDrawer('drawer-module-donut', labels, ['Component Group', 'Failures', 'Share'], 
    groups.map(g => [g.label, g.count, `${g.percentage}%`])
  );
}

// 5. Cumulative Failures Over Time (matches RUN_3/failures_over_time.png)
function renderCumulativeFailuresChart(tokens) {
  const canvas = document.getElementById('chart-cumulative-failures');
  if (!canvas || !state.chronoos) return;
  const ctx = canvas.getContext('2d');

  const series = state.chronoos.cumulative_failures;
  // Sample every 10th for performance and clean line
  const sampled = series.filter((_, idx) => idx % 8 === 0 || idx === series.length - 1);
  const labels = sampled.map(d => d.timestamp.slice(11, 19));
  const values = sampled.map(d => d.cumulative);

  state.charts.cumulativeFailures = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cumulative Failures',
        data: values,
        borderColor: tokens.ink,
        backgroundColor: tokens.shades[5] + '55',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 2,
        pointBackgroundColor: tokens.ink
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)', size: 9 }, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-cumulative-failures', labels, ['Timestamp', 'Cumulative Failures'], 
    sampled.map(d => [d.timestamp, d.cumulative])
  );
}

// 6. Inter-Event Delta-T Histogram (matches RUN_3/inter_event_deltat_distribution.png)
function renderDeltaTHistChart(tokens) {
  const canvas = document.getElementById('chart-deltat-hist');
  if (!canvas || !state.chronoos) return;
  const ctx = canvas.getContext('2d');

  const bins = state.chronoos.deltat_histogram;
  const labels = bins.map(b => b.bin_label);
  const counts = bins.map(b => b.count);

  // Cross-hatch burst bins under 2.0s
  const diagonal = createDiagonalPattern(tokens.ink, tokens.paper2, 8);
  const bgColors = bins.map(b => b.is_burst_region ? diagonal : tokens.shades[4]);

  state.charts.deltaTHist = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Burst Frequency',
        data: counts,
        backgroundColor: bgColors,
        borderColor: tokens.ink,
        borderWidth: 1.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Delta-T Range: ${items[0].label}`,
            label: (ctx) => `${ctx.raw} failure intervals`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)', size: 9 }, maxRotation: 45 }
        },
        y: {
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-deltat-hist', labels, ['Interval Bin (Delta-T)', 'Interval Count', 'Burst Region (&lt;2s)'], 
    bins.map(b => [b.bin_label, b.count, b.is_burst_region ? 'YES (BURST)' : 'NO (DRIFT)'])
  );
}

// 7. Rolling Empirical Event Rate & Acceleration Proxy
function renderEmpiricalRateChart(tokens) {
  const canvas = document.getElementById('chart-empirical-rate');
  if (!canvas || !state.chronoos) return;
  const ctx = canvas.getContext('2d');

  const rateSeries = state.chronoos.empirical_event_rate;
  const labels = rateSeries.map(r => r.timestamp.slice(11, 16));
  const rates = rateSeries.map(r => r.event_rate_per_min);
  const accels = rateSeries.map(r => r.acceleration_proxy);

  state.charts.empiricalRate = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Empirical Event Rate (events/min)',
          data: rates,
          borderColor: tokens.ink,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: tokens.ink,
          yAxisID: 'y'
        },
        {
          label: 'Cascade Acceleration Proxy (Delta lambda)',
          data: accels,
          borderColor: tokens.ink3,
          borderDash: [4, 4],
          borderWidth: 1.5,
          pointRadius: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)', size: 9 }, maxTicksLimit: 12 }
        },
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: tokens.line },
          ticks: { color: tokens.ink, font: { family: 'var(--font-mono)' } }
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-empirical-rate', labels, ['Timestamp', 'Rate (events/min)', 'Acceleration Proxy'], 
    rateSeries.map(r => [r.timestamp, r.event_rate_per_min, r.acceleration_proxy])
  );
}

// 8. Duration Proxy Histogram (StateRAG)
function renderDurationProxyChart(tokens) {
  const canvas = document.getElementById('chart-duration-proxy');
  if (!canvas || !state.staterag || !state.staterag.available_proxy_metrics.histogram.length) return;
  const ctx = canvas.getContext('2d');

  const hist = state.staterag.available_proxy_metrics.histogram;
  const labels = hist.map(h => h.bin_range);
  const counts = hist.map(h => h.count);

  state.charts.durationProxy = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Duration Frequencies',
        data: counts,
        backgroundColor: tokens.shades[3],
        borderColor: tokens.ink,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)', size: 9 }, maxRotation: 30 }
        },
        y: {
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-duration-proxy', labels, ['Duration Bin (ms)', 'Count'], 
    hist.map(h => [h.bin_range, h.count])
  );
}

// 9. Conformal Distance Distribution (matches RUN_3/conformal_distance_distribution.png)
function renderConformalDistChart(tokens) {
  const canvas = document.getElementById('chart-conformal-dist');
  if (!canvas || !state.safeneuroos) return;
  const ctx = canvas.getContext('2d');

  const bins = state.safeneuroos.conformal_histogram;
  const labels = bins.map(b => b.bin_label);
  const counts = bins.map(b => b.count);

  const diagonal = createDiagonalPattern(tokens.ink, tokens.paper2, 8);
  const bgColors = bins.map(b => b.is_ood_bin ? diagonal : tokens.shades[2]);

  state.charts.conformalDist = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Incident Count',
        data: counts,
        backgroundColor: bgColors,
        borderColor: tokens.ink,
        borderWidth: 1.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Distance Range: ${items[0].label}`,
            label: (ctx) => `${ctx.raw} failure incidents`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)', size: 9 }, maxRotation: 45 }
        },
        y: {
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-conformal-dist', labels, ['Distance Range', 'Incident Count', 'Conformal Gating Region'], 
    bins.map(b => [b.bin_label, b.count, b.is_ood_bin ? 'OOD NOVEL (&gt;0.85)' : 'IN-DISTRIBUTION (&le;0.85)'])
  );
}

// 10. Severity Distribution Donut (matches RUN_3/severity_distribution.png)
function renderSeverityDonutChart(tokens) {
  const canvas = document.getElementById('chart-severity-donut');
  if (!canvas || !state.safeneuroos || !state.safeneuroos.severity_by_safety) return;
  const ctx = canvas.getContext('2d');

  const sevData = state.safeneuroos.severity_by_safety.filter(s => s.verified_safe > 0 || s.blocked > 0);
  const labels = sevData.map(s => `${s.severity} Severity`);
  const counts = sevData.map(s => s.verified_safe + s.blocked);
  const total = counts.reduce((acc, c) => acc + c, 0);

  state.charts.severityDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: [tokens.shades[4], tokens.ink],
        borderColor: tokens.paper,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw} (${total > 0 ? (ctx.raw / total * 100).toFixed(1) : 0}%)`
          }
        }
      }
    }
  });

  populateDataDrawer('drawer-severity-donut', labels, ['Severity Level', 'Count', 'Proportion'], 
    sevData.map((s, idx) => [s.severity, counts[idx], `${total > 0 ? (counts[idx] / total * 100).toFixed(1) : 0}%`])
  );
}

// 11. Severity Breakdown Split by Safety Outcome
function renderSeverityStackedChart(tokens) {
  const canvas = document.getElementById('chart-severity-stacked');
  if (!canvas || !state.safeneuroos) return;
  const ctx = canvas.getContext('2d');

  const items = state.safeneuroos.severity_by_safety;
  const labels = items.map(d => d.severity);
  const safeData = items.map(d => d.verified_safe);
  const blockedData = items.map(d => d.blocked);

  state.charts.severityStacked = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'VERIFIED_SAFE',
          data: safeData,
          backgroundColor: tokens.shades[3],
          borderColor: tokens.ink,
          borderWidth: 1
        },
        {
          label: 'BLOCKED / QUARANTINED',
          data: blockedData,
          backgroundColor: createDiagonalPattern(tokens.ink, tokens.paper2, 8),
          borderColor: tokens.ink,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: tokens.ink, font: { family: 'var(--font-mono)' } }
        },
        y: {
          stacked: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 } }
        }
      }
    }
  });

  populateDataDrawer('drawer-severity-stacked', labels, ['Severity', 'Verified Safe', 'Blocked'], 
    items.map(d => [d.severity, d.verified_safe, d.blocked])
  );
}

// 12. End-to-End Funnel Chart (TopoSafe-RAG)
function renderFunnelChart(tokens) {
  const canvas = document.getElementById('chart-funnel');
  if (!canvas) return;

  const stages = (state.toposaferag && state.toposaferag.funnel) ? state.toposaferag.funnel : [
    { stage: "1. Ingested Stream Events", count: 1746, pct: 100.0, source: "processed_events_analysis.csv" },
    { stage: "2. Triage Failures (status=FAILURE)", count: 471, pct: 26.98, source: "processed_events_analysis.csv" },
    { stage: "3. Conformal In-Distribution Retained", count: 471, pct: 26.98, source: "final_output_diagnosis.csv" },
    { stage: "4. POSIX Verified Safe Remediations", count: 471, pct: 26.98, source: "final_output_diagnosis.csv" }
  ];

  const labels = stages.map(s => s.stage);
  const counts = stages.map(s => s.count);

  // Always populate data drawer first so table is immediately viewable
  populateDataDrawer('drawer-funnel', labels, ['Pipeline Stage', 'Retained Count', 'Funnel Retention', 'Source CSV'], 
    stages.map(s => [s.stage, s.count, `${s.pct}%`, s.source])
  );

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const ctx = canvas.getContext('2d');

  // Intentional accent colors for data: bright cyan, green, yellow, orange
  const funnelColors = [
    'rgba(0, 229, 255, 0.85)',   // Bright Cyan: Raw Ingest
    'rgba(255, 171, 0, 0.85)',   // Orange: Triaged Failures
    'rgba(255, 234, 0, 0.85)',   // Yellow: Conformal Retained
    'rgba(0, 230, 118, 0.90)'    // Green: POSIX Verified Safe
  ];
  const funnelBorders = [
    '#00e5ff',
    '#ffab00',
    '#ffea00',
    '#00e676'
  ];

  state.charts.funnel = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Event Count',
        data: counts,
        backgroundColor: funnelColors.slice(0, stages.length),
        borderColor: funnelBorders.slice(0, stages.length),
        borderWidth: 1.5
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} events (${stages[ctx.dataIndex].pct}% of stream)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          grid: { display: false },
          ticks: { color: tokens.ink, font: { family: 'var(--font-sans)', weight: 'bold' } }
        }
      }
    }
  });
}

// -----------------------------------------------------------------------------
// CORRELATION CHARTS IMPLEMENTATION (1 PER SOLUTION SECTION)
// -----------------------------------------------------------------------------

function populateCorrelationAddon(containerId, stats) {
  const container = document.getElementById(containerId);
  if (!container || !stats) return;
  const rVal = (typeof stats.pearson_r === 'number') ? stats.pearson_r.toFixed(4) : '0.0000';
  const slope = (typeof stats.slope === 'number') ? stats.slope.toFixed(4) : '0.0000';
  const intercept = (typeof stats.intercept === 'number') ? (stats.intercept >= 0 ? `+ ${stats.intercept.toFixed(4)}` : `- ${Math.abs(stats.intercept).toFixed(4)}`) : '+ 0.0000';
  
  container.innerHTML = `
    <div class="correlation-stats-row">
      <span class="correlation-r-badge">
        <span>Pearson r =</span>
        <span class="num">${rVal}</span>
      </span>
      <span class="correlation-sub-meta">
        N = ${stats.n} paired observations &bull; Trend Line: <span class="num">y = ${slope}x ${intercept}</span>
      </span>
    </div>
    <div class="correlation-interpretation">
      <strong>Relationship:</strong> ${stats.interpretation}. ${stats.description || ''}
    </div>
    ${stats.causation_note ? `<div class="correlation-causation-disclaimer"><strong>Note on Causation:</strong> ${stats.causation_note}</div>` : ''}
  `;
}

// Helper to create OLS trend line dataset
function createTrendLineDataset(points, stats, tokens, label = 'Linear Trend Line (OLS)') {
  if (!points || points.length < 2 || !stats) return null;
  const xVals = points.map(p => p.x);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const slope = stats.slope || 0;
  const intercept = stats.intercept || 0;

  return {
    label: label,
    data: [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept }
    ],
    type: 'line',
    borderColor: tokens.ink3,
    borderWidth: 2,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false,
    tension: 0
  };
}

// 1. TopoRAG Correlation: Process Topology Blast Radius (PID 17896 vs PID 14920)
function renderTopoRAGCorrChart(tokens) {
  const canvas = document.getElementById('chart-toporag-corr');
  if (!canvas || !state.toporag || !state.toporag.correlation) return;
  const ctx = canvas.getContext('2d');
  const corr = state.toporag.correlation;
  const points = corr.points || [];
  const stats = corr.stats || {};

  populateCorrelationAddon('addon-toporag-corr', stats);

  const scatterData = points.map(p => ({ x: p.x, y: p.y, label: p.label, total: p.total_failures }));
  const trendDataset = createTrendLineDataset(points, stats, tokens);

  const datasets = [
    {
      label: 'Failure Category Observation',
      data: scatterData,
      type: 'scatter',
      backgroundColor: tokens.ink,
      borderColor: tokens.paper,
      borderWidth: 1.5,
      pointRadius: 6,
      pointHoverRadius: 8
    }
  ];
  if (trendDataset) datasets.push(trendDataset);

  state.charts.toporagCorr = new Chart(ctx, {
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const raw = items[0].raw;
              return raw.label ? `Event Type: ${raw.label}` : 'Trend Line Point';
            },
            label: (ctx) => {
              const raw = ctx.raw;
              if (raw.label) {
                return [
                  `Primary Worker (PID 17896): ${raw.x} failures`,
                  `Secondary Worker (PID 14920): ${raw.y} failures`,
                  `Cluster Total: ${raw.total} failures`
                ];
              }
              return `Trend: x=${ctx.parsed.x.toFixed(1)}, y=${ctx.parsed.y.toFixed(1)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Primary Worker Process (PID 17896) Failures',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Secondary Worker Process (PID 14920) Failures',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-toporag-corr', 
    points.map(p => p.label),
    ['Failure Category', 'PID 17896 Failures (X)', 'PID 14920 Failures (Y)', 'Cluster Total Failures'],
    points.map(p => [p.label, p.x, p.y, p.total_failures])
  );
}

// 2. ChronoOS Correlation: Event Arrival Rate vs Cascade Acceleration Proxy
function renderChronoCorrChart(tokens) {
  const canvas = document.getElementById('chart-chrono-corr');
  if (!canvas || !state.chronoos || !state.chronoos.correlation) return;
  const ctx = canvas.getContext('2d');
  const corr = state.chronoos.correlation;
  const points = corr.points || [];
  const stats = corr.stats || {};

  populateCorrelationAddon('addon-chrono-corr', stats);

  const scatterData = points.map(p => ({ x: p.x, y: p.y, time_label: p.time_label, timestamp: p.timestamp }));
  const trendDataset = createTrendLineDataset(points, stats, tokens);

  const datasets = [
    {
      label: '1-Minute Observation Interval',
      data: scatterData,
      type: 'scatter',
      backgroundColor: tokens.shades[2],
      borderColor: tokens.paper,
      borderWidth: 1,
      pointRadius: 5,
      pointHoverRadius: 7
    }
  ];
  if (trendDataset) datasets.push(trendDataset);

  state.charts.chronoCorr = new Chart(ctx, {
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const raw = items[0].raw;
              return raw.time_label ? `Window: ${raw.time_label} UTC` : 'Trend Line Point';
            },
            label: (ctx) => {
              const raw = ctx.raw;
              if (raw.time_label) {
                return [
                  `Event Rate lambda(t): ${raw.x} events/min`,
                  `Cascade Acceleration (Delta lambda): ${raw.y >= 0 ? '+' : ''}${raw.y}`
                ];
              }
              return `Trend: x=${ctx.parsed.x.toFixed(1)}, y=${ctx.parsed.y.toFixed(1)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Empirical Event Rate lambda(t) [events/min]',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Cascade Acceleration Proxy Delta lambda(t) [rate diff]',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-chrono-corr', 
    points.map(p => p.time_label),
    ['Window UTC', 'Empirical Rate lambda(t) (events/min)', 'Cascade Acceleration Proxy (Delta lambda)'],
    points.map(p => [p.timestamp.slice(11, 19), p.x, p.y])
  );
}

// 3. StateRAG Correlation: Endpoint URI Length vs Execution Duration Proxy
function renderStateRAGCorrChart(tokens) {
  const canvas = document.getElementById('chart-staterag-corr');
  if (!canvas || !state.staterag || !state.staterag.correlation) return;
  const ctx = canvas.getContext('2d');
  const corr = state.staterag.correlation;
  const endpoints = corr.endpoint_summary || [];
  const stats = corr.stats || {};

  populateCorrelationAddon('addon-staterag-corr', stats);

  // Grouped endpoints representation for clear visual readability
  const scatterData = endpoints.map(e => ({
    x: e.x,
    y: e.y,
    path: e.label,
    count: e.count,
    max_y: e.max_y,
    median_y: e.median_y
  }));

  const trendDataset = createTrendLineDataset(endpoints, stats, tokens, 'Linear Trend Line (OLS, N=544 Events)');

  const datasets = [
    {
      label: 'Unique Endpoint Profiles (N=544 Requests)',
      data: scatterData,
      type: 'scatter',
      backgroundColor: tokens.ink,
      borderColor: tokens.paper,
      borderWidth: 1.5,
      pointRadius: endpoints.map(e => Math.min(14, Math.max(5, Math.sqrt(e.count) * 1.8))),
      pointHoverRadius: 10
    }
  ];
  if (trendDataset) datasets.push(trendDataset);

  state.charts.stateRAGCorr = new Chart(ctx, {
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const raw = items[0].raw;
              return raw.path ? `Endpoint: ${raw.path}` : 'Trend Line Point';
            },
            label: (ctx) => {
              const raw = ctx.raw;
              if (raw.path) {
                return [
                  `Path URI Length: ${raw.x} characters`,
                  `Mean Latency: ${raw.y} ms`,
                  `Median Latency: ${raw.median_y} ms (Max: ${raw.max_y} ms)`,
                  `Sample Frequency: ${raw.count} events`
                ];
              }
              return `Trend: x=${ctx.parsed.x.toFixed(1)}, y=${ctx.parsed.y.toFixed(1)} ms`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Endpoint URI Path Character Length [chars]',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Execution Thread Latency Proxy (duration_ms) [ms]',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-staterag-corr',
    endpoints.map(e => e.label),
    ['Endpoint Path', 'URI Character Length', 'Event Volume', 'Mean Latency (ms)', 'Median Latency (ms)', 'Peak Latency (ms)'],
    endpoints.map(e => [e.label, e.x, e.count, `${e.y} ms`, `${e.median_y} ms`, `${e.max_y} ms`])
  );
}

// 4. SafeNeuroOS Correlation: Incident Document Length vs Conformal Distance s(z)
function renderSafeNeuroCorrChart(tokens) {
  const canvas = document.getElementById('chart-safeneuro-corr');
  if (!canvas || !state.safeneuroos || !state.safeneuroos.correlation) return;
  const ctx = canvas.getContext('2d');
  const corr = state.safeneuroos.correlation;
  const points = corr.points || [];
  const stats = corr.stats || {};

  populateCorrelationAddon('addon-safeneuro-corr', stats);

  const scatterData = points.map(p => ({
    x: p.x,
    y: p.y,
    id: p.id,
    label: p.label,
    event_type: p.event_type,
    severity: p.severity
  }));

  const trendDataset = createTrendLineDataset(points, stats, tokens);

  // Horizontal Conformal Threshold Line (tau = 0.85)
  const tauLineDataset = {
    label: 'Conformal Epistemic Bound (tau = 0.85)',
    data: [
      { x: stats.min_x || 270, y: 0.85 },
      { x: stats.max_x || 350, y: 0.85 }
    ],
    type: 'line',
    borderColor: tokens.ink,
    borderWidth: 1.5,
    borderDash: [2, 2],
    pointRadius: 0,
    fill: false,
    tension: 0
  };

  const datasets = [
    {
      label: 'Diagnosed Incident (N=471 Failures)',
      data: scatterData,
      type: 'scatter',
      backgroundColor: tokens.shades[3],
      borderColor: tokens.paper,
      borderWidth: 1,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ];
  if (trendDataset) datasets.push(trendDataset);
  datasets.push(tauLineDataset);

  state.charts.safeneuroCorr = new Chart(ctx, {
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const raw = items[0].raw;
              return raw.label ? raw.label : 'Reference Boundary Line';
            },
            label: (ctx) => {
              const raw = ctx.raw;
              if (raw.label) {
                return [
                  `Context Document Length: ${raw.x} characters`,
                  `Conformal Distance: ${raw.y.toFixed(4)}`,
                  `Severity: ${raw.severity}`,
                  `Status: ${raw.y <= 0.85 ? 'IN-DISTRIBUTION (SAFE)' : 'OOD QUARANTINE'}`
                ];
              }
              return `Threshold: y = ${ctx.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Context Incident Document Character Length [chars]',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          type: 'linear',
          min: 0.2,
          max: 0.9,
          title: {
            display: true,
            text: 'Conformal Retrieval Non-Conformity Distance s(z)',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });

  populateDataDrawer('drawer-safeneuro-corr',
    points.slice(0, 50).map(p => p.label),
    ['Incident ID', 'Event Category', 'Context Document Chars', 'Conformal Distance s(z)', 'Epistemic Region'],
    points.slice(0, 50).map(p => [`#${p.id}`, p.event_type, p.x, p.y.toFixed(4), p.y <= 0.85 ? 'IN-DISTRIBUTION (<=0.85)' : 'OOD NOVEL'])
  );
}

// 5. TopoSafe-RAG Correlation: Pipeline Ingest Volume vs Triage Failure Rate
// 5. TopoSafe-RAG Correlation: Pipeline Ingest Volume vs Triage Failure Rate
function renderTopoSafeCorrChart(tokens) {
  const canvas = document.getElementById('chart-toposafe-corr');
  if (!canvas) return;

  const corr = (state.toposaferag && state.toposaferag.correlation) ? state.toposaferag.correlation : {
    stats: { n: 41, pearson_r: 0.8902, slope: 0.4446, intercept: -7.4444, interpretation: "Very Strong Positive Linear Correlation" },
    points: [
      { timestamp: "2026-02-20T13:00:00+00:00", time_label: "13:00", x: 2, y: 1 },
      { timestamp: "2026-02-20T13:04:00+00:00", time_label: "13:04", x: 3, y: 3 },
      { timestamp: "2026-02-20T13:35:00+00:00", time_label: "13:35", x: 7, y: 2 },
      { timestamp: "2026-02-20T13:38:00+00:00", time_label: "13:38", x: 29, y: 6 },
      { timestamp: "2026-02-20T13:39:00+00:00", time_label: "13:39", x: 74, y: 28 },
      { timestamp: "2026-02-20T13:40:00+00:00", time_label: "13:40", x: 67, y: 22 },
      { timestamp: "2026-02-20T13:41:00+00:00", time_label: "13:41", x: 102, y: 46 }
    ]
  };

  const points = corr.points || [];
  const stats = corr.stats || {};

  populateCorrelationAddon('addon-toposafe-corr', stats);

  // Always populate data drawer first so table is immediately ready
  populateDataDrawer('drawer-toposafe-corr',
    points.map(p => p.time_label || p.timestamp),
    ['Window UTC', 'Raw Ingest Events/min (X)', 'Triaged Failures/min (Y)', 'Triage Extraction Ratio'],
    points.map(p => [p.timestamp.slice(11, 19), p.x, p.y, `${p.x > 0 ? ((p.y / p.x) * 100).toFixed(1) : 0}%`])
  );

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const ctx = canvas.getContext('2d');
  const scatterData = points.map(p => ({
    x: p.x,
    y: p.y,
    time_label: p.time_label,
    timestamp: p.timestamp
  }));

  const trendDataset = createTrendLineDataset(points, stats, tokens, 'OLS Regression Trend Line (r = 0.8902)');
  if (trendDataset) {
    trendDataset.borderColor = '#ffab00'; // Vibrant Orange
    trendDataset.borderWidth = 2.5;
    trendDataset.borderDash = [6, 4];
  }

  const datasets = [
    {
      label: 'Active 1-Minute Telemetry Stream Windows (N=41)',
      data: scatterData,
      type: 'scatter',
      backgroundColor: '#00e5ff', // Bright Cyan
      borderColor: '#ffffff',    // White ring
      borderWidth: 1.5,
      pointRadius: 5.5,
      pointHoverRadius: 8.5
    }
  ];
  if (trendDataset) datasets.push(trendDataset);

  state.charts.toposafeCorr = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const raw = items[0].raw;
              return raw.time_label ? `Interval: ${raw.time_label} UTC` : 'Trend Line Point';
            },
            label: (ctx) => {
              const raw = ctx.raw;
              if (raw && raw.time_label) {
                const triageRatio = raw.x > 0 ? ((raw.y / raw.x) * 100).toFixed(1) : '0.0';
                return [
                  `Ingested Events: ${raw.x} events/min`,
                  `Triaged Failures: ${raw.y} incidents/min`,
                  `Failure Ratio: ${triageRatio}%`
                ];
              }
              return `Trend: x=${ctx.parsed.x.toFixed(1)}, y=${ctx.parsed.y.toFixed(1)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Raw Telemetry Ingest Volume [events/min]',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Triaged Failures (status=FAILURE) [incidents/min]',
            color: tokens.ink,
            font: { family: 'var(--font-mono)', size: 11, weight: 'bold' }
          },
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });
}

// 6. TopoSafe-RAG Pipeline Stage Accounting Bar Chart
function renderTopoSafeStagesChart(tokens) {
  const canvas = document.getElementById('chart-toposafe-stages');
  if (!canvas) return;

  const stages = (state.toposaferag && state.toposaferag.stage_breakdown) ? state.toposaferag.stage_breakdown : [
    { stage: "1. Ingest Stream", in_count: 1746, out_count: 471, dropped: 1275, drop_reason: "Filtered benign SUCCESS events" },
    { stage: "2. Causal Encoder", in_count: 471, out_count: 471, dropped: 0, drop_reason: "Topological + Hawkes time features attached" },
    { stage: "3. Conformal Gate", in_count: 471, out_count: 471, dropped: 0, drop_reason: "All s(z) <= 0.85 (0 OOD quarantined)" },
    { stage: "4. Reasoner (FLAN-T5)", in_count: 471, out_count: 471, dropped: 0, drop_reason: "Contextual diagnoses & fixes synthesized" },
    { stage: "5. POSIX Validator", in_count: 471, out_count: 471, dropped: 0, drop_reason: "Checked against INV-1..6 (0 blocked)" }
  ];

  const labels = stages.map(s => s.stage);
  const inCounts = stages.map(s => s.in_count);
  const droppedCounts = stages.map(s => s.dropped);

  // Always populate data drawer first so table is immediately viewable
  populateDataDrawer('drawer-toposafe-stages',
    labels,
    ['Pipeline Stage', 'Input Count', 'Retained Count', 'Filtered / Dropped', 'Filter Disposition'],
    stages.map(s => [s.stage, s.in_count, s.out_count, s.dropped, s.drop_reason])
  );

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const ctx = canvas.getContext('2d');
  state.charts.toposafeStages = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Events Processed / Retained',
          data: inCounts,
          backgroundColor: '#00e676', // Bright Green
          borderColor: '#ffffff',
          borderWidth: 1.5
        },
        {
          label: 'Events Filtered / Dropped',
          data: droppedCounts,
          backgroundColor: 'rgba(255, 171, 0, 0.75)', // Accent Orange
          borderColor: '#ffab00',
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            footer: (items) => {
              const idx = items[0].dataIndex;
              return `Note: ${stages[idx].drop_reason}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink, font: { family: 'var(--font-sans)', size: 10, weight: 'bold' } }
        },
        y: {
          type: 'linear',
          beginAtZero: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });
}

// 7. TopoSafe-RAG Incident Taxonomy Chart
function renderTopoSafeTaxonomyChart(tokens) {
  const canvas = document.getElementById('chart-toposafe-taxonomy');
  if (!canvas) return;

  const evts = (state.toposaferag && state.toposaferag.event_type_breakdown) ? state.toposaferag.event_type_breakdown : [
    { event_type: "SERVER_ERROR", count: 194, percentage: 41.19 },
    { event_type: "ROUTING_ERROR", count: 110, percentage: 23.35 },
    { event_type: "LOG", count: 67, percentage: 14.23 },
    { event_type: "HTTP_EXCEPTION", count: 50, percentage: 10.62 },
    { event_type: "DB_ERROR", count: 33, percentage: 7.01 },
    { event_type: "HTTP_ERROR", count: 17, percentage: 3.61 }
  ];

  const labels = evts.map(e => e.event_type);
  const counts = evts.map(e => e.count);

  // Always populate data drawer first so table is immediately viewable
  populateDataDrawer('drawer-toposafe-taxonomy',
    labels,
    ['Event Type Taxonomy', 'Incident Count', 'Workload Share (%)', 'POSIX Impact'],
    evts.map(e => [e.event_type, e.count, `${e.percentage}%`, 'Verified Remediated'])
  );

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const ctx = canvas.getContext('2d');
  const taxonomyColors = [
    '#00e5ff', // SERVER_ERROR: Bright Cyan (dominant)
    '#ffab00', // ROUTING_ERROR: Bright Orange
    '#ffea00', // LOG: Bright Yellow
    '#00e676', // HTTP_EXCEPTION: Bright Green
    '#ffffff', // DB_ERROR: Pure White
    'rgba(0, 229, 255, 0.45)' // HTTP_ERROR: Cyan tint
  ];
  const taxonomyBorders = [
    '#00e5ff',
    '#ffab00',
    '#ffea00',
    '#00e676',
    '#ffffff',
    '#00e5ff'
  ];

  state.charts.toposafeTaxonomy = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Failure Count (N=471)',
          data: counts,
          backgroundColor: taxonomyColors.slice(0, labels.length),
          borderColor: taxonomyBorders.slice(0, labels.length),
          borderWidth: 1.5
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} failures (${evts[ctx.dataIndex].percentage}% of total)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)' } }
        },
        y: {
          grid: { display: false },
          ticks: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10, weight: 'bold' } }
        }
      }
    }
  });
}

// 8. TopoSafe-RAG Dual-Session Cumulative Timeline Chart
function renderTopoSafeTimelineChart(tokens) {
  const canvas = document.getElementById('chart-toposafe-timeline');
  if (!canvas) return;

  const series = (state.chronoos && state.chronoos.cumulative_failures) 
    ? state.chronoos.cumulative_failures 
    : [
      { timestamp: "2026-02-20T13:00:00+00:00", cumulative: 1 },
      { timestamp: "2026-02-20T13:30:00+00:00", cumulative: 25 },
      { timestamp: "2026-02-20T13:45:00+00:00", cumulative: 140 },
      { timestamp: "2026-02-20T14:00:00+00:00", cumulative: 300 },
      { timestamp: "2026-02-21T05:00:00+00:00", cumulative: 310 },
      { timestamp: "2026-02-21T05:30:00+00:00", cumulative: 400 },
      { timestamp: "2026-02-21T05:50:00+00:00", cumulative: 471 }
    ];
  
  const step = Math.ceil(series.length / 50);
  const sampled = series.filter((_, i) => i % step === 0 || i === series.length - 1);

  // Always populate data drawer first so table is immediately viewable
  populateDataDrawer('drawer-toposafe-timeline',
    sampled.map(p => p.timestamp),
    ['UTC Timestamp', 'Cumulative Failure Diagnoses', 'Phase State'],
    sampled.map(p => [p.timestamp, p.cumulative, p.cumulative <= 300 ? 'Session 1 Active Burst' : 'Session 2 Post-Drift Recovery'])
  );

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const ctx = canvas.getContext('2d');
  let bgFill = 'rgba(0, 229, 255, 0.15)';
  try {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0.02)');
    bgFill = gradient;
  } catch (e) {
    // Fallback
  }

  state.charts.toposafeTimeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sampled.map(p => p.timestamp.slice(11, 16)),
      datasets: [
        {
          label: 'Cumulative Telemetry Incidents Diagnosed',
          data: sampled.map(p => p.cumulative),
          borderColor: '#00e5ff', // Bright Cyan line
          backgroundColor: bgFill,
          borderWidth: 2.5,
          pointBackgroundColor: '#ffffff', // White points
          pointBorderColor: '#00e5ff',
          pointBorderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.15
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: tokens.ink, font: { family: 'var(--font-mono)', size: 10 } }
        },
        tooltip: {
          callbacks: {
            title: (items) => `Timestamp: ${sampled[items[0].dataIndex].timestamp} UTC`,
            label: (ctx) => `Cumulative Diagnoses: ${ctx.raw} / 471`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tokens.ink3, font: { family: 'var(--font-mono)', size: 9 }, maxTicksLimit: 12 }
        },
        y: {
          beginAtZero: true,
          grid: { color: tokens.line },
          ticks: { color: tokens.ink, font: { family: 'var(--font-mono)' } }
        }
      }
    }
  });
}


// -----------------------------------------------------------------------------
// PROVENANCE EXPLORER & INCIDENT DRAWER
// -----------------------------------------------------------------------------
function renderProvenanceTable() {
  const tbody = document.getElementById('provenance-tbody');
  if (!tbody) return;

  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = startIdx + state.pageSize;
  const pageData = state.filteredIncidents.slice(startIdx, endIdx);

  tbody.innerHTML = pageData.map(inc => `
    <tr onclick="openIncidentDrawer(${inc.id})" style="cursor: pointer;" title="Click to view full diagnosis in drawer">
      <td class="num font-mono">#${inc.id}</td>
      <td class="font-mono">${inc.hostname}</td>
      <td class="num font-mono">${inc.process_id}</td>
      <td class="font-mono">${inc.trace_id.slice(0, 8)}</td>
      <td class="font-mono">${inc.module.split('/').pop().split('\\').pop()}:${inc.line}</td>
      <td><strong>${inc.event_type}</strong></td>
      <td><span class="badge-tag">${inc.severity}</span></td>
      <td><span class="badge-tag">${inc.safety_verification}</span></td>
      <td class="num font-mono">${inc.conformal_retrieval_distance.toFixed(4)}</td>
    </tr>
  `).join('');

  // Update pagination info
  const totalPages = Math.ceil(state.filteredIncidents.length / state.pageSize) || 1;
  const infoEl = document.getElementById('table-pagination-info');
  if (infoEl) {
    infoEl.textContent = `Showing page ${state.currentPage} of ${totalPages} (${state.filteredIncidents.length} total incidents)`;
  }
}

function openIncidentDrawer(incidentId) {
  const inc = state.incidents.find(i => i.id === incidentId);
  if (!inc) return;

  document.getElementById('drawer-incident-title').textContent = `Incident #${inc.id} Diagnostics`;
  document.getElementById('d-timestamp').textContent = inc.timestamp;
  document.getElementById('d-provenance').textContent = `Host: ${inc.hostname} | PID: ${inc.process_id} | Trace: ${inc.trace_id} | Module: ${inc.module}:${inc.line} ${inc.method} ${inc.path}`;
  document.getElementById('d-event-sev').innerHTML = `<strong>${inc.event_type}</strong> [Category: ${inc.category}] &bull; Severity: <span class="badge-tag">${inc.severity}</span>`;
  document.getElementById('d-raw-msg').textContent = inc.message || '(Empty raw message)';
  document.getElementById('d-topo-doc').textContent = inc.incident_doc;
  document.getElementById('d-ai-diag').textContent = inc.ai_diagnosis;
  document.getElementById('d-conformal-dist').textContent = `${inc.conformal_retrieval_distance.toFixed(4)} (Threshold tau=0.85 -> ${inc.is_ood ? 'OUT-OF-DISTRIBUTION' : 'IN-DISTRIBUTION'})`;
  document.getElementById('d-safety-gate').innerHTML = `<span class="badge-tag ${inc.safety_verification === 'VERIFIED_SAFE' ? 'highlight' : ''}">${inc.safety_verification}</span> &bull; 0 POSIX Invariant Violations`;

  const overlay = document.getElementById('incident-drawer-overlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeIncidentDrawer() {
  const overlay = document.getElementById('incident-drawer-overlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

// -----------------------------------------------------------------------------
// DATA DRAWER HELPER (Accessible Underlying Tables)
// -----------------------------------------------------------------------------
function toggleDataDrawer(drawerId, btn) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  
  if (!btn && window.event && window.event.target) {
    btn = window.event.target.closest('button');
  }

  const isClosed = !drawer.classList.contains('open') && drawer.style.display !== 'block';
  if (isClosed) {
    drawer.classList.add('open');
    drawer.style.display = 'block';
    if (btn) btn.textContent = 'Hide Data';
  } else {
    drawer.classList.remove('open');
    drawer.style.display = 'none';
    if (btn) btn.textContent = 'View Data';
  }
}

function populateDataDrawer(drawerId, labels, headers, rows) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;

  drawer.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${r.map(cell => `<td class="font-mono">${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// EXPORT HELPERS (PNG and CSV)
// -----------------------------------------------------------------------------
function downloadChartPNG(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function exportFilteredIncidentsCSV() {
  if (!state.filteredIncidents.length) return;
  const headers = ['id', 'timestamp', 'hostname', 'process_id', 'trace_id', 'module', 'line', 'event_type', 'severity', 'safety_verification', 'conformal_distance', 'ai_diagnosis'];
  const rows = state.filteredIncidents.map(i => [
    i.id,
    `"${i.timestamp}"`,
    `"${i.hostname}"`,
    i.process_id,
    `"${i.trace_id}"`,
    `"${i.module}"`,
    i.line,
    `"${i.event_type}"`,
    `"${i.severity}"`,
    `"${i.safety_verification}"`,
    i.conformal_retrieval_distance,
    `"${(i.ai_diagnosis || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'genos_diagnosed_incidents.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// -----------------------------------------------------------------------------
// EVENT LISTENERS & FILTERING
// -----------------------------------------------------------------------------
function setupEventListeners() {
  // Theme Inversion Toggle
  const themeBtn = document.getElementById('theme-toggle');
  const themeText = document.getElementById('theme-mode-text');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      state.theme = next;
      if (themeText) {
        themeText.textContent = next.toUpperCase();
      }
      renderAllCharts();
    });
  }

  // Filter Selects
  const filterEvent = document.getElementById('filter-event');
  const filterSeverity = document.getElementById('filter-severity');
  const filterSafety = document.getElementById('filter-safety');
  const filterReset = document.getElementById('filter-reset-btn');

  function applyFilters() {
    state.filters.eventType = filterEvent.value;
    state.filters.severity = filterSeverity.value;
    state.filters.safety = filterSafety.value;

    state.filteredIncidents = state.incidents.filter(inc => {
      const matchEvent = state.filters.eventType === 'ALL' || inc.event_type === state.filters.eventType;
      const matchSeverity = state.filters.severity === 'ALL' || inc.severity === state.filters.severity;
      const matchSafety = state.filters.safety === 'ALL' || 
        (state.filters.safety === 'VERIFIED_SAFE' ? inc.safety_verification === 'VERIFIED_SAFE' : inc.safety_verification !== 'VERIFIED_SAFE');
      return matchEvent && matchSeverity && matchSafety;
    });

    state.currentPage = 1;
    renderProvenanceTable();
  }

  if (filterEvent) filterEvent.addEventListener('change', applyFilters);
  if (filterSeverity) filterSeverity.addEventListener('change', applyFilters);
  if (filterSafety) filterSafety.addEventListener('change', applyFilters);

  if (filterReset) {
    filterReset.addEventListener('click', () => {
      filterEvent.value = 'ALL';
      filterSeverity.value = 'ALL';
      filterSafety.value = 'ALL';
      applyFilters();
    });
  }

  // Pagination
  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderProvenanceTable();
      }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const totalPages = Math.ceil(state.filteredIncidents.length / state.pageSize);
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderProvenanceTable();
      }
    });
  }

  // Export CSV
  const btnExport = document.getElementById('btn-export-provenance-csv');
  if (btnExport) btnExport.addEventListener('click', exportFilteredIncidentsCSV);

  // Drawer Close
  const closeBtn = document.getElementById('drawer-close-btn');
  const overlay = document.getElementById('incident-drawer-overlay');
  if (closeBtn) closeBtn.addEventListener('click', closeIncidentDrawer);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeIncidentDrawer();
    });
  }

  // Keyboard navigation & Esc key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeIncidentDrawer();
  });

  // Active Nav Link Scrollspy
  window.addEventListener('scroll', () => {
    const sections = ['sec-overview', 'sec-toporag', 'sec-chronoos', 'sec-staterag', 'sec-safeneuroos', 'sec-toposaferag'];
    let currentActive = sections[0];
    sections.forEach(secId => {
      const el = document.getElementById(secId);
      if (el) {
        const top = el.getBoundingClientRect().top;
        if (top <= 120) currentActive = secId;
      }
    });

    sections.forEach(secId => {
      const navId = 'nav-' + secId.replace('sec-', '');
      const navEl = document.getElementById(navId);
      if (navEl) {
        if (secId === currentActive) navEl.classList.add('active');
        else navEl.classList.remove('active');
      }
    });
  });
}

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAllData();
});
