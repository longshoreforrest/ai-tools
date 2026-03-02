/**
 * Agent Architecture view renderer.
 * One renderer handles all 3 agent types (sparring, builder, quality)
 * since they share the same sidebar + 4-layer structure.
 *
 * Produces HTML matching:
 *   - slide_sparring_agent_1.html
 *   - slide2_v2_builder_agent_2.html
 *   - slide_quality_agent_1.html
 */
import { esc } from '../utils/render.js';

/* ────────────────────────────────────────────
   BADGE HELPERS
   ──────────────────────────────────────────── */

/** Normalise kind values (e.g. "template" -> "tmpl") */
function normaliseKind(kind) {
  if (kind === 'template') return 'tmpl';
  return kind || 'agent';
}

/** Map kind to badge letter */
const BADGE_LETTER = { agent: 'A', skill: 'S', tmpl: 'T' };
/** Map kind to short CSS class for badge/type colouring */
const BADGE_CLASS = { agent: 'a', skill: 's', tmpl: 't' };

function renderBadge(kind) {
  const k = normaliseKind(kind);
  const cls = BADGE_CLASS[k] || 'a';
  const letter = BADGE_LETTER[k] || 'A';
  return `<div class="cc-badge ${cls}">${letter}</div>`;
}

function renderTypeLabel(kind, label) {
  const k = normaliseKind(kind);
  const cls = BADGE_CLASS[k] || 'a';
  return `<span class="cc-type ${cls}">${esc(label)}</span>`;
}

/* ────────────────────────────────────────────
   SIDEBAR
   ──────────────────────────────────────────── */

function renderSidebar(sb) {
  const rows = (section) =>
    (section || [])
      .map(r => `<div class="sb-row${r.highlight ? ' hi' : ''}">${esc(r.text)}</div>`)
      .join('\n');

  return `<div class="sidebar">
  <div class="sb-eyebrow">${esc(sb.eyebrow)}</div>
  <div class="sb-type"><div class="type-dot"></div>${esc(sb.type)}</div>
  <div class="sb-title">${sb.title}</div>
  <div class="sb-tagline">${esc(sb.tagline)}</div>

  <div class="sb-principle">
    <div class="sb-pr-label">${esc(sb.principle.label)}</div>
    <div class="sb-pr-text">${esc(sb.principle.text)}</div>
  </div>

  <div class="sb-sec">
    <div class="sb-sec-label">Inputs</div>
    ${rows(sb.inputs)}
  </div>

  <div class="sb-sec">
    <div class="sb-sec-label">Outputs</div>
    ${rows(sb.outputs)}
  </div>

  <div class="sb-num">${esc(sb.pageNum)}</div>
</div>`;
}

/* ────────────────────────────────────────────
   UI LAYER
   ──────────────────────────────────────────── */

/**
 * Build chip HTML from data's chips[] + softChips[] string arrays.
 */
function renderToolChips(chips, softChips) {
  const normal = (chips || []).map(c => `<div class="chip-tool">${esc(c)}</div>`);
  const soft = (softChips || []).map(c => `<div class="chip-tool soft">${esc(c)}</div>`);
  return normal.concat(soft).join('\n');
}

function renderUICard(card, className) {
  const cls = className || 'ui-card';
  return `<div class="${cls}">
  <div class="ui-card-title">${esc(card.title)}</div>
  <div class="tool-chips">
    ${renderToolChips(card.chips, card.softChips)}
  </div>
  <div class="ui-card-note">${esc(card.note)}</div>
</div>`;
}

function renderUILayer(ui) {
  let inner;
  if (ui.type === 'single') {
    // Sparring: single centred card (data stores as ui.card singular)
    const card = ui.card || (ui.cards && ui.cards[0]);
    inner = renderUICard(card, 'ui-single');
  } else {
    // Dual cards side-by-side (builder, quality)
    inner = `<div class="ui-row">\n${(ui.cards || []).map(c => renderUICard(c)).join('\n')}\n</div>`;
  }

  return `<div class="layer ui">
  <div class="lyr-label">Human Interaction Layer</div>
  ${inner}
</div>`;
}

/* ────────────────────────────────────────────
   COMPONENT CARD (used in orchestration)
   ──────────────────────────────────────────── */

