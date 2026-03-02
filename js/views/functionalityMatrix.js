/**
 * Functionality Matrix view renderer.
 * Produces HTML matching slide4b_functionality_matrix.html.
 */
import { renderPill, renderToolHeader, toolCellClass, esc } from '../utils/render.js';

/**
 * Render the functionality matrix.
 */
export function renderFunctionalityMatrix(tools, functionality) {
  const colCount = tools.length + 1;

  // -- colgroup
  const colGroupCols = `<col class="c-func" />\n` + tools.map(() => `<col class="c-tool" />`).join('\n');

  // -- thead
  const thCells = tools.map(t => renderToolHeader(t)).join('\n');

  // -- tbody
  let tbodyHtml = '';

  functionality.forEach((group, groupIndex) => {
    tbodyHtml += `<tr class="cap-hdr-row">
  <td colspan="${colCount}" class="cap-hdr-td">
    <div class="cap-hdr ${esc(group.roleCategory)}">
      <span class="cap-hdr-num ${esc(group.roleCategory)}">${esc(group.number || group.capNumber)}</span>
      <span class="cap-hdr-name">${esc(group.name || group.capName)}</span>
      <span class="cap-hdr-role ${esc(group.roleCategory)}">${esc(group.roleLabel)}</span>
    </div>
  </td>
</tr>\n`;

    const funcs = group.functions || [];
    funcs.forEach((fn, fnIndex) => {
      const parity = fnIndex % 2 === 0 ? 'odd' : 'even';
      const isLast = fnIndex === funcs.length - 1;
      const rowClasses = ['func-row', parity];
      if (isLast) rowClasses.push('last');

      const secondaryHtml = fn.secondary
        ? `<span class="secondary">${esc(fn.secondary)}</span>`
        : '';

      const funcCell = `<td class="func-td">
  <div class="func-label">
    <span class="func-id">${esc(fn.id)}</span>
    <span class="func-text">${esc(fn.name)}${secondaryHtml}</span>
  </div>
</td>`;

      const scoreCells = tools.map(t => {
        const scoreKey = (fn.scores && fn.scores[t.id]) || 'na';
        return `<td class="${toolCellClass(t, 'fit-td')}">${renderPill(scoreKey)}</td>`;
      }).join('\n');

      tbodyHtml += `<tr class="${rowClasses.join(' ')}">\n${funcCell}\n${scoreCells}\n</tr>\n`;
    });

    if (groupIndex < functionality.length - 1) {
      tbodyHtml += `<tr class="group-spacer"><td colspan="${colCount}"></td></tr>\n`;
    }
  });

  // -- legend
  const legendItems = [
    { key: 's4', label: 'Best fit' },
    { key: 's3', label: 'Good' },
    { key: 's2', label: 'Partial' },
    { key: 's1', label: 'Weak' },
    { key: 'na', label: 'N / A' },
  ];
  const legendHtml = legendItems.map(
    item => `<div class="leg-item"><span class="leg-pill ${item.key}">${item.label}</span></div>`,
  ).join('\n');

  // -- footer
  const footerNotesHtml = `<div class="ftr-note">
  <strong>Caps 01\u201303:</strong> Non-technical functionalities cluster strongly around Cowork and Custom-Build \u2014 CLI and IDE surfaces don\u2019t reach these roles regardless of functionality.
</div>
<div class="ftr-div"></div>
<div class="ftr-note">
  <strong>Cap 04:</strong> Claude Code dominates technical sparring functionalities. Custom-Build adds enterprise-context pre-loading that generic tools cannot match without configuration.
</div>
<div class="ftr-div"></div>
<div class="ftr-note">
  <strong>Caps 05\u201306:</strong> The three agentic tools (Claude Code, VS Code/Cursor/Windsurf, Codex App) split execution coverage. Quality reporting and monitoring shifts toward Custom-Build as stakeholder layer.
</div>`;

  return `<div class="slide">
  <div class="hdr">
    <div class="hdr-left">
      <div class="hdr-title">AI Tool Fit \u2014 Functionality Coverage Matrix</div>
      <div class="hdr-sub">Per-functionality fit across all six SDLC capabilities</div>
    </div>
    <div class="hdr-right">
      <div class="legend">
        ${legendHtml}
      </div>
    </div>
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
        ${tbodyHtml}
      </tbody>
    </table>
  </div>

  <div class="ftr">
    <div class="ftr-notes">
      ${footerNotesHtml}
    </div>
    <div class="ftr-num">04b / 05</div>
  </div>
</div>`;
}
