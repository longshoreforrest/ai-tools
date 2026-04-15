/**
 * archPanel.js — Slide-in architecture cross-reference panel.
 * Shows a compact architecture diagram with one component highlighted.
 */

const LAYER_COLORS = {
  indigo: { bg: '#E8EAF6', bd: '#3949AB', hdr: '#283593' },
  blue:   { bg: '#E3F2FD', bd: '#1565C0', hdr: '#0D47A1' },
  green:  { bg: '#E8F5E9', bd: '#2E7D32', hdr: '#1B5E20' },
  orange: { bg: '#FFF3E0', bd: '#E65100', hdr: '#BF360C' },
  purple: { bg: '#F3E5F5', bd: '#7B1FA2', hdr: '#4A148C' },
  red:    { bg: '#FFEBEE', bd: '#C62828', hdr: '#B71C1C' },
  grey:   { bg: '#ECEFF1', bd: '#546E7A', hdr: '#37474F' },
};

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/** Cache for architecture data */
let archDataCache = null;

/** DOM references */
let panelEl = null;
let backdropEl = null;

/** Ensure panel + backdrop DOM elements exist */
function ensureDOM() {
  if (panelEl) return;

  backdropEl = document.createElement('div');
  backdropEl.className = 'arch-panel-backdrop';
  backdropEl.addEventListener('click', close);
  document.body.appendChild(backdropEl);

  panelEl = document.createElement('div');
  panelEl.className = 'arch-panel';
  document.body.appendChild(panelEl);
}

/** Load architecture data (cached) */
async function loadArchData() {
  if (!archDataCache) {
    const url = 'data/architecture.json?v=' + Date.now();
    archDataCache = await fetch(url).then(r => r.json());
  }
  return archDataCache;
}

/* ── Render mini standard layer ── */
function renderMiniStandardLayer(layer, ref) {
  const c = LAYER_COLORS[layer.color] || LAYER_COLORS.grey;
  const isTargetLayer = ref && ref.layer === layer.id;

  const cards = (layer.components || []).map(comp => {
    const isTarget = isTargetLayer && ref.component && comp.name === ref.component;
    const cls = isTarget ? ' comp-highlighted' : '';
    return `
      <div class="arch-mini-comp${cls}">
        <div class="arch-mini-comp-icon">${comp.icon || ''}</div>
        <div class="arch-mini-comp-name">${esc(comp.name)}</div>
        <div class="arch-mini-comp-detail">${esc(comp.detail)}</div>
      </div>
    `;
  }).join('');

  const layerCls = isTargetLayer ? ' layer-active' : '';

  return `
    <div class="arch-mini-layer${layerCls}" style="background: ${c.bg}">
      <div class="arch-mini-layer-hdr" style="background: ${c.hdr}">
        <span class="arch-mini-layer-name">${esc(layer.name)}</span>
        <span class="arch-mini-layer-desc">${esc(layer.description)}</span>
      </div>
      <div class="arch-mini-comp-grid">${cards}</div>
    </div>
  `;
}

/* ── Render mini agent layer ── */
function renderMiniAgentLayer(layer, ref) {
  const c = LAYER_COLORS[layer.color] || LAYER_COLORS.green;
  const isTargetLayer = ref && ref.layer === layer.id;

  const groupsHtml = (layer.groups || []).map(group => {
    const isCustom = group.label.includes('Custom');
    const groupColor = isCustom ? LAYER_COLORS.blue.hdr : c.hdr;

    const cards = (group.agents || []).map(agent => {
      const isTarget = isTargetLayer && ref.agent && agent.cap === ref.agent;
      const cls = isTarget ? ' comp-highlighted' : '';
      return `
        <div class="arch-mini-agent-card${cls}">
          <div class="arch-mini-agent-cap">${esc(agent.cap)}</div>
          <div class="arch-mini-agent-name">${esc(agent.name)}</div>
          <div class="arch-mini-agent-savings">${esc(agent.savings)}</div>
        </div>
      `;
    }).join('');

    return `
      <div>
        <div class="arch-mini-agent-group-hdr" style="background: ${groupColor}">
          ${esc(group.label)}
        </div>
        <div class="arch-mini-agent-cards">${cards}</div>
      </div>
    `;
  }).join('');

  const layerCls = isTargetLayer ? ' layer-active' : '';

  return `
    <div class="arch-mini-layer${layerCls}" style="background: ${c.bg}">
      <div class="arch-mini-layer-hdr" style="background: ${c.hdr}">
        <span class="arch-mini-layer-name">${esc(layer.name)}</span>
        <span class="arch-mini-layer-desc">${esc(layer.description)}</span>
      </div>
      <div class="arch-mini-agent-groups">${groupsHtml}</div>
    </div>
  `;
}