function renderComponentCard(card) {
  const kindCls = normaliseKind(card.kind);
  const classes = ['ccard', kindCls];
  if (card.span2) classes.push('span2');

  let headContent;
  if (card.span2) {
    // Span-2 cards always have inline name in the header row (matches source HTML)
    headContent = `${renderBadge(card.kind)}
      ${renderTypeLabel(card.kind, card.typeLabel || kindCls.charAt(0).toUpperCase() + kindCls.slice(1))}
      <span class="cc-name" style="margin-left:4px;">${esc(card.name)}</span>`;
  } else {
    headContent = `${renderBadge(card.kind)}
      ${renderTypeLabel(card.kind, card.typeLabel || kindCls.charAt(0).toUpperCase() + kindCls.slice(1))}`;
  }

  let bodyHtml = '';
  if (!card.span2) {
    bodyHtml += `<div class="cc-name">${esc(card.name)}</div>`;
  }
  if (card.note) {
    bodyHtml += `\n<div class="cc-note">${esc(card.note)}</div>`;
  }
  if (card.crossTag) {
    bodyHtml += `\n<div class="cross-tag">${esc(card.crossTag)}</div>`;
  }

  return `<div class="${classes.join(' ')}">
  <div class="cc-head">
    ${headContent}
  </div>
  ${bodyHtml}
</div>`;
}

/* ────────────────────────────────────────────
   ORCHESTRATION LAYER
   ──────────────────────────────────────────── */

function renderOrchBullets(bullets) {
  return (bullets || [])
    .map(b => `<div class="ob${b.highlight ? ' hi' : ''}">${esc(b.text)}</div>`)
    .join('\n');
}

/**
 * Standard layout: left orchestrator, arrow, right sub-grid.
 */
function renderOrchStandard(orch) {
  const o = orch.orchestrator;
  const subCards = (orch.components || []).map(c => renderComponentCard(c)).join('\n');

  return `<div class="orch-row">
  <!-- Orchestrator -->
  <div class="orch-main">
    <div class="cc-head">
      ${renderBadge('agent')}
      <span class="cc-type a">${esc(o.typeLabel || 'Agent \u2014 orchestrates')}</span>
    </div>
    <div class="cc-name" style="font-size:10.5px; margin-bottom:6px;">${esc(o.name)}</div>
    ${renderOrchBullets(o.bullets)}
  </div>

  <!-- Arrow -->
  <div class="orch-arrow">
    <svg viewBox="0 0 24 24"><path d="M5 12h14M14 6l6 6-6 6"/></svg>
  </div>

  <!-- Sub-agents / skills -->
  <div class="sub-grid">
    ${subCards}
  </div>
</div>`;
}

/**
 * Dual-phase layout (quality agent): top orchestrator bar + two phase panels.
 */
function renderOrchDualPhase(orch) {
  const o = orch.orchestrator;

  // Orchestrator bar (full-width, horizontal)
  const bulletsHtml = renderOrchBullets(o.bullets);

  const orchTopHtml = `<div class="orch-top">
  <div class="orch-top-left">
    <div class="cc-head-lg">
      <div class="cc-badge-lg">A</div>
      <div>
        <div class="cc-type-sm">${esc(o.typeLabel || 'Agent \u2014 orchestrates')}</div>
        <div class="cc-name-lg">${esc(o.name)}</div>
      </div>
    </div>
  </div>
  <div class="orch-top-bullets">
    ${bulletsHtml}
  </div>
</div>`;

  // Phase panels
  const phases = orch.phases || [];
  const phasePanelsHtml = phases.map((phase) => {
    const panelCls = phase.panelClass || phase.id || 'spec';
    const badge = phase.badge || `Phase ${phase.number}`;
    const cards = (phase.components || []).map(c => renderComponentCard(c)).join('\n');

    return `<div class="phase-panel ${panelCls}">
  <div class="phase-hdr">
    <span class="phase-badge">${esc(badge)}</span>
    <span class="phase-title">${esc(phase.title)}</span>
    <span class="phase-when">${esc(phase.when)}</span>
  </div>
  <div class="phase-cards">
    ${cards}
  </div>
</div>`;
  });

  // Interleave divider between panels
  let phasesInnerHtml = '';
  phasePanelsHtml.forEach((panelHtml, i) => {
    phasesInnerHtml += panelHtml;
    if (i < phasePanelsHtml.length - 1) {
      phasesInnerHtml += `\n<div class="phase-divider"><div class="phase-divider-line"></div></div>\n`;
    }
  });

  return `${orchTopHtml}
<div class="orch-phases">
  ${phasesInnerHtml}
</div>`;
}

