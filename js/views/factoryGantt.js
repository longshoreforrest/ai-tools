/**
 * Factory Gantt view — Sprint-based timeline for AI-Powered SDLC Factory.
 * Reuses dp-* CSS classes from detailed-phasing.css + factory-gantt.css additions.
 * Pure function returning HTML string.
 *
 * Supports expandable components with sub-components (agents, skills, templates).
 */
import { esc } from '../utils/render.js';
import { open as openFactoryArchPanel } from '../components/factoryArchPanel.js';

/* ── Module state ── */
const expandedComponents = new Set();
let cachedData = null;

/* ── Sprint index helper ── */
function sprintIndex(sprints, sprintId) {
  return sprints.findIndex(s => s.id === sprintId);
}

/* ── Phase for sprint ── */
function phaseForSprint(phases, sprintId) {
  for (const p of phases) {
    if (p.sprints.includes(sprintId)) return p.id;
  }
  return '';
}

/* ── Track badge ── */
const TRACK_BADGES = {
  cloud: '<span class="fg-track-badge cloud">\u2601\uFE0F Cloud</span>',
  sap:   '<span class="fg-track-badge sap">\uD83D\uDD36 SAP</span>',
  sf:    '<span class="fg-track-badge sf">\uD83D\uDD37 SF</span>',
  all:   '',
};

function trackBadge(track) {
  return TRACK_BADGES[track] || '';
}

/* ── Kind badge letter mapping ── */
const KIND_LETTERS = {
  orchestrator: 'O',
  skill: 'S',
  'skill-shared': 'S',
  'sub-agent': 'A',
  template: 'T',
};

/* ── Header ── */
function renderHeader(data) {
  return `
    <div class="dp-header">
      <div class="dp-header-text">
        <div class="dp-title">${esc(data.title)}</div>
        <div class="dp-subtitle">${esc(data.subtitle)}</div>
      </div>
      <div class="dp-goal-reminder">${esc(data.goalReminder)}</div>
    </div>
  `;
}

/* ── Legend ── */
function renderLegend(typeLabels, typeColors, subTypeLabels, subTypeColors) {
  const items = Object.entries(typeLabels).map(([key, label]) => {
    const color = typeColors[key] || 'grey';
    return `
      <div class="dp-legend-item">
        <div class="dp-legend-bar ${esc(color)}"></div>
        <span class="dp-legend-text">${esc(label)}</span>
      </div>
    `;
  }).join('');

  // Sub-component legend (always shown when subTypeLabels exist)
  let subLegend = '';
  if (subTypeLabels && Object.keys(subTypeLabels).length > 0) {
    const subItems = Object.entries(subTypeLabels).map(([key, label]) => {
      const color = subTypeColors[key] || 'grey';
      const letter = KIND_LETTERS[key] || '?';
      return `
        <div class="dp-legend-item">
          <span class="dp-kind-badge ${esc(key)}">${letter}</span>
          <div class="dp-legend-bar ${esc(color)}"></div>
          <span class="dp-legend-text">${esc(label)}</span>
        </div>
      `;
    }).join('');

    subLegend = `<div class="dp-sub-legend">${subItems}</div>`;
  }

  // Expand all / collapse all button
  const expandBtn = `<button class="dp-expand-all-btn" id="expand-all-btn">\u25B6 Expand All Agents</button>`;

  return `<div class="dp-legend">${items}${expandBtn}</div>${subLegend}`;
}

/* ── Phase-boundary sprint IDs ── */
const PHASE_START_MAP = { 'P2-1': '2', 'P3-1': '3' };
const PHASE_LABELS = { '2': 'PHASE 2', '3': 'PHASE 3' };

