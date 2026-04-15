/**
 * Factory Architecture — SDLC Factory platform architecture with workflow stages + 3 tracks.
 * Pure function returning HTML string. Reuses arch-* CSS base + factory-specific additions.
 */
import { esc } from '../utils/render.js';

const LAYER_COLORS = {
  indigo: { bg: '#E8EAF6', bd: '#3949AB', hdr: '#283593', text: '#1A237E' },
  blue:   { bg: '#E3F2FD', bd: '#1565C0', hdr: '#0D47A1', text: '#0D47A1' },
  green:  { bg: '#E8F5E9', bd: '#2E7D32', hdr: '#1B5E20', text: '#1B5E20' },
  orange: { bg: '#FFF3E0', bd: '#E65100', hdr: '#BF360C', text: '#BF360C' },
  purple: { bg: '#F3E5F5', bd: '#7B1FA2', hdr: '#4A148C', text: '#4A148C' },
  red:    { bg: '#FFEBEE', bd: '#C62828', hdr: '#B71C1C', text: '#B71C1C' },
  grey:   { bg: '#ECEFF1', bd: '#546E7A', hdr: '#37474F', text: '#37474F' },
};

/* ── Header ── */
function renderHeader(data) {
  return `
    <div class="arch-header">
      <div class="arch-header-text">
        <div class="arch-title">${esc(data.title)}</div>
        <div class="arch-subtitle">${esc(data.subtitle)}</div>
      </div>
      <div class="arch-strategy-note">${esc(data.strategyNote)}</div>
    </div>
  `;
}

/* ── Standard layer with component cards ── */
function renderStandardLayer(layer) {
  const c = LAYER_COLORS[layer.color] || LAYER_COLORS.grey;

  const cards = (layer.components || []).map(comp => {
    const hlClass = comp.highlight ? ' arch-comp-highlight' : '';
    return `
      <div class="arch-comp${hlClass}" style="border-color: ${c.bd}">
        <div class="arch-comp-icon">${comp.icon || ''}</div>
        <div class="arch-comp-body">
          <div class="arch-comp-name">${esc(comp.name)}</div>
          <div class="arch-comp-detail">${esc(comp.detail)}</div>
        </div>
      </div>
    `;
  }).join('');

  const dataFlowHtml = layer.dataFlow
    ? `<div class="arch-data-flow">${esc(layer.dataFlow)}</div>`
    : '';

  return `
    <div class="arch-layer" style="--layer-bg: ${c.bg}; --layer-bd: ${c.bd}; --layer-hdr: ${c.hdr}; --layer-text: ${c.text}">
      <div class="arch-layer-hdr">
        <span class="arch-layer-name">${esc(layer.name)}</span>
        <span class="arch-layer-desc">${esc(layer.description)}</span>
      </div>
      <div class="arch-comp-grid">
        ${cards}
      </div>
      ${dataFlowHtml}
    </div>
  `;
}

/* ── Workflow stages (horizontal flow) ── */
function renderWorkflowLayer(layer) {
  const c = LAYER_COLORS[layer.color] || LAYER_COLORS.green;

  const stagesHtml = (layer.stages || []).map(stage => {
    const hlClass = stage.highlight ? ' fa-stage-highlight' : '';
    const sharedLabel = stage.shared ? 'SHARED' : '3 TRACKS';
    const sharedClass = stage.shared ? 'shared' : 'split';

    const agents = (stage.agents || []).map(a =>
      `<div class="fa-stage-agent">${esc(a)}</div>`
    ).join('');

    return `
      <div class="fa-stage${hlClass}">
        <div class="fa-stage-icon">${stage.icon || ''}</div>
        <div class="fa-stage-name">${esc(stage.name)}</div>
        <div class="fa-stage-badge ${sharedClass}">${sharedLabel}</div>
        <div class="fa-stage-agents">${agents}</div>
      </div>
    `;
  }).join('<div class="fa-stage-arrow">→</div>');

  return `
    <div class="arch-layer" style="--layer-bg: ${c.bg}; --layer-bd: ${c.bd}; --layer-hdr: ${c.hdr}; --layer-text: ${c.text}">
      <div class="arch-layer-hdr">
        <span class="arch-layer-name">${esc(layer.name)}</span>
        <span class="arch-layer-desc">${esc(layer.description)}</span>
      </div>
      <div class="fa-workflow-flow">
        ${stagesHtml}
      </div>
    </div>
  `;
}

