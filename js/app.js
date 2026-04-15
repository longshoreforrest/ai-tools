/**
 * Main application module.
 * Handles tab navigation, data fetching / caching, tool filtering, and view rendering.
 */
import { renderToolComparison } from './views/toolComparison.js';
import { renderFunctionalityMatrix } from './views/functionalityMatrix.js';
import { renderAgentArchitecture } from './views/agentArchitecture.js';
import { renderRadarChart, buildComparisonScores, computeFunctionalityScores, wireRadarInteractions, wireRadarDimensionToggle } from './views/radarChart.js';
import { renderComplianceCosts } from './views/complianceCosts.js';
import { renderPhasingRoadmap } from './views/phasingRoadmap.js';
import { renderDetailedPhasing } from './views/detailedPhasing.js';
import { renderArchitectureOverview } from './views/architectureOverview.js';
import { renderKpiFramework } from './views/kpiFramework.js';
import { renderFactoryGantt } from './views/factoryGantt.js';
import { renderFactoryArchitecture } from './views/factoryArchitecture.js';
import { exportSlideToPptx } from './utils/exportPptx.js';
import { exportToolComparisonToExcel, exportFunctionalityMatrixToExcel, exportComplianceCostsToExcel } from './utils/exportExcel.js';

const TABS = [
  { id: 'tool-comparison',      label: 'Tool Comparison',      cssFile: 'css/tool-comparison.css',      hasToolFilter: true },
  { id: 'functionality-matrix', label: 'Functionality Matrix', cssFile: 'css/functionality-matrix.css', hasToolFilter: true },
  { id: 'compliance-costs',    label: 'Compliance & Costs',   cssFile: 'css/compliance-costs.css',      hasToolFilter: true },
  { id: 'knowledge-gen-agent',   label: 'Knowledge Generator', cssFile: 'css/agent-slide.css',           hasToolFilter: false },
  { id: 'demand-agent',          label: 'Demand Assistant',    cssFile: 'css/agent-slide.css',           hasToolFilter: false },
  { id: 'biz-intent-agent',     label: 'Biz Intent Translator', cssFile: 'css/agent-slide.css',        hasToolFilter: false },
  { id: 'sparring-agent',       label: 'Sparring Agent',      cssFile: 'css/agent-slide.css',           hasToolFilter: false },
  { id: 'builder-agent',        label: 'Builder Agent',       cssFile: 'css/agent-slide.css',           hasToolFilter: false },
  { id: 'quality-agent',        label: 'Quality Agent',       cssFile: 'css/agent-slide.css',           hasToolFilter: false },
  { id: 'architecture',          label: 'Architecture',        cssFile: 'css/architecture.css',          hasToolFilter: false },
  { id: 'phasing',              label: 'Phasing',             cssFile: 'css/phasing.css',               hasToolFilter: false },
  { id: 'detailed-phasing',    label: 'Detailed Plan',       cssFile: 'css/detailed-phasing.css',      hasToolFilter: false },
  { id: 'kpi-framework',       label: 'KPIs',               cssFile: 'css/kpi-framework.css',         hasToolFilter: false },
  { id: 'factory-gantt',       label: 'Factory Gantt',      cssFile: 'css/factory-gantt.css',         hasToolFilter: false },
  { id: 'factory-arch',        label: 'Factory Arch',       cssFile: 'css/factory-architecture.css',  hasToolFilter: false },
];

/** Simple fetch-and-cache store keyed by URL path. */
const cache = {};

/** Currently active tab ID */
let activeTabId = null;

/** Set of selected tool IDs (all selected by default, populated on first data load) */
let selectedTools = null;

/** Set of selected role categories ('biz', 'tech') — both selected by default */
let selectedRoles = new Set(['biz', 'tech']);

/** Set of selected capability IDs — all selected by default, populated on first data load */
let selectedCapabilities = null;

/** Set of selected compliance dimension IDs — all selected by default, populated on first load */
let selectedDimensions = null;

/** Active view mode for tabs that support Table/Chart toggle */
let activeViewMode = 'table';

/** Whether radar chart dimensions are flipped (tools as axes, capabilities as polygons) */
let radarFlipped = false;

