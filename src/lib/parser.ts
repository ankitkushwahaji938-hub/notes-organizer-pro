import { NoteBlock, OrganizerOptions } from '../types';

const H_PATTERNS = [
  /^([A-Z][A-Za-z\s\-\/]{2,50})\s*:?\s*$/,
  /^(\d+[\.\)]\s*.{3,60})$/,
  /^[A-Z\s]{4,50}$/,
  /^#{1,3}\s+(.+)$/,
  /^(.{3,50})\s*[-:]\s*$/
];

const S_PATTERNS = [
  /^[a-z][a-zA-Z\s]{2,40}:\s*$/,
  /^.{3,50}:\s*$/
];

const D_PATTERN = /^([A-Za-z][^:]{1,40})\s*:\s*(.{3,})$/;
const B_PATTERNS = [/^[-\u2022*\u25BA\u25B8\u2192\u2713\u2717]\s+/, /^\d+[\.\)]\s+/];

function clean(l: string) {
  return l.trim()
    .replace(/^[-\u2022*\u25BA\u25B8\u2192\u2713\u2717]\s+/, '')
    .replace(/^\d+[\.\)]\s+/, '')
    .replace(/^#+\s*/, '');
}

function isHeading(l: string, options: OrganizerOptions) {
  if (!options.autoHeadings) return false;
  const t = l.trim();
  if (t.length < 3 || t.length > 80 || /[.!?,;]$/.test(t) || t.split(' ').length > 10) return false;
  return H_PATTERNS.some(p => p.test(t));
}

function isSubheading(l: string, options: OrganizerOptions) {
  if (!options.autoHeadings) return false;
  const t = l.trim();
  if (t.length < 3 || t.length > 60) return false;
  return S_PATTERNS.some(p => p.test(t));
}

function isDefinition(l: string, options: OrganizerOptions) {
  return options.keyValues && D_PATTERN.test(l.trim());
}

function hasBullet(l: string) {
  return B_PATTERNS.some(p => p.test(l.trim()));
}

function splitSentences(t: string) {
  return t.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 5);
}

export function parseNotes(raw: string, options: OrganizerOptions): NoteBlock[] {
  const lines = raw.split('\n');
  const blocks: NoteBlock[] = [];
  let pNum = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    if (isHeading(line, options)) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'heading',
        text: clean(line)
      });
      i++;
      // Peek ahead to see if subsequent lines are content for this heading
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) {
          i++;
          break;
        }
        if (isHeading(next, options)) break;
        
        const subBlocks = parseLine(next, options, pNum);
        subBlocks.forEach(b => {
          blocks.push(b);
          if (b.type === 'point') pNum = b.number || pNum;
        });
        i++;
      }
    } else {
      const subBlocks = parseLine(line, options, pNum);
      subBlocks.forEach(b => {
        blocks.push(b);
        if (b.type === 'point') pNum = b.number || pNum;
      });
      i++;
    }
  }

  return blocks;
}

function parseLine(line: string, options: OrganizerOptions, currentPNum: number): NoteBlock[] {
  const t = line.trim();
  const res: NoteBlock[] = [];
  
  if (isDefinition(t, options)) {
    const m = t.match(D_PATTERN);
    if (m) {
      res.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'definition',
        key: m[1].trim(),
        value: m[2].trim(),
        text: t
      });
      return res;
    }
  }

  if (hasBullet(t) && options.bulletPoints) {
    res.push({
      id: Math.random().toString(36).substr(2, 9),
      type: 'point',
      text: clean(t),
      number: currentPNum + 1
    });
    return res;
  }

  if (isSubheading(t, options)) {
    res.push({
      id: Math.random().toString(36).substr(2, 9),
      type: 'subheading',
      text: clean(t)
    });
    return res;
  }

  // Splitting long paragraphs into bullets if enabled
  if (options.bulletPoints && t.length > 100 && t.split(' ').length > 15) {
    const ss = splitSentences(t);
    if (ss.length > 1) {
      let tempPNum = currentPNum;
      ss.forEach(s => {
        tempPNum++;
        res.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'point',
          text: s,
          number: tempPNum
        });
      });
      return res;
    }
  }

  // Fallback to plain or auto-point
  if (options.bulletPoints && t.length > 5 && t.split(' ').length <= 15) {
     res.push({
       id: Math.random().toString(36).substr(2, 9),
       type: 'point',
       text: clean(t),
       number: currentPNum + 1
     });
     return res;
  }

  res.push({
    id: Math.random().toString(36).substr(2, 9),
    type: 'plain',
    text: t
  });
  return res;
}
