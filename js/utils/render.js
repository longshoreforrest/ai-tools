/**
 * Shared rendering helpers for AI Tools Comparison views.
 * All functions return HTML strings — no DOM manipulation.
 */

/**
 * Escape HTML entities to prevent XSS when rendering user-provided data.
 * @param {string} str
 * @returns {string}
 */
export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render score dots (1-4 filled, rest empty, total 4).
 * All filled dots use the SAME colour class matching the score level.
 * Supports half scores (e.g. 3.5 => d4 d4 d4 dhalf doff-style).
 * e.g. score 3 => d3 d3 d3 doff, score 2 => d2 d2 doff doff
 * @param {number} score - 1-4 (may include .5 halves)
 * @returns {string} HTML for the dots container
 */
export function renderScoreDots(score) {
  const full = Math.floor(score);
  const hasHalf = score % 1 !== 0;
  const colorTier = Math.ceil(score);           // 3.5 → use d4 colour
  const dots = [];
  for (let i = 0; i < 4; i++) {
    if (i < full) {
      dots.push(`<div class="dot d${colorTier}"></div>`);
    } else if (i === full && hasHalf) {
      dots.push(`<div class="dot dhalf d${colorTier}"></div>`);
    } else {
      dots.push(`<div class="dot doff"></div>`);
    }
  }
  return `<div class="dots">${dots.join('')}</div>`;
}

/**
 * Render a score label span.
 * @param {number} score - 1-4 (may include .5 halves)
 * @param {string} label - Display text (e.g. "Best fit", "Good", "Partial", "Weak", "N/A")
 * @returns {string}
 */
export function renderScoreLabel(score, label) {
  const tier = Math.ceil(score);
  return `<span class="sl s${tier}">${esc(label)}</span>`;
}

/**
 * Render a pill for the functionality matrix.
 * @param {string} scoreKey - One of "s4", "s3", "s2", "s1", "na"
 * @returns {string}
 */
export function renderPill(scoreKey) {
  const labels = {
    s4: 'Best fit',
    s3: 'Good',
    s2: 'Partial',
    s1: 'Weak',
    na: 'N / A',
  };
  const label = labels[scoreKey] || scoreKey;
  return `<span class="pill ${scoreKey}">${label}</span>`;
}

/**
 * Render a tool column header card (<th> content).
 * Applies category-specific classes (agentic-card, ide-card) alongside build-card.
 * @param {Object} tool - { id, name, subtitle, isBuild, category }
 * @returns {string}
 */
export function renderToolHeader(tool) {
  const cardClasses = ['th-card'];
  const nameClasses = ['th-name'];
  if (tool.isBuild) {
    cardClasses.push('build-card');
    nameClasses.push('build-name');
  }
  if (tool.category) cardClasses.push(`${tool.category}-card`);

  const badge = tool.isBuild ? '<span class="th-badge">BUILD</span>' : '';
  const catTag = tool.category
    ? `<span class="th-cat-tag ${esc(tool.category)}">${esc(tool.category)}</span>`
    : '';

  return `<th>
  <div class="${cardClasses.join(' ')}">
    <div class="${nameClasses.join(' ')}">${esc(tool.name)}${badge}</div>
    <div class="th-sub">${esc(tool.subtitle)}</div>
    ${catTag}
  </div>
</th>`;
}

/**
 * Build CSS class string for a tool's data cell (td).
 * @param {Object} tool
 * @param {string[]} extraClasses
 * @returns {string}
 */
export function toolCellClass(tool, ...extraClasses) {
  const classes = [...extraClasses];
  if (tool.isBuild) classes.push('build-col');
  if (tool.category) classes.push(`cat-${tool.category}`);
  return classes.join(' ');
}

/**
 * Render a chip (barrier, monitor, or value).
 * @param {string} type - "barrier", "monitor", or "value"
 * @param {string} text - Chip display text
 * @returns {string}
 */
export function renderChip(type, text) {
  const prefixes = { barrier: '\u26a0 ', value: '\u2191 ' };
  const prefix = prefixes[type] || '';
  return `<div class="chip ${esc(type)}">${prefix}${esc(text)}</div>`;
}