/* ── 3-track BUILD layout ── */
function renderTracksLayer(layer) {
  const c = LAYER_COLORS[layer.color] || LAYER_COLORS.green;

  const tracksHtml = (layer.tracks || []).map(track => {
    const tools = (track.tools || []).map(t => `
      <div class="fa-track-tool">
        <div class="fa-track-tool-name">${esc(t.name)}</div>
        <div class="fa-track-tool-detail">${esc(t.detail)}</div>
      </div>
    `).join('');

    return `
      <div class="fa-track" style="--track-color: ${track.color}">
        <div class="fa-track-hdr" style="background: ${track.color}">
          <span class="fa-track-name">${esc(track.name)}</span>
        </div>
        <div class="fa-track-tools">${tools}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="arch-layer" style="--layer-bg: ${c.bg}; --layer-bd: ${c.bd}; --layer-hdr: ${c.hdr}; --layer-text: ${c.text}">
      <div class="arch-layer-hdr">
        <span class="arch-layer-name">${esc(layer.name)}</span>
        <span class="arch-layer-desc">${esc(layer.description)}</span>
      </div>
      <div class="fa-tracks-grid">
        ${tracksHtml}
      </div>
    </div>
  `;
}

/* ── Integration tier layer ── */
function renderIntegrationLayer(layer) {
  const c = LAYER_COLORS[layer.color] || LAYER_COLORS.purple;

  const tiersHtml = (layer.tiers || []).map(tier => {
    const systems = (tier.systems || []).map(sys =>
      `<div class="arch-int-system">
        <span class="arch-int-sys-name">${esc(sys.name)}</span>
        <span class="arch-int-sys-used">${esc(sys.usedBy)}</span>
      </div>`
    ).join('');

    return `
      <div class="arch-int-tier">
        <div class="arch-int-tier-hdr">
          <span class="arch-int-tier-num">Tier ${tier.tier}</span>
          <span class="arch-int-tier-proto">${esc(tier.protocol)}</span>
        </div>
        <div class="arch-int-tier-label">${esc(tier.label)}</div>
        <div class="arch-int-systems">${systems}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="arch-layer" style="--layer-bg: ${c.bg}; --layer-bd: ${c.bd}; --layer-hdr: ${c.hdr}; --layer-text: ${c.text}">
      <div class="arch-layer-hdr">
        <span class="arch-layer-name">${esc(layer.name)}</span>
        <span class="arch-layer-desc">${esc(layer.description)}</span>
      </div>
      <div class="arch-int-tiers">
        ${tiersHtml}
      </div>
    </div>
  `;
}

/* ── Guardrails strip ── */
function renderGuardrails(guardrails) {
  const items = (guardrails || []).map(g =>
    `<div class="arch-guardrail">${esc(g)}</div>`
  ).join('');

  return `
    <div class="arch-guardrails">
      <div class="arch-guardrails-label">Factory Guardrails</div>
      <div class="arch-guardrails-list">${items}</div>
    </div>
  `;
}

/* ── Main Export ── */
export function renderFactoryArchitecture(data) {
  const layers = data.layers || [];

  const layersHtml = layers.map(layer => {
    if (layer.workflowLayout) return renderWorkflowLayer(layer);
    if (layer.tracksLayout) return renderTracksLayer(layer);
    if (layer.tiers) return renderIntegrationLayer(layer);
    return renderStandardLayer(layer);
  }).join('');

  return `
    <div class="arch-slide">
      ${renderHeader(data)}
      <div class="arch-body">
        ${layersHtml}
      </div>
      ${renderGuardrails(data.guardrails)}
      <div class="arch-footer">
        <div class="arch-pagenum">${esc(data.pageNum || '')}</div>
      </div>
    </div>
  `;
}