const ROLES = [
  { id: 'biz', label: 'Non-technical roles', desc: 'Business Analysts \u00b7 PMs \u00b7 Product Owners \u00b7 Doc Owners' },
  { id: 'tech', label: 'Technical roles', desc: 'Architects \u00b7 Developers \u00b7 QA Engineers' },
];

/** Short labels for capability chips — number is rendered separately */
const CAP_SHORT = {
  'knowledge-gen':    'Knowledge Gen',
  'demand-assistant': 'Demand Assistant',
  'biz-intent':       'Biz Intent',
  'tech-spec':        'Tech Sparring',
  'builder':          'Builder / Coding',
  'quality':          'Quality & Test',
};

/** Short labels for compliance dimension chips */
const DIM_SHORT = {
  'security-compliance':  'Security',
  'data-privacy':         'Privacy',
  'enterprise-readiness': 'Enterprise',
  'cost-licensing':       'Cost',
};

/**
 * Load a JSON file, caching the result for subsequent calls.
 */
async function loadJSON(path) {
  if (!cache[path]) {
    const url = path + '?v=' + Date.now();
    cache[path] = await fetch(url).then(r => {
      if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
      return r.json();
    });
  }
  return cache[path];
}

/**
 * Swap the view-specific stylesheet.
 */
function switchCSS(cssFile) {
  let link = document.getElementById('view-css');
  if (!link) {
    link = document.createElement('link');
    link.id = 'view-css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = cssFile + '?v=' + Date.now();
}

/* ────────────────────────────────────────────
   TOOL FILTER BAR
   ──────────────────────────────────────────── */

/**
 * Render tool, role, and capability filter chips into the #tool-filter bar.
 */
function renderToolFilter(tools, capabilities) {
  const filterEl = document.getElementById('tool-filter');
  const isCompliance = activeTabId === 'compliance-costs';

  const check = '\u2713 ';

  // Row 1: Tools + Roles (roles hidden on compliance tab)
  const toolChipsHtml =
    `<span class="filter-heading">Filter</span>` +
    `<span class="filter-section-label">Tools</span>` +
    tools.map(t => {
      const isActive = selectedTools.has(t.id);
      const typeCls = t.isBuild ? ' build' : (t.category ? ` ${t.category}` : '');
      const label = isActive ? check + t.name : t.name;
      return `<button class="tool-chip${isActive ? ' active' : ''}${typeCls}" data-tool-id="${t.id}">${label}</button>`;
    }).join('');

  let roleChipsHtml = '';
  if (!isCompliance) {
    roleChipsHtml =
      `<div class="filter-divider"></div>` +
      `<span class="filter-section-label">Roles</span>` +
      ROLES.map(r => {
        const isActive = selectedRoles.has(r.id);
        const label = isActive ? check + r.label : r.label;
        return `<button class="role-chip${isActive ? ' active' : ''} ${r.id}" data-role-id="${r.id}" title="${r.desc}">${label}</button>`;
      }).join('');
  }

  // Row 2: Capabilities or Dimensions
  let row2Html = '';
  if (isCompliance && selectedDimensions) {
    const dimChipsHtml =
      `<span class="filter-section-label">Dimensions</span>` +
      capabilities.map(d => {
        const isActive = selectedDimensions.has(d.id);
        const shortLabel = DIM_SHORT[d.id] || d.name;
        const label = isActive ? check + shortLabel : shortLabel;
        return `<button class="cap-chip${isActive ? ' active' : ''}" data-dim-id="${d.id}" title="${d.name} \u2014 ${d.description}"><span class="cap-num">${d.number}</span>${label}</button>`;
      }).join('');
    row2Html = `<div class="filter-row">${dimChipsHtml}</div>`;
  } else if (!isCompliance) {
    const capChipsHtml =
      `<span class="filter-section-label">Capabilities</span>` +
      capabilities.map(c => {
        const isActive = selectedCapabilities.has(c.id);
        const shortLabel = CAP_SHORT[c.id] || c.name;
        const label = isActive ? check + shortLabel : shortLabel;
        return `<button class="cap-chip${isActive ? ' active' : ''} ${c.roleCategory}" data-cap-id="${c.id}" title="${c.name} \u2014 ${c.roleLabel}"><span class="cap-num">${c.number}</span>${label}</button>`;
      }).join('');
    row2Html = `<div class="filter-row">${capChipsHtml}</div>`;
  }

  filterEl.innerHTML =
    `<div class="filter-row">${toolChipsHtml}${roleChipsHtml}</div>` +
    row2Html;

  // Wire tool chip click handlers
  filterEl.querySelectorAll('.tool-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const toolId = chip.dataset.toolId;
      if (selectedTools.has(toolId)) {
        if (selectedTools.size > 1) selectedTools.delete(toolId);
      } else {
        selectedTools.add(toolId);
      }
      renderToolFilter(tools, capabilities);
      renderCurrentView();
    });
  });

  // Wire role chip click handlers
  filterEl.querySelectorAll('.role-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const roleId = chip.dataset.roleId;
      if (selectedRoles.has(roleId)) {
        if (selectedRoles.size > 1) selectedRoles.delete(roleId);
      } else {
        selectedRoles.add(roleId);
      }
      renderToolFilter(tools, capabilities);
      renderCurrentView();
    });
  });

  // Wire capability chip click handlers
  filterEl.querySelectorAll('.cap-chip[data-cap-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      const capId = chip.dataset.capId;
      if (selectedCapabilities.has(capId)) {
        if (selectedCapabilities.size > 1) selectedCapabilities.delete(capId);
      } else {
        selectedCapabilities.add(capId);
      }
      renderToolFilter(tools, capabilities);
      renderCurrentView();
    });
  });

  // Wire dimension chip click handlers
  filterEl.querySelectorAll('.cap-chip[data-dim-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      const dimId = chip.dataset.dimId;
      if (selectedDimensions.has(dimId)) {
        if (selectedDimensions.size > 1) selectedDimensions.delete(dimId);
      } else {
        selectedDimensions.add(dimId);
      }
      renderToolFilter(tools, capabilities);
      renderCurrentView();
    });
  });

}

