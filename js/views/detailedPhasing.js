/**
 * Detailed Phasing view — Gantt-style component-level implementation timeline.
 * Pure function returning HTML string.
 * Supports click-to-pin tooltips and "Show in Architecture" cross-reference.
 */
import { esc } from '../utils/render.js';
import { open as openArchPanel } from '../components/archPanel.js';

/* ── Sprint index helper ── */
function sprintIndex(sprints, sprintId) {
  return sprints.findIndex(s => s.id === sprintId);
}

/* ── Determine phase for a sprint ── */
function phaseForSprint(phases, sprintId) {
  for (const p of phases) {
    if (p.sprints.includes(sprintId)) return p.id;
  }
  return '';
}

/* ── Render header ── */
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

/* ── Render type legend ── */
function renderLegend(typeLabels, typeColors) {
  const items = Object.entries(typeLabels).map(([key, label]) => {
    const color = typeColors[key] || 'grey';
    return `
      <div class="dp-legend-item">
        <div class="dp-legend-bar ${esc(color)}"></div>
        <span class="dp-legend-text">${esc(label)}</span>
      </div>
    `;
  }).join('');

  return `<div class="dp-legend">${items}</div>`;
}

/* ── Render timeline header row ── */
function renderTimelineHeader(sprints, phases) {
  const cols = sprints.map(s => {
    const phase = phaseForSprint(phases, s.id);
    return `
      <div class="dp-sprint-hdr" data-phase="${esc(phase)}">
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

/* ── Render a Gantt bar across sprint cells ── */
function renderComponentRow(comp, sprints, typeColors) {
  const startIdx = sprintIndex(sprints, comp.start);
  const endIdx = sprintIndex(sprints, comp.end);
  const color = typeColors[comp.type] || 'grey';
  const barSpan = endIdx - startIdx + 1;
  const hasReuse = comp.reusableBy && comp.reusableBy.length > 0;

  // Build cells
  const cells = sprints.map((s, i) => {
    if (i < startIdx || i > endIdx) {
      return `<div class="dp-cell"></div>`;
    }

    // Determine bar segment class
    let segClass = 'bar-mid';
    if (barSpan === 1) segClass = 'bar-single';
    else if (i === startIdx) segClass = 'bar-start';
    else if (i === endIdx) segClass = 'bar-end';

    // Only show label in start cell if bar spans 2+
    const label = (i === startIdx && barSpan >= 2)
      ? `<span class="dp-bar-label">${esc(comp.name)}</span>`
      : '';

    const reuseIcon = (i === endIdx && hasReuse)
      ? `<span class="dp-bar-reuse">\u267B</span>`
      : '';

    return `<div class="dp-cell">
      <div class="dp-bar ${esc(color)} ${segClass}">
        ${label}${reuseIcon}
      </div>
    </div>`;
  }).join('');

  // Siili ready badge
  let siiliBadge = '';
  if (comp.siiliReady === 'ready') {
    siiliBadge = `<div class="dp-comp-siili"><span class="dp-comp-siili-dot ready">\u2713</span><span class="dp-comp-siili-text">Siili ready</span></div>`;
  } else if (comp.siiliReady === 'partial') {
    siiliBadge = `<div class="dp-comp-siili"><span class="dp-comp-siili-dot partial">\u25CB</span><span class="dp-comp-siili-text">Partial</span></div>`;
  }

  // Tooltip
  const reuseText = hasReuse
    ? `<div class="dp-tooltip-reuse">\u267B Reusable by: ${comp.reusableBy.join(', ')}</div>`
    : '';

  // "Show in Architecture" button (only for components with architectureRef)
  const ref = comp.architectureRef;
  const archBtn = ref
    ? `<button class="dp-show-arch" data-arch-ref='${JSON.stringify(ref)}' data-comp-name="${esc(comp.name)}">Show in Architecture \u2192</button>`
    : '';

  const tooltip = `
    <div class="dp-tooltip">
      <div class="dp-tooltip-title">${esc(comp.name)}</div>
      <div class="dp-tooltip-detail">${esc(comp.detail || '')}</div>
      ${reuseText}
      ${archBtn}
    </div>
  `;

  return `
    <div class="dp-row" data-comp-id="${esc(comp.id)}">
      <div class="dp-comp-label">
        <div class="dp-comp-name">${esc(comp.name)}</div>
        <div class="dp-comp-approach">${esc(comp.approach)}</div>
        ${siiliBadge}
      </div>
      ${cells}
      ${tooltip}
    </div>
  `;
}

/* ── Render a capability group ── */
function renderGroup(group, sprints, typeColors) {
  const rows = (group.components || []).map(c =>
    renderComponentRow(c, sprints, typeColors)
  ).join('');

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

/* ── Render cross-domain section ── */
function renderCrossDomain(cd) {
  const cards = (cd.items || []).map(item => {
    const usedLines = Array.isArray(item.usedBy)
      ? item.usedBy.map(u => esc(u)).join(' \u00b7 ')
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

/* ── Main Export ── */
export function renderDetailedPhasing(data) {
  const sprints = data.timeline.sprints;
  const phases = data.phases || [];
  const groups = data.groups || [];
  const typeColors = data.typeColors || {};
  const typeLabels = data.typeLabels || {};

  const groupsHtml = groups.map(g =>
    renderGroup(g, sprints, typeColors)
  ).join('');

  // Schedule click-to-pin wiring after DOM update
  requestAnimationFrame(() => wireClickToPin());

  return `
    <div class="dp-slide">
      ${renderHeader(data)}
      ${renderLegend(typeLabels, typeColors)}
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

/* ── Click-to-pin tooltip behavior ── */
function wireClickToPin() {
  const rows = document.querySelectorAll('.dp-row');

  rows.forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't pin if clicking the arch button (let it handle its own event)
      if (e.target.closest('.dp-show-arch')) return;

      const wasPinned = row.classList.contains('pinned');

      // Unpin all rows
      document.querySelectorAll('.dp-row.pinned').forEach(r => r.classList.remove('pinned'));

      // Toggle pin on clicked row
      if (!wasPinned) {
        row.classList.add('pinned');
      }
    });
  });

  // Click outside any row = unpin all
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
      openArchPanel(ref, compName);
    });
  });
}
