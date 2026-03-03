/**
 * Radar / Spider chart view renderer.
 * Produces an SVG-based radar chart inside a `.slide` container.
 * Zero dependencies — pure string rendering, consistent with the app's innerHTML pipeline.
 */
import { esc } from '../utils/render.js';

/* ── Tool colour palette ── */
const TOOL_COLORS = {
  'claude-code': '#5b6abf',
  'codex':       '#9b59b6',
  'copilot':     '#1f6feb',
  'ide':         '#6a8a5a',
  'cowork':      '#2b7f6e',
  'custom':      '#c47d20',
};

/* ── Capability colour palette (flipped mode) ── */
const CAP_COLORS = {
  'knowledge-gen':    '#d4782a',
  'demand-assistant': '#7a5ab5',
  'biz-intent':       '#b8943a',
  'tech-spec':        '#2b7f6e',
  'builder':          '#5b6abf',
  'quality':          '#c25060',
};

/* ── Chart geometry ── */
const SVG_W    = 680;          // wide enough for axis labels on both sides
const SVG_H    = 560;          // tall enough for top/bottom labels
const CX       = SVG_W / 2;
const CY       = SVG_H / 2;
const MAX_SCORE = 4;
const RADIUS   = 190;          // outer ring radius
const LABEL_PAD = 24;          // extra px for axis labels beyond outer ring

/**
 * Compute (x, y) for a point on the radar at a given axis index and score value.
 * Axis 0 points straight up (−90°).
 */
function axisPoint(axisIndex, totalAxes, score) {
  const angle = (2 * Math.PI * axisIndex) / totalAxes - Math.PI / 2;
  const r = (score / MAX_SCORE) * RADIUS;
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
  };
}

/**
 * Build polygon points string for one ring at a constant score value.
 */
