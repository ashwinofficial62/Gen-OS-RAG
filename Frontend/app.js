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
  }
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

  renderMCDAChart(tokens);
  renderEventTypesChart(tokens);
  renderTopFilesChart(tokens);
  renderModuleMatrixChart(tokens);
  renderModuleDonutChart(tokens);
  renderCumulativeFailuresChart(tokens);
  renderDeltaTHistChart(tokens);
  renderEmpiricalRateChart(tokens);
  renderDurationProxyChart(tokens);
  renderConformalDistChart(tokens);
  renderSeverityDonutChart(tokens);
  renderSeverityStackedChart(tokens);
  renderFunnelChart(tokens);
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
  if (!canvas || !state.toposaferag) return;
  const ctx = canvas.getContext('2d');

  const stages = state.toposaferag.funnel;
  const labels = stages.map(s => s.stage);
  const counts = stages.map(s => s.count);

  state.charts.funnel = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Event Count',
        data: counts,
        backgroundColor: tokens.shades.slice(0, stages.length),
        borderColor: tokens.ink,
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

  populateDataDrawer('drawer-funnel', labels, ['Pipeline Stage', 'Retained Count', 'Funnel Retention', 'Source CSV'], 
    stages.map(s => [s.stage, s.count, `${s.pct}%`, s.source])
  );
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
function toggleDataDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) {
    drawer.classList.toggle('open');
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
