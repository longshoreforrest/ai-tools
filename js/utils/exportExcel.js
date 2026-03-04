/**
 * Excel export using ExcelJS — produces styled .xlsx files from JSON data.
 *
 * Tool Comparison layout mirrors the HTML card structure:
 *   Row A per capability — score dots + label  (tinted cell)
 *   Row B per capability — action bullet list   (white cell)
 *   Row C per capability — chip / note          (only when chips exist)
 */

/* ── Score colour palettes (ARGB) ── */
const SCORE_FILL = {
  4:   'FFD6F0EB', 3.5: 'FFDDEEDD', 3: 'FFE3F0DA', 2: 'FFFFF3D6', 1: 'FFFDE8E3',
};
const SCORE_TEXT = {
  4:   'FF1A6B5A', 3.5: 'FF3A7A4A', 3: 'FF3A7A3A', 2: 'FF8A6A20', 1: 'FF9A3A20',
};
const FIT_FILL  = { s4: 'FFD6F0EB', s3: 'FFE3F0DA', s2: 'FFFFF3D6', s1: 'FFFDE8E3', na: 'FFF0EDEA' };
const FIT_TEXT  = { s4: 'FF1A6B5A', s3: 'FF3A7A3A', s2: 'FF8A6A20', s1: 'FF9A3A20', na: 'FF7A8A99' };
const FIT_LABELS = { s4: 'Best fit', s3: 'Good', s2: 'Partial', s1: 'Weak', na: 'N/A' };

/* ── Unicode score dots ── */
function scoreDots(score) {
  const full = Math.floor(score);
  const half = score % 1 >= 0.5 ? 1 : 0;
  const empty = 4 - full - half;
  return '\u25CF'.repeat(full) + '\u25D1'.repeat(half) + '\u25CB'.repeat(empty);
}

/* ── Helpers ── */
const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thinBorder = (argb) => {
  const side = { style: 'thin', color: { argb } };
  return { top: side, bottom: side, left: side, right: side };
};
const LIGHT_BORDER = thinBorder('FFE0E0E0');
const FONT = (overrides = {}) => ({ name: 'Calibri', size: 10, ...overrides });

function applyStyle(cell, { font, fill, alignment, border } = {}) {
  if (font) cell.font = font;
  if (fill) cell.fill = fill;
  if (alignment) cell.alignment = alignment;
  if (border) cell.border = border;
}

/** Trigger browser download from a buffer. */
function downloadBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════
   TOOL COMPARISON EXPORT
   ════════════════════════════════════════════ */