/* ── Render mini integration layer ── */
function renderMiniIntegrationLayer(layer, ref) {
  const c = LAYER_COLORS[layer.color] || LAYER_COLORS.purple;
  const isTargetLayer = ref && ref.layer === layer.id;

  const tiersHtml = (layer.tiers || []).map(tier => {
    const systems = (tier.systems || []).map(sys => {
      const isTarget = isTargetLayer && ref.tier === tier.tier && ref.system && sys.name === ref.system;
      const cls = isTarget ? ' comp-highlighted' : '';
      return `<span class="arch-mini-int-system${cls}">${esc(sys.name)}</span>`;
    }).join('');

    return `
      <div>
        <div class="arch-mini-int-tier-hdr">
          <span class="arch-mini-int-tier-num">T${tier.tier}</span>
          <span class="arch-mini-int-tier-proto">${esc(tier.protocol)} — ${esc(tier.label)}</span>
        </div>
        <div class="arch-mini-int-systems">${systems}</div>
      </div>
    `;
  }).join('');

  const layerCls = isTargetLayer ? ' layer-active' : '';

  return `
    <div class="arch-mini-layer${layerCls}" style="background: ${c.bg}">
      <div class="arch-mini-layer-hdr" style="background: ${c.hdr}">
        <span class="arch-mini-layer-name">${esc(layer.name)}</span>
        <span class="arch-mini-layer-desc">${esc(layer.description)}</span>
      </div>
      <div class="arch-mini-int-tiers">${tiersHtml}</div>
    </div>
  `;
}

/* ── Resolve layer name for header ── */
function resolveLayerName(data, ref) {
  if (!ref) return '';
  const layer = (data.layers || []).find(l => l.id === ref.layer);
  return layer ? layer.name : ref.layer;
}

/* ── Open the panel ── */
export async function open(ref, componentName) {
  ensureDOM();
  const data = await loadArchData();
  const layerName = resolveLayerName(data, ref);

  const layersHtml = (data.layers || []).map(layer => {
    if (layer.splitLayout) return renderMiniAgentLayer(layer, ref);
    if (layer.tiers) return renderMiniIntegrationLayer(layer, ref);
    return renderMiniStandardLayer(layer, ref);
  }).join('');

  panelEl.innerHTML = `
    <div class="arch-panel-header">
      <div class="arch-panel-header-text">
        <div class="arch-panel-comp-name">${esc(componentName)}</div>
        <div class="arch-panel-layer-name">in ${esc(layerName)}</div>
      </div>
      <button class="arch-panel-close" title="Close">\u00D7</button>
    </div>
    <div class="arch-panel-body">
      ${layersHtml}
    </div>
  `;

  // Wire close button
  panelEl.querySelector('.arch-panel-close').addEventListener('click', close);

  // Animate open
  requestAnimationFrame(() => {
    backdropEl.classList.add('visible');
    panelEl.classList.add('open');
  });

  // Scroll highlighted element into view
  requestAnimationFrame(() => {
    const highlighted = panelEl.querySelector('.comp-highlighted');
    if (highlighted) {
      highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

/* ── Close the panel ── */
export function close() {
  if (!panelEl) return;
  panelEl.classList.remove('open');
  backdropEl.classList.remove('visible');
}

/* ── Check if panel is open ── */
export function isOpen() {
  return panelEl && panelEl.classList.contains('open');
}
