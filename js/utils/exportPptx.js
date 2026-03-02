/**
 * PPTX export — captures the .slide element as a high-res PNG and embeds it
 * in a single-slide PowerPoint file using html2canvas + pptxgenjs (CDN globals).
 */

/**
 * Capture the current .slide element and save it as a PPTX file.
 * @param {string} tabLabel — used for the filename
 */
export async function exportSlideToPptx(tabLabel) {
  const slideEl = document.querySelector('#app .slide');
  if (!slideEl) {
    alert('No slide content to export.');
    return;
  }

  if (!window.html2canvas) {
    alert('html2canvas library not loaded. Please check your internet connection and reload.');
    return;
  }
  if (!window.PptxGenJS) {
    alert('PptxGenJS library not loaded. Please check your internet connection and reload.');
    return;
  }

  const btn = document.getElementById('export-pptx-btn');
  try {
    if (btn) {
      btn.textContent = 'Exporting\u2026';
      btn.classList.add('exporting');
    }

    // Wait for Google Fonts to finish loading before capture
    await document.fonts.ready;

    const canvas = await window.html2canvas(slideEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      ignoreElements: (el) =>
        el.id === 'export-pptx-btn' || el.classList.contains('radar-tooltip'),
      onclone: (_doc, clonedEl) => {
        clonedEl.style.width = '1480px';
        clonedEl.querySelectorAll('.table-wrap').forEach((tw) => {
          tw.style.overflow = 'visible';
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');

    // Standard widescreen width; height proportional to captured aspect ratio
    const SLIDE_W = 13.33;
    const aspect = canvas.height / canvas.width;
    const slideH = SLIDE_W * aspect;

    const pres = new window.PptxGenJS();
    pres.defineLayout({ name: 'CUSTOM', width: SLIDE_W, height: slideH });
    pres.layout = 'CUSTOM';

    const slide = pres.addSlide();
    slide.addImage({ data: imgData, x: 0, y: 0, w: SLIDE_W, h: slideH });

    const safeName = tabLabel.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    await pres.writeFile({ fileName: `${safeName}_${date}.pptx` });
  } catch (err) {
    console.error('[exportPptx] Export failed:', err);
    alert('Export failed — see console for details.');
  } finally {
    if (btn) {
      btn.textContent = 'Export PPTX';
      btn.classList.remove('exporting');
    }
  }
}