/**
 * Render the Table/Chart view toggle + export buttons into the #view-toggle bar.
 */
function renderViewToggle(tools, capabilities) {
  const toggleEl = document.getElementById('view-toggle');
  const check = '\u2713 ';

  const buttonsHtml = ['table', 'chart'].map(mode => {
    const isActive = activeViewMode === mode;
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    return `<button class="view-toggle-btn${isActive ? ' active' : ''}" data-view-mode="${mode}">${isActive ? check : ''}${label}</button>`;
  }).join('');

  const showExcel = activeViewMode === 'table';
  const exportHtml = `<div class="export-group">` +
    `<span class="view-toggle-label">Export</span>` +
    (showExcel ? `<button class="export-btn" id="bar-export-xlsx"><span class="export-icon">\uD83D\uDCCA</span> Excel</button>` : '') +
    `<button class="export-btn" id="bar-export-pptx"><span class="export-icon">\uD83D\uDCDD</span> PPTX</button>` +
    `<button class="export-btn" id="bar-export-html"><span class="export-icon">\uD83C\uDF10</span> HTML</button>` +
    `</div>`;

  toggleEl.innerHTML = `<span class="view-toggle-label">View</span>${buttonsHtml}${exportHtml}`;

  toggleEl.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeViewMode = btn.dataset.viewMode;
      renderViewToggle(tools, capabilities);
      renderToolFilter(tools, capabilities);
      renderCurrentView();
    });
  });

  // Wire in-bar PPTX export
  const barPptx = document.getElementById('bar-export-pptx');
  if (barPptx) {
    barPptx.addEventListener('click', () => {
      const tab = TABS.find(t => t.id === activeTabId);
      exportSlideToPptx(tab ? tab.label : 'export');
    });
  }

  // Wire in-bar Excel export
  const barXlsx = document.getElementById('bar-export-xlsx');
  if (barXlsx) {
    barXlsx.addEventListener('click', () => handleExcelExport(barXlsx));
  }

  // Wire in-bar HTML export
  const barHtml = document.getElementById('bar-export-html');
  if (barHtml) {
    barHtml.addEventListener('click', () => handleHtmlExport(barHtml));
  }
}