function renderOrchLayer(orch) {
  let inner;
  if (orch.type === 'dual-phase') {
    inner = renderOrchDualPhase(orch);
  } else {
    inner = renderOrchStandard(orch);
  }

  return `<div class="layer orch">
  <div class="lyr-label">Agent Orchestration Layer</div>
  ${inner}
</div>`;
}

/* ────────────────────────────────────────────
   KNOWLEDGE LAYER
   ──────────────────────────────────────────── */

function renderKnowledgeLayer(know) {
  const cardsHtml = (know.cards || [])
    .map(
      c => `<div class="kcard">
  <div class="kcard-name">${esc(c.name)}</div>
  <div class="kcard-desc">${esc(c.desc)}</div>
</div>`,
    )
    .join('\n');

  // Support both know.ragBody (flat) and know.rag.body (nested)
  const ragBody = know.ragBody || (know.rag && know.rag.body) || '';

  return `<div class="layer know">
  <div class="lyr-label">Context &amp; Knowledge Layer</div>
  <div class="know-cards">
    ${cardsHtml}
  </div>
  <div class="rag-bar">
    <div class="rag-lbl">RAG / Retrieval Pipeline</div>
    <div class="rag-sep"></div>
    <div class="rag-body">${esc(ragBody)}</div>
  </div>
</div>`;
}

/* ────────────────────────────────────────────
   ENTERPRISE LAYER
   ──────────────────────────────────────────── */

function renderEnterpriseCard(card) {
  const classes = ['ecard'];
  if (card.builderDep || card.isBuilderDep) classes.push('builder-dep');

  let chipsHtml = '';
  if (card.chips && card.chips.length > 0) {
    chipsHtml = `<div class="ecard-chips">${card.chips.map(c => `<div class="echip">${esc(c)}</div>`).join('')}</div>`;
  }

  let detailHtml = '';
  if (card.detail) {
    const style = card.chips && card.chips.length > 0 ? ' style="margin-top:4px;"' : '';
    detailHtml = `<div class="ecard-detail"${style}>${esc(card.detail)}</div>`;
  }

  return `<div class="${classes.join(' ')}">
  <div class="ecard-name">${esc(card.name)}</div>
  ${chipsHtml}
  ${detailHtml}
</div>`;
}

function renderEnterpriseLayer(ent) {
  const cards = ent.cards || [];
  const cardsHtml = cards.map(c => renderEnterpriseCard(c)).join('\n');
  const colCount = cards.length || 4;

  const protoTags = (ent.protoTags || ['MCP', 'API'])
    .map(tag => `<span class="proto-tag ${esc(tag.toLowerCase())}">${esc(tag)}</span>`)
    .join('\n');

  return `<div class="layer ent">
  <div class="lyr-label" style="display:flex; align-items:center; justify-content:space-between;">
    <span>Enterprise Integration Layer</span>
    <span style="display:flex; gap:5px;">
      ${protoTags}
    </span>
  </div>
  <div class="ent-row" style="grid-template-columns: repeat(${colCount}, 1fr);">
    ${cardsHtml}
  </div>
</div>`;
}

/* ────────────────────────────────────────────
   MAIN EXPORT
   ──────────────────────────────────────────── */

/**
 * Render a full agent architecture slide.
 * @param {Object} data - Agent data from agents/*.json
 * @returns {string} Full HTML for the slide
 */
export function renderAgentArchitecture(data) {
  // Data nests layers under data.layers.*
  const layers = data.layers || data;
  return `<div class="slide">
  ${renderSidebar(data.sidebar)}
  <div class="main">
    ${renderUILayer(layers.ui)}
    ${renderOrchLayer(layers.orchestration)}
    ${renderKnowledgeLayer(layers.knowledge)}
    ${renderEnterpriseLayer(layers.enterprise)}
  </div>
</div>`;
}
