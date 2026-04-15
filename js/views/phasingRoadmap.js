/**
 * Phasing Roadmap view — renders the 3-stage implementation maturity slide.
 * Pure function returning HTML string (no DOM manipulation).
 */
import { esc } from '../utils/render.js';

/* ── Icon map for portability assets ── */
const ASSET_ICONS = {
  prompt:     '\uD83D\uDCDD',
  mcp:        '\uD83D\uDD17',
  knowledge:  '\uD83E\uDDE0',
  governance: '\uD83D\uDEE1\uFE0F',
};

/* ── Siili badge symbols ── */
const SIILI_SYMBOLS = {
  ready:   '\u2713',
  partial: '\u25CB',
  build:   '\u2013',
};

/* ── Helpers ── */

function renderGoalBanner(goal) {
  const metrics = goal.metrics.map(m => `
    <div class="metric-card ${esc(m.icon)}">
      <div class="metric-value">${esc(m.value)}</div>
      <div class="metric-label">${esc(m.label)}</div>
    </div>
  `).join('');

  return `
    <div class="goal-banner">
      <div class="goal-text">
        <div class="goal-headline">${esc(goal.headline)}</div>
        <div class="goal-subtext">${esc(goal.subtext)}</div>
      </div>
      <div class="goal-metrics">${metrics}</div>
    </div>
  `;
}

function renderStageHeaders(stages) {
  const cols = stages.map(s => `
    <div class="stage-hdr ${esc(s.color)}">
      <div class="stage-hdr-top">
        <div class="stage-num">${s.number}</div>
        <div class="stage-name">${esc(s.name)}</div>
        <div class="stage-timeline">${esc(s.timeline)}</div>
      </div>
      <div class="stage-desc">${esc(s.description)}</div>
      <div class="stage-contribution">${esc(s.contribution)}</div>
    </div>
  `).join('');

  return `
    <div class="stage-headers">
      <div class="stage-hdr-spacer"></div>
      ${cols}
    </div>
  `;
}

function renderSiiliBadge(status) {
  const sym = SIILI_SYMBOLS[status] || SIILI_SYMBOLS.build;
  return `<div class="siili-badge ${esc(status)}" title="Siili: ${esc(status)}">${sym}</div>`;
}

function renderStageCell(stageData, stageColor) {
  if (!stageData) return `<div class="stage-cell ${esc(stageColor)}"></div>`;

  const tools = (stageData.tools || []).map(t =>
    `<span class="cell-chip">${esc(t)}</span>`
  ).join('');

  const details = (stageData.details || []).map(d =>
    `<div class="cell-detail">${esc(d)}</div>`
  ).join('');

  return `
    <div class="stage-cell ${esc(stageColor)}">
      ${renderSiiliBadge(stageData.siiliReady || 'build')}
      <div class="cell-summary">${esc(stageData.summary)}</div>
      <div class="cell-tools">${tools}</div>
      <div class="cell-details">${details}</div>
      <div class="cell-asset">
        <span class="asset-icon">\uD83D\uDCE6</span>
        <span class="asset-text">${esc(stageData.assetBuilt)}</span>
      </div>
    </div>
  `;
}

function renderCapabilityRow(cap, stages) {
  const cells = stages.map(s =>
    renderStageCell(cap.stages[s.id], s.color)
  ).join('');

  return `
    <div class="cap-row" data-cap-id="${esc(cap.id)}">
      <div class="cap-label">
        <div class="cap-num">${esc(cap.number)}</div>
        <div class="cap-name">${esc(cap.name)}</div>
        <div class="cap-role ${esc(cap.roleCategory)}">${cap.roleCategory === 'biz' ? 'Business' : 'Technical'}</div>
      </div>
      ${cells}
    </div>
  `;
}

function renderSiiliLegend(legend) {
  const items = Object.entries(legend).map(([key, label]) => `
    <div class="siili-legend-item">
      <div class="siili-legend-dot ${esc(key)}">${SIILI_SYMBOLS[key] || ''}</div>
      <span class="siili-legend-text">${esc(label)}</span>
    </div>
  `).join('');

  return `<div class="siili-legend">${items}</div>`;
}

function renderPortabilityStrip(port) {
  const assets = (port.assets || []).map(a => `
    <div class="port-asset">
      <div class="port-asset-icon">${ASSET_ICONS[a.icon] || ''}</div>
      <div class="port-asset-label">${esc(a.label)}</div>
      <div class="port-asset-detail">${esc(a.detail)}</div>
    </div>
  `).join('');

  return `
    <div class="portability-strip">
      <div class="port-top">
        <div class="port-headline">${esc(port.headline)}</div>
        <div class="port-subtext">${esc(port.subtext)}</div>
      </div>
      <div class="port-assets">${assets}</div>
    </div>
  `;
}

/* ── Main Export ── */

export function renderPhasingRoadmap(data) {
  const stages = data.stages || [];
  const capabilities = data.capabilities || [];

  const capRows = capabilities.map(cap =>
    renderCapabilityRow(cap, stages)
  ).join('');

  return `
    <div class="phasing-slide">
      ${renderGoalBanner(data.goal)}
      <div class="phasing-body">
        ${renderStageHeaders(stages)}
        ${data.siiliLegend ? renderSiiliLegend(data.siiliLegend) : ''}
        <div class="cap-matrix">
          ${capRows}
        </div>
      </div>
      ${renderPortabilityStrip(data.portability)}
      <div class="phasing-footer">
        <div class="phasing-pagenum">${esc(data.pageNum || '')}</div>
      </div>
    </div>
  `;
}