/**
 * Show or hide the tool filter bar based on the active tab.
 */
function updateFilterVisibility() {
  const tab = TABS.find(t => t.id === activeTabId);
  const show = tab && tab.hasToolFilter;
  const filterEl = document.getElementById('tool-filter');
  const toggleEl = document.getElementById('view-toggle');
  filterEl.hidden = !show;
  toggleEl.hidden = !show;
  filterEl.style.display = show ? '' : 'none';
  toggleEl.style.display = show ? '' : 'none';
}

/* ────────────────────────────────────────────
   VIEW RENDERING
   ──────────────────────────────────────────── */

/**
 * Re-render just the #app content for the current tab (used after tool filter changes).
 */
async function renderCurrentView() {
  if (!activeTabId) return;
  const app = document.getElementById('app');

  try {
    if (activeTabId === 'tool-comparison') {
      const [allTools, allCapabilities, comparison] = await Promise.all([
        loadJSON('data/tools.json'),
        loadJSON('data/capabilities.json'),
        loadJSON('data/comparison.json'),
      ]);
      const tools = allTools.filter(t => selectedTools.has(t.id));
      const capabilities = allCapabilities.filter(c =>
        selectedRoles.has(c.roleCategory) && selectedCapabilities.has(c.id),
      );
      if (activeViewMode === 'chart') {
        const scores = buildComparisonScores(tools, capabilities, comparison);
        app.innerHTML = renderRadarChart(tools, capabilities, scores, 'AI Tool Fit \u2014 Radar View', radarFlipped, comparison);
        wireRadarInteractions(app);
        wireRadarDimensionToggle(app, (flipped) => { radarFlipped = flipped; renderCurrentView(); });
      } else {
        app.innerHTML = renderToolComparison(tools, capabilities, comparison);
      }

    } else if (activeTabId === 'functionality-matrix') {
      const [allTools, allCapabilities, allFunctionality] = await Promise.all([
        loadJSON('data/tools.json'),
        loadJSON('data/capabilities.json'),
        loadJSON('data/functionality.json'),
      ]);
      const tools = allTools.filter(t => selectedTools.has(t.id));
      const capabilities = allCapabilities.filter(c =>
        selectedRoles.has(c.roleCategory) && selectedCapabilities.has(c.id),
      );
      const functionality = allFunctionality.filter(g =>
        selectedRoles.has(g.roleCategory) && selectedCapabilities.has(g.capabilityId),
      );
      if (activeViewMode === 'chart') {
        const scores = computeFunctionalityScores(tools, capabilities, functionality);
        app.innerHTML = renderRadarChart(tools, capabilities, scores, 'Functionality Matrix \u2014 Radar View', radarFlipped);
        wireRadarInteractions(app);
        wireRadarDimensionToggle(app, (flipped) => { radarFlipped = flipped; renderCurrentView(); });
      } else {
        app.innerHTML = renderFunctionalityMatrix(tools, functionality);
      }

    } else if (activeTabId === 'compliance-costs') {
      const [allTools, allDimensions, compliance, links] = await Promise.all([
        loadJSON('data/tools.json'),
        loadJSON('data/compliance-dimensions.json'),
        loadJSON('data/compliance.json'),
        loadJSON('data/compliance-links.json'),
      ]);
      const tools = allTools.filter(t => selectedTools.has(t.id));
      const dimensions = allDimensions.filter(d => selectedDimensions.has(d.id));
      if (activeViewMode === 'chart') {
        const scores = buildComparisonScores(tools, dimensions, compliance);
        app.innerHTML = renderRadarChart(tools, dimensions, scores, 'Compliance & Costs \u2014 Radar View', radarFlipped, compliance);
        wireRadarInteractions(app);
        wireRadarDimensionToggle(app, (flipped) => { radarFlipped = flipped; renderCurrentView(); });
      } else {
        app.innerHTML = renderComplianceCosts(tools, dimensions, compliance, links);
      }

    } else if (activeTabId === 'architecture') {
      const data = await loadJSON('data/architecture.json');
      app.innerHTML = renderArchitectureOverview(data);

    } else if (activeTabId === 'phasing') {
      const data = await loadJSON('data/phasing.json');
      app.innerHTML = renderPhasingRoadmap(data);

    } else if (activeTabId === 'detailed-phasing') {
      const data = await loadJSON('data/detailed-phasing.json');
      app.innerHTML = renderDetailedPhasing(data);

    } else if (activeTabId === 'kpi-framework') {
      const data = await loadJSON('data/kpi-framework.json');
      app.innerHTML = renderKpiFramework(data);

    } else if (activeTabId === 'factory-gantt') {
      const data = await loadJSON('data/factory-gantt.json');
      app.innerHTML = renderFactoryGantt(data);

    } else if (activeTabId === 'factory-arch') {
      const data = await loadJSON('data/factory-architecture.json');
      app.innerHTML = renderFactoryArchitecture(data);

    } else {
      const agentFile = activeTabId.replace('-agent', '');
      const data = await loadJSON(`data/agents/${agentFile}.json`);
      app.innerHTML = renderAgentArchitecture(data);
    }
  } catch (err) {
    console.error(`[app] Error rendering ${activeTabId}:`, err);
    app.innerHTML = `<div style="padding:40px;color:#b05a40;font-family:monospace;">
      <strong>Error loading view:</strong> ${err.message}
    </div>`;
  }

  // Reposition floating PPTX button (agent tabs only)
  requestAnimationFrame(positionExportButton);
}