export async function exportToolComparisonToExcel(tools, capabilities, comparison, tabLabel) {
  if (!window.ExcelJS) {
    alert('ExcelJS library not loaded. Please check your internet connection and reload.');
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tool Comparison');
  const toolCount = tools.length;
  const totalCols = 1 + toolCount;

  // Column widths
  ws.columns = [
    { width: 36 },
    ...tools.map(() => ({ width: 34 })),
  ];

  /* ── Row 1: Tool names ── */
  const hdrRow = ws.addRow(['', ...tools.map(t => t.name)]);
  hdrRow.height = 30;
  for (let c = 1; c <= totalCols; c++) {
    applyStyle(hdrRow.getCell(c), {
      font:  FONT({ bold: true, size: 11, color: { argb: 'FFFFFFFF' } }),
      fill:  solidFill('FF1C2B3A'),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: thinBorder('FF1C2B3A'),
    });
  }

  /* ── Row 2: Subtitles ── */
  const subRow = ws.addRow(['', ...tools.map(t => t.subtitle || '')]);
  subRow.height = 20;
  for (let c = 2; c <= totalCols; c++) {
    applyStyle(subRow.getCell(c), {
      font:  FONT({ size: 9, italic: true, color: { argb: 'FF7A8A99' } }),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: LIGHT_BORDER,
    });
  }

  /* ── Group by role category ── */
  const bizCaps  = capabilities.filter(c => c.roleCategory === 'biz');
  const techCaps = capabilities.filter(c => c.roleCategory === 'tech');
  const groups = [];
  if (bizCaps.length)  groups.push({ label: 'Non-technical roles \u2014 Business Analysts \u00b7 PMs \u00b7 Product Owners \u00b7 Doc Owners', caps: bizCaps,  bg: 'FFF0EAE1', fg: 'FF7A5C3A' });
  if (techCaps.length) groups.push({ label: 'Technical roles \u2014 Architects \u00b7 Developers \u00b7 QA Engineers',                        caps: techCaps, bg: 'FFE6EDF5', fg: 'FF2A4A6A' });

  for (const group of groups) {
    /* ── Divider row ── */
    const divRow = ws.addRow([group.label]);
    divRow.height = 22;
    ws.mergeCells(divRow.number, 1, divRow.number, totalCols);
    for (let c = 1; c <= totalCols; c++) {
      applyStyle(divRow.getCell(c), {
        font: FONT({ bold: true, size: 10, color: { argb: group.fg } }),
        fill: solidFill(group.bg),
        alignment: { vertical: 'middle' },
        border: thinBorder(group.bg),
      });
    }

    for (const cap of group.caps) {
      const capData = comparison[cap.id] || {};
      const capBg = cap.roleCategory === 'biz' ? 'FFFAF6F0' : 'FFF2F5FA';

      /* ── ROW A: Score dots + label ── */
      const scoreRow = ws.addRow([
        `${cap.number}  ${cap.name}`,
        ...tools.map(t => {
          const e = capData[t.id];
          return e ? `${scoreDots(e.score)}  ${e.label}` : '';
        }),
      ]);
      scoreRow.height = 26;

      // Capability name cell
      applyStyle(scoreRow.getCell(1), {
        font:  FONT({ bold: true, size: 10 }),
        fill:  solidFill(capBg),
        alignment: { vertical: 'middle', wrapText: true },
        border: LIGHT_BORDER,
      });

      // Score cells
      tools.forEach((t, ti) => {
        const entry = capData[t.id];
        if (!entry) return;
        const key = SCORE_FILL[entry.score] ? entry.score : Math.round(entry.score);
        applyStyle(scoreRow.getCell(2 + ti), {
          font:  FONT({ bold: true, size: 11, color: { argb: SCORE_TEXT[key] || 'FF1C2B3A' } }),
          fill:  solidFill(SCORE_FILL[key] || 'FFF5F5F5'),
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: LIGHT_BORDER,
        });
      });

      /* ── ROW B: Actions ── */
      const maxActions = tools.reduce((mx, t) => {
        const e = capData[t.id];
        return Math.max(mx, e && e.actions ? e.actions.length : 0);
      }, 0);

      const actRow = ws.addRow([
        cap.roleLabel,
        ...tools.map(t => {
          const e = capData[t.id];
          if (!e || !e.actions || !e.actions.length) return '';
          return e.actions.map(a => '\u2022 ' + a).join('\n');
        }),
      ]);
      actRow.height = Math.max(30, maxActions * 14.5);

      // Role label cell
      applyStyle(actRow.getCell(1), {
        font:  FONT({ size: 9, color: { argb: 'FF7A8A99' } }),
        fill:  solidFill(capBg),
        alignment: { vertical: 'top', wrapText: true },
        border: LIGHT_BORDER,
      });

      // Action cells
      for (let c = 2; c <= totalCols; c++) {
        applyStyle(actRow.getCell(c), {
          font:  FONT({ size: 9, color: { argb: 'FF4E6070' } }),
          fill:  solidFill('FFFFFFFF'),
          alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
          border: LIGHT_BORDER,
        });
      }

      /* ── ROW C: Chips (only if any tool has a chip) ── */
      const hasAnyChip = tools.some(t => {
        const e = capData[t.id];
        return e && e.chip;
      });
      if (hasAnyChip) {
        const chipRow = ws.addRow([
          '',
          ...tools.map(t => {
            const e = capData[t.id];
            if (!e || !e.chip) return '';
            const pfx = e.chip.type === 'barrier' ? '\u26A0 ' :
                        e.chip.type === 'value'   ? '\u2191 ' :
                        e.chip.type === 'monitor'  ? '\u25C9 ' : '';
            return pfx + e.chip.text;
          }),
        ]);
        chipRow.height = 22;

        applyStyle(chipRow.getCell(1), {
          fill: solidFill(capBg),
          border: LIGHT_BORDER,
        });

        tools.forEach((t, ti) => {
          const e = capData[t.id];
          const ct = e && e.chip ? e.chip.type : null;
          const bg = ct === 'value' ? 'FFFFFAEF' : ct === 'monitor' ? 'FFF5F5FF' : ct === 'barrier' ? 'FFFFF5F0' : 'FFFFFFFF';
          const fg = ct === 'value' ? 'FF8A6A20' : ct === 'monitor' ? 'FF5A5A8A' : ct === 'barrier' ? 'FF9A5040' : 'FFAAAAAA';
          applyStyle(chipRow.getCell(2 + ti), {
            font:  FONT({ size: 8, italic: true, color: { argb: fg } }),
            fill:  solidFill(bg),
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            border: LIGHT_BORDER,
          });
        });
      }
    }
  }

  /* ── Download ── */
  const safeName = tabLabel.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer, `${safeName}_${date}.xlsx`);
}