/* ── Timeline header ── */
function renderTimelineHeader(sprints, phases) {
  const cols = sprints.map(s => {
    const phase = phaseForSprint(phases, s.id);
    const phaseNum = PHASE_START_MAP[s.id] || '';
    const phaseStartAttr = phaseNum ? ` data-phase-start="${phaseNum}"` : '';
    const phaseTag = phaseNum
      ? `<div class="dp-phase-tag phase${phaseNum}">${PHASE_LABELS[phaseNum]}</div>`
      : '';
    return `
      <div class="dp-sprint-hdr" data-phase="${esc(phase)}"${phaseStartAttr}>
        ${phaseTag}
        <div class="dp-sprint-label">${esc(s.label)}</div>
        <div class="dp-sprint-title">${esc(s.title)}</div>
        <div class="dp-sprint-weeks">${esc(s.weeks)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="dp-timeline-hdr">
      <div class="dp-timeline-spacer"></div>
      ${cols}
    </div>
  `;
}

/* ── Component row ── */
function renderComponentRow(comp, sprints, typeColors) {
  const startIdx = sprintIndex(sprints, comp.start);
  const endIdx = sprintIndex(sprints, comp.end);
  const color = typeColors[comp.type] || 'grey';
  const barSpan = endIdx - startIdx + 1;
  const hasReuse = comp.reusableBy && comp.reusableBy.length > 0;

  const cells = sprints.map((s, i) => {
    const ps = PHASE_START_MAP[s.id] ? ` data-phase-start="${PHASE_START_MAP[s.id]}"` : '';
    if (i < startIdx || i > endIdx) {
      return `<div class="dp-cell"${ps}></div>`;
    }

    let segClass = 'bar-mid';
    if (barSpan === 1) segClass = 'bar-single';
    else if (i === startIdx) segClass = 'bar-start';
    else if (i === endIdx) segClass = 'bar-end';

    const label = (i === startIdx && barSpan >= 2)
      ? `<span class="dp-bar-label">${esc(comp.name)}</span>`
      : '';

    const reuseIcon = (i === endIdx && hasReuse)
      ? `<span class="dp-bar-reuse">\u267B</span>`
      : '';

    return `<div class="dp-cell"${ps}>
      <div class="dp-bar ${esc(color)} ${segClass}">
        ${label}${reuseIcon}
      </div>
    </div>`;
  }).join('');

  // Tooltip
  const reuseText = hasReuse
    ? `<div class="dp-tooltip-reuse">\u267B Reusable by: ${comp.reusableBy.join(', ')}</div>`
    : '';

  const trackTag = comp.track && comp.track !== 'all'
    ? `<div class="dp-tooltip-track">Track: ${comp.track.toUpperCase()}</div>`
    : '';

  // "Show in Architecture" button
  const ref = comp.architectureRef;
  const archBtn = ref
    ? `<button class="dp-show-arch" data-arch-ref='${JSON.stringify(ref)}' data-comp-name="${esc(comp.name)}">Show in Architecture \u2192</button>`
    : '';

  const tooltip = `
    <div class="dp-tooltip">
      <div class="dp-tooltip-title">${esc(comp.name)}</div>
      <div class="dp-tooltip-detail">${esc(comp.detail || '')}</div>
      ${trackTag}
      ${reuseText}
      ${archBtn}
    </div>
  `;

  // Expand toggle for expandable components
  const isExpandable = comp.expandable && comp.subComponents && comp.subComponents.length > 0;
  const isExpanded = expandedComponents.has(comp.id);
  const expandToggle = isExpandable
    ? `<span class="dp-expand-toggle ${isExpanded ? 'expanded' : ''}" data-comp-id="${esc(comp.id)}">\u25B6</span>`
    : '';

  const subCount = isExpandable
    ? `<span style="font-size:7px;color:rgba(0,0,0,0.35);margin-left:2px">(${comp.subComponents.length})</span>`
    : '';

  return `
    <div class="dp-row" data-comp-id="${esc(comp.id)}">
      <div class="dp-comp-label">
        <div class="dp-comp-name">${expandToggle}${trackBadge(comp.track)}${esc(comp.name)}${subCount}</div>
        <div class="dp-comp-approach">${esc(comp.approach)}</div>
      </div>
      ${cells}
      ${tooltip}
    </div>
  `;
}

/* ── Sub-component row ── */
function renderSubComponentRow(sub, sprints, subTypeColors) {
  const startIdx = sprintIndex(sprints, sub.start);
  const endIdx = sprintIndex(sprints, sub.end);
  const color = subTypeColors[sub.type] || 'grey';
  const barSpan = endIdx - startIdx + 1;
  const kindLetter = KIND_LETTERS[sub.kind] || '?';

  const cells = sprints.map((s, i) => {
    const ps = PHASE_START_MAP[s.id] ? ` data-phase-start="${PHASE_START_MAP[s.id]}"` : '';
    if (i < startIdx || i > endIdx) {
      return `<div class="dp-cell"${ps}></div>`;
    }

    let segClass = 'bar-mid';
    if (barSpan === 1) segClass = 'bar-single';
    else if (i === startIdx) segClass = 'bar-start';
    else if (i === endIdx) segClass = 'bar-end';

    const label = (i === startIdx && barSpan >= 2)
      ? `<span class="dp-bar-label">${esc(sub.name)}</span>`
      : '';

    return `<div class="dp-cell"${ps}>
      <div class="dp-bar ${esc(color)} ${segClass}">
        ${label}
      </div>
    </div>`;
  }).join('');

  // Tooltip for sub-component
  const sharedText = sub.sharedWith && sub.sharedWith.length > 0
    ? `<div class="dp-tooltip-shared">\u2194 Shared with: ${sub.sharedWith.join(', ')}</div>`
    : '';

  const useCaseText = sub.useCaseRef && sub.useCaseRef.length > 0
    ? `<div class="dp-tooltip-usecase">UPM use case: ${sub.useCaseRef.join(', ')}</div>`
    : '';

  const tooltip = `
    <div class="dp-tooltip">
      <div class="dp-tooltip-title">${esc(sub.name)}</div>
      <div class="dp-tooltip-detail">${esc(sub.detail || '')}</div>
      ${sharedText}
      ${useCaseText}
    </div>
  `;

  return `
    <div class="dp-row dp-sub-row" data-comp-id="${esc(sub.id)}">
      <div class="dp-comp-label">
        <div class="dp-comp-name"><span class="dp-kind-badge ${esc(sub.kind)}">${kindLetter}</span>${esc(sub.name)}</div>
      </div>
      ${cells}
      ${tooltip}
    </div>
  `;
}

/* ── Group ── */
function renderGroup(group, sprints, typeColors, subTypeColors) {
  const rows = (group.components || []).map(c => {
    let html = renderComponentRow(c, sprints, typeColors);

    // If expanded, render sub-component rows
    if (c.expandable && c.subComponents && expandedComponents.has(c.id)) {
      html += c.subComponents.map(sub =>
        renderSubComponentRow(sub, sprints, subTypeColors)
      ).join('');
    }

    return html;
  }).join('');

  const savingsTag = group.savings
    ? `<span class="dp-group-savings">${esc(group.savings)} of target</span>`
    : '';

  const approachTag = group.approach
    ? `<span class="dp-group-approach">${esc(group.approach)}</span>`
    : '';

  const reusableClass = group.reusable ? ' reusable' : '';

  return `
    <div class="dp-group${reusableClass}">
      <div class="dp-group-hdr">
        <div class="dp-group-label">
          <span class="dp-group-icon">${group.icon || ''}</span>
          <span class="dp-group-name">${esc(group.name)}</span>
        </div>
        <div class="dp-group-meta">
          ${savingsTag}
          ${approachTag}
        </div>
      </div>
      ${rows}
    </div>
  `;
}

/* ── Cross-domain section ── */
function renderCrossDomain(cd) {
  const cards = (cd.items || []).map(item => {
    const usedLines = Array.isArray(item.usedBy)
      ? item.usedBy.map(u => esc(u)).join(' \u00B7 ')
      : esc(item.usedBy);

    return `
      <div class="dp-cd-card">
        <div class="dp-cd-card-name">${esc(item.component)}</div>
        <div class="dp-cd-card-used">${usedLines}</div>
        <div class="dp-cd-card-expands">\u2192 ${esc(item.expandsTo)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="dp-crossdomain">
      <div class="dp-cd-top">
        <div class="dp-cd-headline">${esc(cd.headline)}</div>
        <div class="dp-cd-subtext">${esc(cd.subtext)}</div>
      </div>
      <div class="dp-cd-grid">${cards}</div>
    </div>
  `;
}

/* ── Rerender (preserves expand state) ── */
function rerender() {
  if (!cachedData) return;
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = renderFactoryGantt(cachedData);
}

/* ── Main Export ── */
export function renderFactoryGantt(data) {
  cachedData = data;

  const sprints = data.timeline.sprints;
  const phases = data.phases || [];
  const groups = data.groups || [];
  const typeColors = data.typeColors || {};
  const typeLabels = data.typeLabels || {};
  const subTypeColors = data.subComponentTypeColors || {};
  const subTypeLabels = data.subComponentTypeLabels || {};

  const groupsHtml = groups.map(g =>
    renderGroup(g, sprints, typeColors, subTypeColors)
  ).join('');

  // Dynamic width: 260px label + min 80px per sprint column
  // Slide uses min-width so it can expand to viewport on wide screens
  const sprintCount = sprints.length;
  const minWidth = 260 + sprintCount * 80;

  // Wire interactions after DOM update
  requestAnimationFrame(() => wireClickToPin());

  return `
    <div class="dp-slide" style="min-width:${minWidth}px; --sprint-count:${sprintCount}; --label-width:260px">
      ${renderHeader(data)}
      ${renderLegend(typeLabels, typeColors, subTypeLabels, subTypeColors)}
      <div class="dp-body">
        ${renderTimelineHeader(sprints, phases)}
        ${groupsHtml}
      </div>
      ${data.crossDomain ? renderCrossDomain(data.crossDomain) : ''}
      <div class="dp-footer">
        <div class="dp-pagenum">${esc(data.pageNum || '')}</div>
      </div>
    </div>
  `;
}

/* ── Collect all expandable IDs ── */
function getAllExpandableIds() {
  if (!cachedData) return [];
  const ids = [];
  for (const g of cachedData.groups || []) {
    for (const c of g.components || []) {
      if (c.expandable && c.subComponents && c.subComponents.length > 0) {
        ids.push(c.id);
      }
    }
  }
  return ids;
}

/* ── Position tooltip above the middle of the bar span ── */
function positionTooltip(row) {
  const tooltip = row.querySelector('.dp-tooltip');
  if (!tooltip) return;
  const bars = row.querySelectorAll('.dp-bar');
  if (bars.length === 0) return;
  const rowRect = row.getBoundingClientRect();
  const firstBar = bars[0].getBoundingClientRect();
  const lastBar = bars[bars.length - 1].getBoundingClientRect();
  const spanCenter = ((firstBar.left + lastBar.right) / 2) - rowRect.left;
  const tooltipWidth = tooltip.offsetWidth || 200;
  const left = Math.max(230, spanCenter - tooltipWidth / 2);
  tooltip.style.left = left + 'px';
}

/* ── Click-to-pin + expand/collapse ── */
function wireClickToPin() {
  const rows = document.querySelectorAll('.dp-row');

  // Position tooltips on hover
  rows.forEach(row => {
    row.addEventListener('mouseenter', () => positionTooltip(row));
  });

  rows.forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't pin if clicking the arch button or expand toggle
      if (e.target.closest('.dp-show-arch')) return;
      if (e.target.closest('.dp-expand-toggle')) return;

      const wasPinned = row.classList.contains('pinned');
      document.querySelectorAll('.dp-row.pinned').forEach(r => r.classList.remove('pinned'));
      if (!wasPinned) {
        row.classList.add('pinned');
      }
    });
  });

  // Click outside = unpin
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dp-row') && !e.target.closest('.arch-panel') && !e.target.closest('.arch-panel-backdrop')) {
      document.querySelectorAll('.dp-row.pinned').forEach(r => r.classList.remove('pinned'));
    }
  });

  // Wire "Show in Architecture" buttons
  document.querySelectorAll('.dp-show-arch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ref = JSON.parse(btn.dataset.archRef);
      const compName = btn.dataset.compName;
      openFactoryArchPanel(ref, compName);
    });
  });

  // Wire expand/collapse toggles
  document.querySelectorAll('.dp-expand-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const compId = toggle.dataset.compId;
      if (expandedComponents.has(compId)) {
        expandedComponents.delete(compId);
      } else {
        expandedComponents.add(compId);
      }
      rerender();
    });
  });

  // Wire "Expand All / Collapse All" button
  const expandAllBtn = document.getElementById('expand-all-btn');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const allIds = getAllExpandableIds();
      const allExpanded = allIds.every(id => expandedComponents.has(id));

      if (allExpanded) {
        expandedComponents.clear();
        expandAllBtn.innerHTML = '\u25B6 Expand All Agents';
      } else {
        allIds.forEach(id => expandedComponents.add(id));
        expandAllBtn.innerHTML = '\u25BC Collapse All Agents';
      }
      rerender();
    });
  }
}