/**
 * Navigate to a tab: update active state, swap CSS, render view.
 */
async function navigate(tabId) {
  const tab = TABS.find(t => t.id === tabId);
  if (!tab) return;

  activeTabId = tabId;
  activeViewMode = 'table';
  radarFlipped = false;

  // Update active tab styling
  document.querySelectorAll('.nav-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tabId),
  );

  // Switch the view-specific stylesheet
  switchCSS(tab.cssFile);

  // Initialise selectedTools and selectedCapabilities on first load
  if (!selectedTools) {
    const tools = await loadJSON('data/tools.json');
    selectedTools = new Set(tools.map(t => t.id));
  }
  if (!selectedCapabilities) {
    const caps = await loadJSON('data/capabilities.json');
    selectedCapabilities = new Set(caps.map(c => c.id));
  }

  // Initialise compliance dimensions on first load
  if (!selectedDimensions) {
    const dims = await loadJSON('data/compliance-dimensions.json');
    selectedDimensions = new Set(dims.map(d => d.id));
  }

  // Show/hide filter bar, update chips
  updateFilterVisibility();
  if (tab.hasToolFilter) {
    const tools = await loadJSON('data/tools.json');
    if (activeTabId === 'compliance-costs') {
      const dims = await loadJSON('data/compliance-dimensions.json');
      renderToolFilter(tools, dims);
      renderViewToggle(tools, dims);
    } else {
      const capabilities = await loadJSON('data/capabilities.json');
      renderToolFilter(tools, capabilities);
      renderViewToggle(tools, capabilities);
    }
  }

  // Render the view
  await renderCurrentView();
}

/* ────────────────────────────────────────────
   EXPORT HELPERS
   ──────────────────────────────────────────── */

/**
 * Position the floating PPTX button at the top-right of .slide.
 * Only used for agent tabs — on table/chart tabs the button is in the view-toggle bar.
 */