function ringPoints(totalAxes, score) {
  return Array.from({ length: totalAxes }, (_, i) => {
    const p = axisPoint(i, totalAxes, score);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

/**
 * Render concentric grid polygons (scores 1 → 4).
 */
function renderGrid(totalAxes) {
  let svg = '';
  for (let s = 1; s <= MAX_SCORE; s++) {
    svg += `<polygon points="${ringPoints(totalAxes, s)}" fill="none" stroke="rgba(28,43,58,0.12)" stroke-width="1"/>`;
  }
  return svg;
}

/**
 * Render spoke lines from center to each axis tip.
 */
function renderSpokes(totalAxes) {
  let svg = '';
  for (let i = 0; i < totalAxes; i++) {
    const tip = axisPoint(i, totalAxes, MAX_SCORE);
    svg += `<line x1="${CX}" y1="${CY}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" stroke="rgba(28,43,58,0.10)" stroke-width="1"/>`;
  }
  return svg;
}

/**
 * Render axis labels at each tip.
 * @param {Array<{label: string, prefix?: string}>} axisItems
 */
function renderAxisLabels(axisItems) {
  const n = axisItems.length;
  return axisItems.map((item, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const r = RADIUS + LABEL_PAD;
    const x = CX + r * Math.cos(angle);
    const y = CY + r * Math.sin(angle);

    // Determine text-anchor based on position
    let anchor = 'middle';
    if (Math.cos(angle) > 0.1) anchor = 'start';
    else if (Math.cos(angle) < -0.1) anchor = 'end';

    // Vertical nudge: top labels go up, bottom go down
    const dy = Math.sin(angle) > 0.1 ? 14 : (Math.sin(angle) < -0.1 ? -4 : 4);

    const shortName = item.label.length > 28 ? item.label.slice(0, 26) + '\u2026' : item.label;

    const prefixSpan = item.prefix
      ? `<tspan font-family="'JetBrains Mono', monospace" font-size="9" fill="#7A8A99">${esc(item.prefix)} </tspan>`
      : '';

    return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" font-family="'Sora', sans-serif" font-size="10" fill="#4E6070" font-weight="600">${prefixSpan}${esc(shortName)}</text>`;
  }).join('');
}

/**
 * Render score labels (1–4) along the first spoke.
 */
function renderScoreLabels(totalAxes) {
  let svg = '';
  for (let s = 1; s <= MAX_SCORE; s++) {
    const p = axisPoint(0, totalAxes, s);
    svg += `<text x="${(p.x + 8).toFixed(1)}" y="${(p.y - 4).toFixed(1)}" font-family="'JetBrains Mono', monospace" font-size="9" fill="#7A8A99">${s}</text>`;
  }
  return svg;
}

/**
 * Render one filled polygon for a single series.
 * @param {string} seriesId
 * @param {string} color
 * @param {Array<string>} axisIds - ordered axis IDs
 * @param {Object} scores - { axisId: { seriesId: number } }
 * @param {number} totalAxes
 */
function renderSeriesPolygon(seriesId, color, axisIds, scores, totalAxes) {
  const points = axisIds.map((axisId, i) => {
    const score = (scores[axisId] && scores[axisId][seriesId]) || 0;
    const p = axisPoint(i, totalAxes, score);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  return `<polygon points="${points}" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-opacity="0.7" stroke-width="2"/>`;
}

/**
 * Render score dots at polygon vertices for a single series.
 */
function renderSeriesDots(seriesId, color, axisIds, scores, totalAxes) {
  return axisIds.map((axisId, i) => {
    const score = (scores[axisId] && scores[axisId][seriesId]) || 0;
    const p = axisPoint(i, totalAxes, score);
    return `<circle class="radar-dot" data-axis-id="${axisId}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  }).join('');
}

/**
 * Render score pill labels at each vertex for a single series.
 * Hidden by default — shown when the series group is highlighted via hover.
 * Score = 0 vertices are skipped (no data / N/A).
 */
function renderSeriesScoreLabels(seriesId, color, axisIds, scores, totalAxes) {
  const PILL_OFFSET = 14;

  return axisIds.map((axisId, i) => {
    const score = (scores[axisId] && scores[axisId][seriesId]) || 0;
    if (score === 0) return '';

    const label = Number.isInteger(score) ? String(score) : score.toFixed(1);
    const angle = (2 * Math.PI * i) / totalAxes - Math.PI / 2;
    const vertex = axisPoint(i, totalAxes, score);
    const x = vertex.x + PILL_OFFSET * Math.cos(angle);
    const y = vertex.y + PILL_OFFSET * Math.sin(angle);

    const textW = label.length * 7 + 6;
    const pillH = 16;

    return `<g class="radar-score-label">` +
      `<rect x="${(x - textW / 2).toFixed(1)}" y="${(y - pillH / 2).toFixed(1)}" width="${textW}" height="${pillH}" rx="4" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-opacity="0.25" stroke-width="0.5"/>` +
      `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="600" fill="${color}">${label}</text>` +
      `</g>`;
  }).join('');
}

/**
 * Wrap polygon + dots + score labels for one series in a group element.
 */
function renderSeriesGroup(seriesId, color, axisIds, scores, totalAxes) {
  return `<g class="radar-series-group" data-series-id="${seriesId}">` +
    renderSeriesPolygon(seriesId, color, axisIds, scores, totalAxes) +
    renderSeriesDots(seriesId, color, axisIds, scores, totalAxes) +
    renderSeriesScoreLabels(seriesId, color, axisIds, scores, totalAxes) +
    `</g>`;
}

/**
 * Render the legend row below the chart.
 * @param {Array<{id: string, label: string, color: string}>} seriesItems
 */
function renderLegend(seriesItems) {
  const items = seriesItems.map(s => {
    return `<div class="radar-legend-item" data-series-id="${s.id}"><div class="radar-legend-swatch" style="background:${s.color}"></div><span>${esc(s.label)}</span></div>`;
  }).join('');
  return `<div class="radar-legend">${items}</div>`;
}

/**
 * Transpose a scores map: { dimA: { dimB: n } } → { dimB: { dimA: n } }
 */
function transposeScores(scores) {
  const result = {};
  for (const a of Object.keys(scores)) {
    for (const b of Object.keys(scores[a])) {
      if (!result[b]) result[b] = {};
      result[b][a] = scores[a][b];
    }
  }
  return result;
}

/**
 * Render the dimension toggle buttons above the chart SVG.
 */
function renderDimensionToggle(flipped) {
  const normalActive = flipped ? '' : ' active';
  const flippedActive = flipped ? ' active' : '';
  return `<div class="radar-dim-toggle">` +
    `<button class="radar-dim-btn${normalActive}" data-radar-flipped="false">Capabilities as axes</button>` +
    `<button class="radar-dim-btn${flippedActive}" data-radar-flipped="true">Tools as axes</button>` +
    `</div>`;
}

/* ── Public API ── */

/**
 * Build scores map from comparison.json for radar chart.
 * Returns { capId: { toolId: number } }
 */
export function buildComparisonScores(tools, capabilities, comparison) {
  const scores = {};
  for (const cap of capabilities) {
    scores[cap.id] = {};
    for (const tool of tools) {
      const entry = comparison[cap.id] && comparison[cap.id][tool.id];
      scores[cap.id][tool.id] = entry ? entry.score : 0;
    }
  }
  return scores;
}

/**
 * Build scores map from functionality.json for radar chart.
 * Converts function-level string scores ("s1"→1 … "s4"→4, "na"→skip) into per-capability averages.
 * Returns { capId: { toolId: number } }
 */
export function computeFunctionalityScores(tools, capabilities, functionality) {
  const scores = {};
  for (const cap of capabilities) {
    scores[cap.id] = {};
    // Find the matching functionality group
    const group = functionality.find(g => g.capabilityId === cap.id);
    if (!group || !group.functions || group.functions.length === 0) {
      for (const tool of tools) scores[cap.id][tool.id] = 0;
      continue;
    }
    for (const tool of tools) {
      let sum = 0;
      let count = 0;
      for (const fn of group.functions) {
        const raw = fn.scores && fn.scores[tool.id];
        if (!raw || raw === 'na') continue;
        const num = parseInt(raw.replace('s', ''), 10);
        if (!isNaN(num)) {
          sum += num;
          count++;
        }
      }
      scores[cap.id][tool.id] = count > 0 ? sum / count : 0;
    }
  }
  return scores;
}

/**
 * Render a full radar chart slide.
 * @param {Array} tools - Filtered tool objects
 * @param {Array} capabilities - Filtered capability objects
 * @param {Object} scores - { capId: { toolId: number } }
 * @param {string} title - Slide title
 * @param {boolean} flipped - If true, tools become axes and capabilities become polygons
 * @param {Object|null} details - Raw comparison data { capId: { toolId: { label, actions, chip } } } for tooltips
 * @returns {string} HTML string
 */
export function renderRadarChart(tools, capabilities, scores, title, flipped = false, details = null) {
  // Set up axes and series based on mode
  let axes, axisIds, axisLabels, seriesItems, chartScores, axisNoun;

  if (flipped) {
    // Flipped: tools = axes, capabilities = series (polygons)
    axes = tools;
    axisIds = tools.map(t => t.id);
    axisLabels = tools.map(t => ({ label: t.name }));
    seriesItems = capabilities.map(c => ({
      id: c.id,
      label: c.name,
      color: CAP_COLORS[c.id] || '#888',
    }));
    chartScores = transposeScores(scores);
    axisNoun = 'tools';
  } else {
    // Normal: capabilities = axes, tools = series (polygons)
    axes = capabilities;
    axisIds = capabilities.map(c => c.id);
    axisLabels = capabilities.map(c => ({ prefix: c.number, label: c.name }));
    seriesItems = tools.map(t => ({
      id: t.id,
      label: t.name,
      color: TOOL_COLORS[t.id] || '#888',
    }));
    chartScores = scores;
    axisNoun = 'capabilities';
  }

  const toggle = renderDimensionToggle(flipped);

  if (axes.length < 3) {
    return `<div class="slide">
  <div class="hdr">
    <div class="hdr-title">${esc(title)}</div>
  </div>
  <div class="radar-body">
    ${toggle}
    <div class="radar-min-msg">Select at least 3 ${axisNoun} to display the radar chart.</div>
  </div>
</div>`;
  }

  const n = axes.length;
  const viewBox = `0 0 ${SVG_W} ${SVG_H}`;
  const subtitle = flipped ? 'per tool' : 'per capability';

  // Build tooltip data map from raw comparison details
  let tooltipDataHtml = '';
  if (details) {
    const tooltipMap = {};
    for (const s of seriesItems) {
      for (const axisId of axisIds) {
        const capId = flipped ? s.id : axisId;
        const toolId = flipped ? axisId : s.id;
        const entry = details[capId] && details[capId][toolId];
        if (entry) {
          tooltipMap[`${axisId}:${s.id}`] = {
            score: entry.score,
            label: entry.label,
            actions: entry.actions || [],
            chip: entry.chip || null,
          };
        }
      }
    }
    tooltipDataHtml = `<script type="application/json" class="radar-tooltip-data">${JSON.stringify(tooltipMap)}</script>`;
  }

  const svgContent = [
    renderGrid(n),
    renderSpokes(n),
    renderScoreLabels(n),
    ...seriesItems.map(s => renderSeriesGroup(s.id, s.color, axisIds, chartScores, n)),
    renderAxisLabels(axisLabels),
  ].join('\n');

  return `<div class="slide">
  <div class="hdr">
    <div class="hdr-title">${esc(title)}</div>
    <div style="font-size: 10px; color: var(--grey)">Radar view \u2014 scores on a 1\u20134 scale ${subtitle}. Use the filters above to add or remove tools and capabilities.</div>
  </div>
  <div class="radar-body">
    ${toggle}
    <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      ${svgContent}
    </svg>
    ${renderLegend(seriesItems)}
    ${tooltipDataHtml}
    <div class="radar-tooltip" hidden></div>
  </div>
</div>`;
}

/**
 * Wire click-to-lock interactions on radar chart series groups and legend items.
 * Click a series polygon or legend item to lock it highlighted (others dim).
 * While locked, hover individual dots to see detail tooltips.
 * Click the same series or the background to unlock.
 * @param {HTMLElement} container - Parent element containing the radar chart (e.g. #app)
 */
export function wireRadarInteractions(container) {
  const radarBody = container.querySelector('.radar-body');
  if (!radarBody) return;

  let lockedId = null;
  const tooltipEl = radarBody.querySelector('.radar-tooltip');

  function lock(seriesId) {
    if (lockedId === seriesId) { unlock(); return; }
    lockedId = seriesId;
    radarBody.setAttribute('data-hover-series', seriesId);
    radarBody.querySelectorAll('.radar-highlight').forEach(el => el.classList.remove('radar-highlight'));
    radarBody.querySelectorAll(`.radar-series-group[data-series-id="${seriesId}"]`).forEach(el => el.classList.add('radar-highlight'));
    radarBody.querySelectorAll(`.radar-legend-item[data-series-id="${seriesId}"]`).forEach(el => el.classList.add('radar-highlight'));
  }

  function unlock() {
    lockedId = null;
    radarBody.removeAttribute('data-hover-series');
    radarBody.querySelectorAll('.radar-highlight').forEach(el => el.classList.remove('radar-highlight'));
    if (tooltipEl) tooltipEl.hidden = true;
  }

  // Click polygon group → lock / unlock
  radarBody.querySelectorAll('.radar-series-group').forEach(group => {
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      lock(group.dataset.seriesId);
    });
  });

  // Click legend item → lock / unlock
  radarBody.querySelectorAll('.radar-legend-item[data-series-id]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      lock(item.dataset.seriesId);
    });
  });

  // Click background → unlock
  radarBody.addEventListener('click', (e) => {
    if (!e.target.closest('.radar-series-group') && !e.target.closest('.radar-legend-item')) {
      unlock();
    }
  });

  // Dot-level tooltips — only while the parent series is locked
  const tooltipDataEl = radarBody.querySelector('.radar-tooltip-data');
  if (tooltipDataEl && tooltipEl) {
    const SCORE_CLS = { 1: 's1', 2: 's2', 3: 's3', 4: 's4' };
    const tooltipMap = JSON.parse(tooltipDataEl.textContent);

    radarBody.querySelectorAll('.radar-dot').forEach(dot => {
      dot.addEventListener('mouseenter', () => {
        const group = dot.closest('.radar-series-group');
        if (!group || lockedId !== group.dataset.seriesId) return;

        const key = `${dot.dataset.axisId}:${group.dataset.seriesId}`;
        const data = tooltipMap[key];
        if (!data) return;

        const cls = SCORE_CLS[Math.ceil(data.score)] || '';
        let html = `<div class="radar-tooltip-label ${cls}">${esc(data.label)}</div>`;
        if (data.actions.length) {
          html += `<ul class="radar-tooltip-actions">${data.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`;
        }
        if (data.chip) {
          html += `<div class="radar-tooltip-chip">${esc(data.chip.text)}</div>`;
        }
        tooltipEl.innerHTML = html;
        tooltipEl.hidden = false;

        // Position above the dot, centered horizontally
        const bodyRect = radarBody.getBoundingClientRect();
        const dotRect = dot.getBoundingClientRect();
        tooltipEl.style.left = `${dotRect.left - bodyRect.left + dotRect.width / 2}px`;
        tooltipEl.style.top = `${dotRect.top - bodyRect.top - 8}px`;
      });

      dot.addEventListener('mouseleave', () => {
        tooltipEl.hidden = true;
      });
    });
  }
}

/**
 * Wire dimension toggle button clicks.
 * @param {HTMLElement} container - Parent element containing the radar chart
 * @param {function} onToggle - Callback receiving the new flipped state (boolean)
 */
export function wireRadarDimensionToggle(container, onToggle) {
  container.querySelectorAll('.radar-dim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const flipped = btn.dataset.radarFlipped === 'true';
      onToggle(flipped);
    });
  });
}