/* ════════════════════════════════════════════
   FUNCTIONALITY MATRIX EXPORT
   ════════════════════════════════════════════ */

export async function exportFunctionalityMatrixToExcel(tools, functionality, tabLabel) {
  if (!window.ExcelJS) {
    alert('ExcelJS library not loaded. Please check your internet connection and reload.');
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Functionality Matrix');
  const toolCount = tools.length;
  const totalCols = 1 + toolCount;

  ws.columns = [
    { width: 52 },
    ...tools.map(() => ({ width: 18 })),
  ];

  /* ── Header + subtitle ── */
  const hdrRow = ws.addRow(['Function', ...tools.map(t => t.name)]);
  hdrRow.height = 28;
  for (let c = 1; c <= totalCols; c++) {
    applyStyle(hdrRow.getCell(c), {
      font:  FONT({ bold: true, size: 11, color: { argb: 'FFFFFFFF' } }),
      fill:  solidFill('FF1C2B3A'),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: thinBorder('FF1C2B3A'),
    });
  }

  const subRow = ws.addRow(['', ...tools.map(t => t.subtitle || '')]);
  subRow.height = 20;
  for (let c = 2; c <= totalCols; c++) {
    applyStyle(subRow.getCell(c), {
      font:  FONT({ size: 9, italic: true, color: { argb: 'FF7A8A99' } }),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: LIGHT_BORDER,
    });
  }

  for (const group of functionality) {
    /* ── Capability header row ── */
    const capRow = ws.addRow([`${group.number}  ${group.name}  (${group.roleLabel})`]);
    capRow.height = 24;
    ws.mergeCells(capRow.number, 1, capRow.number, totalCols);
    for (let c = 1; c <= totalCols; c++) {
      applyStyle(capRow.getCell(c), {
        font:  FONT({ bold: true, size: 10 }),
        fill:  solidFill('FFEBF0F5'),
        alignment: { vertical: 'middle' },
        border: thinBorder('FFD0D8E0'),
      });
    }

    /* ── Function rows ── */
    for (const fn of (group.functions || [])) {
      const dataRow = ws.addRow([
        `${fn.id}  ${fn.name}`,
        ...tools.map(t => {
          const sk = (fn.scores && fn.scores[t.id]) || '';
          return FIT_LABELS[sk] || sk;
        }),
      ]);
      dataRow.height = 24;

      applyStyle(dataRow.getCell(1), {
        font:  FONT({ size: 10 }),
        alignment: { vertical: 'middle', wrapText: true },
        border: LIGHT_BORDER,
      });

      tools.forEach((t, ti) => {
        const sk = (fn.scores && fn.scores[t.id]) || '';
        if (sk) {
          applyStyle(dataRow.getCell(2 + ti), {
            font:  FONT({ bold: true, size: 10, color: { argb: FIT_TEXT[sk] || 'FF7A8A99' } }),
            fill:  solidFill(FIT_FILL[sk] || 'FFF5F5F5'),
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: LIGHT_BORDER,
          });
        }
      });
    }
  }

  const safeName = tabLabel.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer, `${safeName}_${date}.xlsx`);
}

