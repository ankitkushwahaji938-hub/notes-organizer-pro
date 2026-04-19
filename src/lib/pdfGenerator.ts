import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { NoteBlock, OrganizerOptions } from '../types';

export async function generatePDF(blocks: NoteBlock[], options: OrganizerOptions) {
  const doc = await PDFDocument.create();
  const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fReg = await doc.embedFont(StandardFonts.Helvetica);
  const fObl = await doc.embedFont(StandardFonts.HelveticaOblique);

  // COLORS
  const COLORS = {
    headerBg: rgb(0.05, 0.06, 0.07),
    accent: rgb(0, 0.9, 0.63),
    blue: rgb(0.31, 0.56, 0.97),
    blueBg: rgb(0.94, 0.96, 1),
    yellow: rgb(0.97, 0.79, 0.31),
    yellowBg: rgb(1, 0.99, 0.93),
    text: rgb(0.22, 0.25, 0.35),
    muted: rgb(0.39, 0.45, 0.55),
    footer: rgb(0.58, 0.64, 0.72),
    white: rgb(1, 1, 1),
    border: rgb(0.88, 0.9, 0.94),
  };

  const PW = 595.28, PH = 841.89;
  const ML = 50, MR = 50, CW = PW - ML - MR;
  const HEADER_H = 38, FOOTER_H = 28;
  const CTOP = PH - HEADER_H - 28;
  const CBOT = FOOTER_H + 18;

  const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  let pages: any[] = [];
  let page: any = null;
  let y = 0;

  function pdfSafe(s: string) {
    return String(s).replace(/[^\x20-\xFF]/g, (c: string) => {
      const m: Record<string, string> = { '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '…': '...', '•': '-', '✓': '*', '✗': 'x' };
      return m[c] || '';
    });
  }

  function wrap(text: string, font: any, size: number, maxW: number) {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) <= maxW) cur = test;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function newPage() {
    page = doc.addPage([PW, PH]);
    pages.push(page);
    y = CTOP;
    drawHeader(page);
  }

  function checkY(need: number) {
    if (y - need < CBOT) newPage();
  }

  function drawHeader(pg: any) {
    pg.drawRectangle({ x: 0, y: PH - HEADER_H, width: PW, height: HEADER_H, color: COLORS.headerBg });
    pg.drawRectangle({ x: 0, y: PH - HEADER_H, width: 3, height: HEADER_H, color: COLORS.accent });
    pg.drawText('AnkitStudyPoint', { x: ML, y: PH - HEADER_H + 14, size: 11, font: fBold, color: COLORS.accent });
    
    const info = options.userName ? `${options.userName}  |  ${date}` : date;
    const iW = fReg.widthOfTextAtSize(info, 8);
    pg.drawText(info, { x: PW - MR - iW, y: PH - HEADER_H + 14, size: 8, font: fReg, color: rgb(0.47, 0.55, 0.63) });
  }

  function drawFooters() {
    pages.forEach((pg, i) => {
      pg.drawLine({ start: { x: ML, y: FOOTER_H + 6 }, end: { x: PW - MR, y: FOOTER_H + 6 }, thickness: 0.4, color: COLORS.border });
      pg.drawText('ankitstudypoint.blogspot.com', { x: ML, y: FOOTER_H - 2, size: 8, font: fReg, color: COLORS.footer });
      
      const pgTxt = `Page ${i + 1} of ${pages.length}`;
      const pgW = fBold.widthOfTextAtSize(pgTxt, 8);
      pg.drawText(pgTxt, { x: (PW - pgW) / 2, y: FOOTER_H - 2, size: 8, font: fBold, color: COLORS.blue });
      
      if (options.userName) {
        const uW = fObl.widthOfTextAtSize(options.userName, 8);
        pg.drawText(options.userName, { x: PW - MR - uW, y: FOOTER_H - 2, size: 8, font: fObl, color: COLORS.footer });
      }
    });
  }

  newPage();

  // Title
  const titleLines = wrap(pdfSafe(options.pageTitle || 'Organized Notes'), fBold, 18, CW);
  titleLines.forEach(line => {
    checkY(24);
    page.drawText(line, { x: ML, y, size: 18, font: fBold, color: rgb(0.1, 0.16, 0.4) });
    y -= 22;
  });
  page.drawLine({ start: { x: ML, y: y + 8 }, end: { x: ML + CW, y: y + 8 }, thickness: 1.5, color: COLORS.blue });
  y -= 20;

  // Blocks
  let hIdx = 0;
  for (const b of blocks) {
    if (b.type === 'heading') {
      hIdx++;
      y -= 8;
      checkY(25);
      const text = pdfSafe(`${hIdx}. ${b.text}`);
      page.drawRectangle({ x: ML - 4, y: y - 4, width: CW + 8, height: 18, color: COLORS.blueBg });
      page.drawRectangle({ x: ML - 4, y: y - 4, width: 3.5, height: 18, color: COLORS.blue });
      page.drawText(text, { x: ML + 5, y: y + 1, size: 11.5, font: fBold, color: COLORS.blue });
      y -= 24;
    } else if (b.type === 'subheading') {
      y -= 4;
      checkY(16);
      page.drawRectangle({ x: ML, y: y - 3, width: 2.5, height: 13, color: COLORS.yellow });
      page.drawText(pdfSafe('> ' + b.text), { x: ML + 9, y, size: 10.5, font: fBold, color: rgb(0.71, 0.32, 0.04) });
      y -= 18;
    } else if (b.type === 'point') {
      const bullet = options.numberedList ? `${b.number}.` : '-';
      const lines = wrap(pdfSafe(b.text), fReg, 10, CW - 20);
      const needed = lines.length * 12 + 4;
      checkY(needed);
      page.drawText(bullet, { x: ML + 4, y, size: 10, font: fBold, color: rgb(0, 0.72, 0.5) });
      lines.forEach((line, idx) => {
        page.drawText(line, { x: ML + 18, y: y - idx * 12, size: 10, font: fReg, color: COLORS.text });
      });
      y -= needed + 4;
    } else if (b.type === 'definition') {
      const key = pdfSafe(b.key || '') + ':';
      const kw = fBold.widthOfTextAtSize(key, 10) + 6;
      const vw = CW - kw - 6;
      const vLines = wrap(pdfSafe(b.value || ''), fReg, 10, vw);
      const needed = Math.max(vLines.length * 12, 12) + 8;
      checkY(needed);
      page.drawRectangle({ x: ML - 2, y: y - needed + 10, width: CW + 4, height: needed, color: COLORS.yellowBg });
      page.drawText(key, { x: ML + 3, y, size: 10, font: fBold, color: rgb(0.71, 0.32, 0.04) });
      vLines.forEach((line, idx) => {
        page.drawText(line, { x: ML + kw + 3, y: y - idx * 12, size: 10, font: fReg, color: COLORS.text });
      });
      y -= needed + 6;
    } else {
      const lines = wrap(pdfSafe(b.text), fReg, 9.5, CW);
      const needed = lines.length * 11 + 4;
      checkY(needed);
      lines.forEach((line, idx) => {
        page.drawText(line, { x: ML, y: y - idx * 11, size: 9.5, font: fReg, color: COLORS.muted });
      });
      y -= needed + 4;
    }
  }

  drawFooters();
  return await doc.save();
}