function positionExportButton() {
  const btn = document.getElementById('export-pptx-btn');
  if (!btn) return;

  const tab = TABS.find(t => t.id === activeTabId);
  const slideEl = document.querySelector('#app .slide');

  // Hide on tabs that have the view-toggle bar (export buttons live there)
  if ((tab && tab.hasToolFilter) || !slideEl) {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = '';
  const rect = slideEl.getBoundingClientRect();
  btn.style.top  = (rect.top + window.scrollY + 8) + 'px';
  btn.style.left = (rect.right + window.scrollX - btn.offsetWidth - 8) + 'px';
}

/**
 * Handle Excel export click — loads filtered data and calls the appropriate export function.
 */
async function handleExcelExport(btnEl) {
  const tab = TABS.find(t => t.id === activeTabId);
  const label = tab ? tab.label : 'export';
  btnEl.innerHTML = '\u23F3 Exporting\u2026';
  btnEl.classList.add('exporting');
  try {
    if (activeTabId === 'tool-comparison') {
      const [allTools, allCapabilities, comparison] = await Promise.all([
        loadJSON('data/tools.json'),
        loadJSON('data/capabilities.json'),
        loadJSON('data/comparison.json'),
      ]);
      const tools = allTools.filter(t => selectedTools.has(t.id));
      const capabilities = allCapabilities.filter(c =>
        selectedRoles.has(c.roleCategory) && selectedCapabilities.has(c.id),
      );
      await exportToolComparisonToExcel(tools, capabilities, comparison, label);
    } else if (activeTabId === 'functionality-matrix') {
      const [allTools, , allFunctionality] = await Promise.all([
        loadJSON('data/tools.json'),
        loadJSON('data/capabilities.json'),
        loadJSON('data/functionality.json'),
      ]);
      const tools = allTools.filter(t => selectedTools.has(t.id));
      const functionality = allFunctionality.filter(g =>
        selectedRoles.has(g.roleCategory) && selectedCapabilities.has(g.capabilityId),
      );
      await exportFunctionalityMatrixToExcel(tools, functionality, label);
    } else if (activeTabId === 'compliance-costs') {
      const [allTools, allDimensions, compliance, links] = await Promise.all([
        loadJSON('data/tools.json'),
        loadJSON('data/compliance-dimensions.json'),
        loadJSON('data/compliance.json'),
        loadJSON('data/compliance-links.json'),
      ]);
      const tools = allTools.filter(t => selectedTools.has(t.id));
      const dimensions = allDimensions.filter(d => selectedDimensions.has(d.id));
      await exportComplianceCostsToExcel(tools, dimensions, compliance, links, label);
    }
  } catch (err) {
    console.error('[exportExcel] Export failed:', err);
    alert('Excel export failed \u2014 see console for details.');
  } finally {
    btnEl.innerHTML = '<span class="export-icon">\uD83D\uDCCA</span> Excel';
    btnEl.classList.remove('exporting');
  }
}

/**
 * Handle HTML export — builds a self-contained HTML file from the current view.
 */
async function handleHtmlExport(btnEl) {
  const tab = TABS.find(t => t.id === activeTabId);
  const label = tab ? tab.label : 'export';
  btnEl.innerHTML = '\u23F3 Exporting\u2026';
  btnEl.classList.add('exporting');

  try {
    // Gather the slide HTML
    const appEl = document.getElementById('app');
    const slideHtml = appEl.innerHTML;

    // Fetch CSS files as text
    const commonCss = await fetch('css/common.css').then(r => r.text());
    const viewCssLink = document.getElementById('view-css');
    let viewCss = '';
    if (viewCssLink && viewCssLink.href) {
      viewCss = await fetch(viewCssLink.href).then(r => r.text());
    }

    // Build self-contained HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${label} — AI Tools Comparison</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
${commonCss}
  </style>
  <style>
${viewCss}
  </style>
</head>
<body>
  <div id="app" style="display:flex;flex-direction:column;align-items:center;padding:24px;">
${slideHtml}
  </div>
</body>
</html>`;

    // Download as file
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = label.replace(/[^a-zA-Z0-9]+/g, '_') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[exportHtml] Export failed:', err);
    alert('HTML export failed \u2014 see console for details.');
  } finally {
    btnEl.innerHTML = '<span class="export-icon">\uD83C\uDF10</span> HTML';
    btnEl.classList.remove('exporting');
  }
}

/* ────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Wire up tab click handlers
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.tab));
  });

  // Wire floating PPTX export button (agent tabs only)
  const exportBtn = document.getElementById('export-pptx-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const tab = TABS.find(t => t.id === activeTabId);
      exportSlideToPptx(tab ? tab.label : 'export');
    });
  }

  // Reposition floating PPTX button on scroll / resize (agent tabs)
  window.addEventListener('resize', positionExportButton);
  window.addEventListener('scroll', positionExportButton, { passive: true });

  // Load default view
  navigate('tool-comparison');
});
