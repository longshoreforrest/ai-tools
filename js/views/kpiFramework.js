/**
 * KPI Framework view — Capability KPIs + Portfolio metrics.
 * Pure function returning HTML string.
 */
import { esc } from '../utils/render.js';

/* ── Render header ── */
function renderHeader(data) {
  return `
    <div class="kpi-header">
      <div class="kpi-header-text">
        <div class="kpi-title">${esc(data.title)}</div>
        <div class="kpi-subtitle">${esc(data.subtitle)}</div>
      </div>
    </div>
  `;
}

/* ── Render a capability KPI card ── */
function renderCapCard(cap) {
  return `
    <div class="kpi-cap-card ${esc(cap.color)}">
      <div class="kpi-cap-hdr">
        <span class="kpi-cap-icon">${cap.icon || ''}</span>
        <span class="kpi-cap-num">Cap ${esc(cap.cap)}</span>
      </div>
      <div class="kpi-cap-name">${esc(cap.name)}</div>
      <div class="kpi-cap-metric">${esc(cap.kpi)}</div>
      <div class="kpi-cap-baseline">
        <span class="kpi-label">Baseline:</span> ${esc(cap.baseline)}
      </div>
      <div class="kpi-cap-targets">
        <div class="kpi-target">
          <span class="kpi-target-label">30-day</span>
          <span class="kpi-target-value">${esc(cap.target30)}</span>
        </div>
        <div class="kpi-target">
          <span class="kpi-target-label">90-day</span>
          <span class="kpi-target-value">${esc(cap.target90)}</span>
        </div>
      </div>
    </div>
  `;
}

/* ── Render portfolio KPI row ── */
function renderPortfolioItem(item) {
  return `
    <div class="kpi-portfolio-item">
      <div class="kpi-portfolio-icon">${item.icon || ''}</div>
      <div class="kpi-portfolio-content">
        <div class="kpi-portfolio-name">${esc(item.name)}</div>
        <div class="kpi-portfolio-def">${esc(item.definition)}</div>
        <div class="kpi-portfolio-baseline">${esc(item.baseline)}</div>
      </div>
    </div>
  `;
}

/* ── Render RFx integration callout ── */
function renderRfxCallout(rfx) {
  if (!rfx) return '';
  return `
    <div class="kpi-rfx">
      <div class="kpi-rfx-headline">${esc(rfx.headline)}</div>
      <div class="kpi-rfx-text">${esc(rfx.text)}</div>
    </div>
  `;
}

/* ── Main Export ── */
export function renderKpiFramework(data) {
  const capCards = (data.capabilities || []).map(c => renderCapCard(c)).join('');
  const portfolioItems = (data.portfolio || []).map(p => renderPortfolioItem(p)).join('');

  return `
    <div class="kpi-slide">
      ${renderHeader(data)}
      <div class="kpi-body">
        <div class="kpi-section-label">CAPABILITY KPIs</div>
        <div class="kpi-cap-grid">${capCards}</div>
        <div class="kpi-section-label">PORTFOLIO-LEVEL KPIs</div>
        <div class="kpi-portfolio-grid">${portfolioItems}</div>
      </div>
      ${renderRfxCallout(data.rfxIntegration)}
      <div class="kpi-footer">
        <div class="kpi-pagenum">${esc(data.pageNum || '')}</div>
      </div>
    </div>
  `;
}
