/**
 * Compliance & Costs view renderer.
 * Produces HTML for vendor links + score table.
 */
import { renderScoreDots, renderScoreLabel, renderChip, renderToolHeader, toolCellClass, esc } from '../utils/render.js';

/**
 * Determine which tool IDs hold the best (highest) score for a dimension.
 */
function bestToolIds(dimEntry, tools) {
  let max = 0;
  for (const tool of tools) {
    const entry = dimEntry[tool.id];
    if (entry && entry.score > max) max = entry.score;
  }
  const ids = new Set();
  for (const tool of tools) {
    const entry = dimEntry[tool.id];
    if (entry && entry.score === max) ids.add(tool.id);
  }
  return ids;
}

/**
 * Render a single score cell (td).
 */
function renderScoreCell(entry, tool, isBest) {
  const cls = toolCellClass(tool, 'score-td') + (isBest ? ' best' : '');

  let actionsHtml = '';
  if (entry.actions && entry.actions.length > 0) {
    actionsHtml = `<ul class="acts">${entry.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`;
  }

  let chipHtml = '';
  if (entry.chip) {
    chipHtml = renderChip(entry.chip.type, entry.chip.text);
  }

  return `<td class="${cls}">
  <div class="si">
    <div class="sr">
      ${renderScoreDots(entry.score)}
      ${renderScoreLabel(entry.score, entry.label)}
    </div>
    ${actionsHtml}
    ${chipHtml}
  </div>
</td>`;
}

/**
 * Render the "Documentation" table row with vendor links per tool.
 */
function renderLinksRow(tools, links) {
  const dimCellHtml = `<td>
  <div class="dim-cell">
    <div class="dim-inner">
      <div class="dim-num">REF</div>
      <div class="dim-name">Documentation</div>
      <div class="dim-desc">Vendor security, privacy, trust &amp; pricing pages</div>
    </div>
  </div>
</td>`;

  const linkCells = tools.map(t => {
    const toolLinks = links[t.id] || [];
    const cls = toolCellClass(t, 'score-td');

    if (toolLinks.length === 0) return `<td class="${cls}"><div class="si"></div></td>`;

    // Group by category
    const groups = {};
    for (const link of toolLinks) {
      if (!groups[link.category]) groups[link.category] = [];
      groups[link.category].push(link);
    }

    const groupsHtml = Object.entries(groups).map(([cat, items]) => {
      const itemsHtml = items.map(item =>
        `<a class="link-item" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.label)}</a>`
      ).join('');
      return `<div class="link-group"><div class="link-category">${esc(cat)}</div>${itemsHtml}</div>`;
    }).join('');

    return `<td class="${cls}"><div class="si link-cell">${groupsHtml}</div></td>`;
  }).join('\n');

  return `<tr>\n${dimCellHtml}\n${linkCells}\n</tr>`;
}

/**
 * Render the compliance & costs view.
 */
export function renderComplianceCosts(tools, dimensions, compliance, links) {
  const colCount = tools.length + 1;

  // -- thead
  const thCells = tools.map(t => renderToolHeader(t)).join('\n');

  // -- colgroup
  const colGroupCols = `<col class="c-dim" />\n` + tools.map(() => `<col class="c-tool" />`).join('\n');

  // -- tbody rows
  let tbodyRows = '';

  for (const dim of dimensions) {
    const dimEntry = compliance[dim.id] || {};
    const best = bestToolIds(dimEntry, tools);

    const dimCellHtml = `<td>
  <div class="dim-cell">
    <div class="dim-inner">
      <div class="dim-num">${esc(dim.number)}</div>
      <div class="dim-name">${esc(dim.name)}</div>
      <div class="dim-desc">${esc(dim.description)}</div>
    </div>
  </div>
</td>`;

    const scoreCells = tools.map(t => {
      const entry = dimEntry[t.id];
      if (!entry) return `<td class="${toolCellClass(t, 'score-td')}"><div class="si"></div></td>`;
      return renderScoreCell(entry, t, best.has(t.id));
    }).join('\n');

    tbodyRows += `<tr>\n${dimCellHtml}\n${scoreCells}\n</tr>\n`;
  }

  // -- Documentation links row
  tbodyRows += renderLinksRow(tools, links);

  return `<div class="slide">
  <div class="hdr">
    <div class="hdr-title">Compliance & Costs \u2014 Enterprise Readiness Assessment</div>
    <div style="font-size: 10px; color: var(--grey)">Security, privacy, enterprise features, and cost comparison across tools</div>
  </div>

  <div class="table-wrap">
    <table>
      <colgroup>
        ${colGroupCols}
      </colgroup>
      <thead>
        <tr>
          <th></th>
          ${thCells}
        </tr>
      </thead>
      <tbody>
        ${tbodyRows}
      </tbody>
    </table>
  </div>

  <div class="ftr">
    <div class="ftr-notes">
      <div class="ftr-note">
        <strong>Scores reflect</strong> publicly available certifications, documentation, and pricing pages as of 2025. Verify current status via the vendor links above.
      </div>
    </div>
    <div class="ftr-num">C1\u2013C4</div>
  </div>
</div>`;
}
