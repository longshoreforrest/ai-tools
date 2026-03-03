/**
 * Main application module.
 * Handles tab navigation, data fetching / caching, tool filtering, and view rendering.
 */
import { renderToolComparison } from './views/toolComparison.js';
import { renderFunctionalityMatrix } from './views/functionalityMatrix.js';
import { renderAgentArchitecture } from './views/agentArchitecture.js';
import { renderRadarChart, buildComparisonScores, computeFunctionalityScores, wireRadarInteractions, wireRadarDimensionToggle } from './views/radarChart.js';
import { exportSlideToPptx } from './utils/exportPptx.js';

const TABS = [
  { id: 'tool-comparison',      label: 'AI Tools: Tool Comparison',  cssFile: 'css/tool-comparison.css',      hasToolFilter: true },
  { id: 'functionality-matrix', label: 'AI Tools: Functionality Matrix', cssFile: 'css/functionality-matrix.css', hasToolFilter: true },
  { id: 'sparring-agent',       label: 'Sparring Agent',              cssFile: 'css/agent-slide.css',           hasToolFilter: false },
  { id: 'builder-agent',        label: 'Builder Agent',               cssFile: 'css/agent-slide.css',           hasToolFilter: false },
  { id: 'quality-agent',        label: 'Quality Agent',               cssFile: 'css/agent-slide.css',           hasToolFilter: false },
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

/**
 * Load a JSON file, caching the result for subsequent calls.
 */
async function loadJSON(path) {
  if (!cache[path]) {
    cache[path] = await fetch(path).then(r => {
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
  link.href = cssFile;
}

/* ────────────────────────────────────────────
   TOOL FILTER BAR
   ──────────────────────────────────────────── */

/**
 * Render tool, role, and capability filter chips into the #tool-filter bar.
 */
function renderToolFilter(tools, capabilities) {
  const filterEl = document.getElementById('tool-filter');

  const check = '\u2713 ';

  // Row 1: Tools + Roles
  const toolChipsHtml =
    `<span class="filter-heading">Filter</span>` +
    `<span class="filter-section-label">Tools</span>` +
    tools.map(t => {
      const isActive = selectedTools.has(t.id);
      const typeCls = t.isBuild ? ' build' : (t.category ? ` ${t.category}` : '');
      const label = isActive ? check + t.name : t.name;
      return `<button class="tool-chip${isActive ? ' active' : ''}${typeCls}" data-tool-id="${t.id}">${label}</button>`;
    }).join('');

  const roleChipsHtml =
    `<div class="filter-divider"></div>` +
    `<span class="filter-section-label">Roles</span>` +
    ROLES.map(r => {
      const isActive = selectedRoles.has(r.id);
      const label = isActive ? check + r.label : r.label;
      return `<button class="role-chip${isActive ? ' active' : ''} ${r.id}" data-role-id="${r.id}" title="${r.desc}">${label}</button>`;
    }).join('');

  // Row 2: Capabilities
  const capChipsHtml =
    `<span class="filter-section-label">Capabilities</span>` +
    capabilities.map(c => {
      const isActive = selectedCapabilities.has(c.id);
      const shortLabel = CAP_SHORT[c.id] || c.name;
      const label = isActive ? check + shortLabel : shortLabel;
      return `<button class="cap-chip${isActive ? ' active' : ''} ${c.roleCategory}" data-cap-id="${c.id}" title="${c.name} \u2014 ${c.roleLabel}"><span class="cap-num">${c.number}</span>${label}</button>`;
    }).join('');

  filterEl.innerHTML =
    `<div class="filter-row">${toolChipsHtml}${roleChipsHtml}</div>` +
    `<div class="filter-row">${capChipsHtml}</div>`;

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
  filterEl.querySelectorAll('.cap-chip').forEach(chip => {
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

}

/**
 * Render the Table/Chart view toggle into the #view-toggle bar.
 */
function renderViewToggle(tools, capabilities) {
  const toggleEl = document.getElementById('view-toggle');
  const check = '\u2713 ';

  const buttonsHtml = ['table', 'chart'].map(mode => {
    const isActive = activeViewMode === mode;
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    return `<button class="view-toggle-btn${isActive ? ' active' : ''}" data-view-mode="${mode}">${isActive ? check : ''}${label}</button>`;
  }).join('');

  toggleEl.innerHTML = `<span class="view-toggle-label">View</span>${buttonsHtml}`;

  toggleEl.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeViewMode = btn.dataset.viewMode;
      renderViewToggle(tools, capabilities);
      renderToolFilter(tools, capabilities);
      renderCurrentView();
    });
  });
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

  // Reposition export button after content renders
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

  // Show/hide filter bar, update chips
  updateFilterVisibility();
  if (tab.hasToolFilter) {
    const [tools, capabilities] = await Promise.all([
      loadJSON('data/tools.json'),
      loadJSON('data/capabilities.json'),
    ]);
    renderToolFilter(tools, capabilities);
    renderViewToggle(tools, capabilities);
  }

  // Render the view
  await renderCurrentView();
}

/* ────────────────────────────────────────────
   EXPORT BUTTON POSITIONING
   ──────────────────────────────────────────── */

/**
 * Position the export button at the top-right corner of the .slide element.
 */
function positionExportButton() {
  const btn = document.getElementById('export-pptx-btn');
  const slideEl = document.querySelector('#app .slide');
  if (!btn) return;
  if (!slideEl) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  const rect = slideEl.getBoundingClientRect();
  btn.style.top  = (rect.top + window.scrollY + 8) + 'px';
  btn.style.left = (rect.right + window.scrollX - btn.offsetWidth - 8) + 'px';
}

/* ────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Wire up tab click handlers
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.tab));
  });

  // Wire export button
  const exportBtn = document.getElementById('export-pptx-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const tab = TABS.find(t => t.id === activeTabId);
      exportSlideToPptx(tab ? tab.label : 'export');
    });
  }

  // Reposition export button on scroll / resize
  window.addEventListener('resize', positionExportButton);
  window.addEventListener('scroll', positionExportButton, { passive: true });

  // Load default view
  navigate('tool-comparison');
});
