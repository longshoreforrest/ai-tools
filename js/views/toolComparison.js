/**
 * Tool Comparison view renderer.
 * Produces HTML matching slide4_tool_comparison_2.html.
 */
import { renderScoreDots, renderScoreLabel, renderChip, renderToolHeader, toolCellClass, esc } from '../utils/render.js';

/**
 * Determine which tool indices hold the best (highest) score for a capability.
 * Returns a Set of tool ids that share the maximum score.
 */
function bestToolIds(capEntry, tools) {
  let max = 0;
  for (const tool of tools) {
    const entry = capEntry[tool.id];
    if (entry && entry.score > max) max = entry.score;
  }
  const ids = new Set();
  for (const tool of tools) {
    const entry = capEntry[tool.id];
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
 * Render the section divider row.
 */
function renderDividerRow(labelClass, text, colCount) {
  return `<tr class="div-row">
  <td colspan="${colCount}" class="div-row-td">
    <div class="section-div">
      <div class="section-div-label ${labelClass}">${esc(text)}</div>
      <div class="section-div-line"></div>
    </div>
  </td>
</tr>`;
}

/**
 * Render the tool comparison table.
 */
export function renderToolComparison(tools, capabilities, comparison) {
  const colCount = tools.length + 1;

  // -- thead
  const thCells = tools.map(t => renderToolHeader(t)).join('\n');

  // -- colgroup
  const colGroupCols = `<col class="c-cap" />\n` + tools.map(() => `<col class="c-tool" />`).join('\n');

  // -- tbody rows
  let tbodyRows = '';
  let prevCategory = null;

  for (const cap of capabilities) {
    if (cap.roleCategory !== prevCategory) {
      if (cap.roleCategory === 'biz') {
        tbodyRows += renderDividerRow(
          'biz',
          'Non-technical roles \u2014 Business Analysts \u00b7 PMs \u00b7 Product Owners \u00b7 Doc Owners',
          colCount,
        );
      } else if (cap.roleCategory === 'tech') {
        tbodyRows += renderDividerRow(
          'tech',
          'Technical roles \u2014 Architects \u00b7 Developers \u00b7 QA Engineers',
          colCount,
        );
      }
      prevCategory = cap.roleCategory;
    }

    const capEntry = comparison[cap.id] || {};
    const best = bestToolIds(capEntry, tools);

    const capCellHtml = `<td>
  <div class="cap-cell">
    <div class="role-stripe ${esc(cap.roleCategory)}"></div>
    <div class="cap-inner">
      <div class="cap-num ${esc(cap.roleCategory)}">${esc(cap.number)}</div>
      <div class="cap-name">${esc(cap.name)}</div>
      <div class="cap-role ${esc(cap.roleCategory)}">${esc(cap.roleLabel)}</div>
    </div>
  </div>
</td>`;

    const scoreCells = tools.map(t => {
      const entry = capEntry[t.id];
      if (!entry) return `<td class="${toolCellClass(t, 'score-td')}"><div class="si"></div></td>`;
      return renderScoreCell(entry, t, best.has(t.id));
    }).join('\n');

    tbodyRows += `<tr>\n${capCellHtml}\n${scoreCells}\n</tr>\n`;
  }

  // -- footer
  const footerNotesHtml = `<div class="ftr-note">
  <strong>Caps 01\u201303:</strong> Claude Code\u2019s IDE extension doesn\u2019t change the non-technical access gap \u2014 BAs, PMs and doc owners don\u2019t work in IDEs or terminals. <strong>Cowork</strong> and custom-built apps remain the only direct options.
</div>
<div class="ftr-div"></div>
<div class="ftr-note">
  <strong>Codex App</strong> is a technical developer desktop \u2014 strong for parallel agent management in caps 05\u201306. Not applicable to non-technical roles.
</div>
<div class="ftr-div"></div>
<div class="ftr-note">
  <strong>Custom build</strong> justification: minimal AI-native investment, maximum tailoring \u2014 embedded enterprise context, structured workflows, and role-specific UX no off-the-shelf tool provides.
</div>`;

  return `<div class="slide">
  <div class="hdr">
    <div class="hdr-title">AI Tool Fit \u2014 Six SDLC Capabilities</div>
    <div style="font-size: 10px; color: var(--grey)">UX-aware fit per tool and user role</div>
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
      ${footerNotesHtml}
    </div>
    <div class="ftr-num">04 / 04</div>
  </div>
</div>`;
}