/* ════════════════════════════════════════════
   COMPLIANCE & COSTS EXPORT
   ════════════════════════════════════════════ */

export async function exportComplianceCostsToExcel(tools, dimensions, compliance, links, tabLabel) {
  if (!window.ExcelJS) {
    alert('ExcelJS library not loaded. Please check your internet connection and reload.');
    return;
  }

  const wb = new ExcelJS.Workbook();
  const toolCount = tools.length;
  const totalCols = 1 + toolCount;

  /* ── Sheet 1: Compliance Scores ── */
  const ws = wb.addWorksheet('Compliance Scores');
  ws.columns = [
    { width: 36 },
    ...tools.map(() => ({ width: 34 })),
  ];

  const hdrRow = ws.addRow(['', ...tools.map(t => t.name)]);
  hdrRow.height = 30;
  for (let c = 1; c <= totalCols; c++) {
    applyStyle(hdrRow.getCell(c), {
      font:  FONT({ bold: true, size: 11, color: { argb: 'FFFFFFFF' } }),
      fill:  solidFill('FF1C2B3A'),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: thinBorder('FF1C2B3A'),
    });
  }

  const subRow = ws.addRow(['', ...tools.map(t => t.subtitle || '')]);
  subRow.height = 20;
  for (let c = 2; c <= totalCols; c++) {
    applyStyle(subRow.getCell(c), {
      font:  FONT({ size: 9, italic: true, color: { argb: 'FF7A8A99' } }),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: LIGHT_BORDER,
    });
  }

  for (const dim of dimensions) {
    const dimData = compliance[dim.id] || {};

    /* ── ROW A: Score dots + label ── */
    const scoreRow = ws.addRow([
      `${dim.number}  ${dim.name}`,
      ...tools.map(t => {
        const e = dimData[t.id];
        return e ? `${scoreDots(e.score)}  ${e.label}` : '';
      }),
    ]);
    scoreRow.height = 26;

    applyStyle(scoreRow.getCell(1), {
      font:  FONT({ bold: true, size: 10 }),
      fill:  solidFill('FFF2F5FA'),
      alignment: { vertical: 'middle', wrapText: true },
      border: LIGHT_BORDER,
    });

    tools.forEach((t, ti) => {
      const entry = dimData[t.id];
      if (!entry) return;
      const key = SCORE_FILL[entry.score] ? entry.score : Math.round(entry.score);
      applyStyle(scoreRow.getCell(2 + ti), {
        font:  FONT({ bold: true, size: 11, color: { argb: SCORE_TEXT[key] || 'FF1C2B3A' } }),
        fill:  solidFill(SCORE_FILL[key] || 'FFF5F5F5'),
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: LIGHT_BORDER,
      });
    });

    /* ── ROW B: Actions ── */
    const maxActions = tools.reduce((mx, t) => {
      const e = dimData[t.id];
      return Math.max(mx, e && e.actions ? e.actions.length : 0);
    }, 0);

    const actRow = ws.addRow([
      dim.description,
      ...tools.map(t => {
        const e = dimData[t.id];
        if (!e || !e.actions || !e.actions.length) return '';
        return e.actions.map(a => '\u2022 ' + a).join('\n');
      }),
    ]);
    actRow.height = Math.max(30, maxActions * 14.5);

    applyStyle(actRow.getCell(1), {
      font:  FONT({ size: 9, color: { argb: 'FF7A8A99' } }),
      fill:  solidFill('FFF2F5FA'),
      alignment: { vertical: 'top', wrapText: true },
      border: LIGHT_BORDER,
    });

    for (let c = 2; c <= totalCols; c++) {
      applyStyle(actRow.getCell(c), {
        font:  FONT({ size: 9, color: { argb: 'FF4E6070' } }),
        fill:  solidFill('FFFFFFFF'),
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
        border: LIGHT_BORDER,
      });
    }

    /* ── ROW C: Chips ── */
    const hasAnyChip = tools.some(t => {
      const e = dimData[t.id];
      return e && e.chip;
    });
    if (hasAnyChip) {
      const chipRow = ws.addRow([
        '',
        ...tools.map(t => {
          const e = dimData[t.id];
          if (!e || !e.chip) return '';
          const pfx = e.chip.type === 'barrier' ? '\u26A0 ' :
                      e.chip.type === 'value'   ? '\u2191 ' :
                      e.chip.type === 'monitor'  ? '\u25C9 ' : '';
          return pfx + e.chip.text;
        }),
      ]);
      chipRow.height = 22;

      applyStyle(chipRow.getCell(1), {
        fill: solidFill('FFF2F5FA'),
        border: LIGHT_BORDER,
      });

      tools.forEach((t, ti) => {
        const e = dimData[t.id];
        const ct = e && e.chip ? e.chip.type : null;
        const bg = ct === 'value' ? 'FFFFFAEF' : ct === 'monitor' ? 'FFF5F5FF' : ct === 'barrier' ? 'FFFFF5F0' : 'FFFFFFFF';
        const fg = ct === 'value' ? 'FF8A6A20' : ct === 'monitor' ? 'FF5A5A8A' : ct === 'barrier' ? 'FF9A5040' : 'FFAAAAAA';
        applyStyle(chipRow.getCell(2 + ti), {
          font:  FONT({ size: 8, italic: true, color: { argb: fg } }),
          fill:  solidFill(bg),
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: LIGHT_BORDER,
        });
      });
    }
  }

  /* ── Documentation row (vendor links) ── */
  const docDivRow = ws.addRow(['REF  Documentation']);
  docDivRow.height = 24;
  applyStyle(docDivRow.getCell(1), {
    font:  FONT({ bold: true, size: 10 }),
    fill:  solidFill('FFF2F5FA'),
    alignment: { vertical: 'middle', wrapText: true },
    border: LIGHT_BORDER,
  });

  // Build per-tool link text with category headers and clickable URLs
  tools.forEach((t, ti) => {
    const toolLinks = links[t.id] || [];
    if (!toolLinks.length) return;

    // Group by category
    const groups = {};
    for (const link of toolLinks) {
      if (!groups[link.category]) groups[link.category] = [];
      groups[link.category].push(link);
    }

    const text = Object.entries(groups).map(([cat, items]) => {
      return cat.toUpperCase() + '\n' + items.map(l => l.label + '\n' + l.url).join('\n');
    }).join('\n\n');

    const cell = docDivRow.getCell(2 + ti);
    cell.value = text;
    applyStyle(cell, {
      font:  FONT({ size: 8, color: { argb: 'FF2B7F6E' } }),
      fill:  solidFill('FFFFFFFF'),
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: LIGHT_BORDER,
    });
  });

  // Calculate row height based on max link count
  const maxLinks = tools.reduce((mx, t) => {
    const tl = links[t.id] || [];
    const categories = new Set(tl.map(l => l.category));
    return Math.max(mx, tl.length * 2 + categories.size * 2);
  }, 0);
  docDivRow.height = Math.max(40, maxLinks * 10);

  /* ── Download ── */
  const safeName2 = tabLabel.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const date2 = new Date().toISOString().slice(0, 10);
  const buffer2 = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer2, `${safeName2}_${date2}.xlsx`);
}
