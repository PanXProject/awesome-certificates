// Builds data.json for the site from README.md in this repository. Run by the Pages workflow:
//   node site/build.mjs README.md _site/data.json
// No dependencies.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = process.argv[3] || 'data.json';
const SKIP = new Set(['Contents', 'Contributors', 'Other Awesome Lists']);

const md = readFileSync(process.argv[2] || 'README.md', 'utf8');

const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const link = (cell) => {
  const html = cell.match(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if (html) return { url: html[1].trim(), text: clean(html[2]) };
  const mdl = cell.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (mdl) return { url: mdl[2].trim(), text: clean(mdl[1]) };
  return { url: '', text: clean(cell) };
};
const level = (s) => { const t = clean(s).toLowerCase(); return t.startsWith('beg') ? 'Beginner' : t.startsWith('int') ? 'Intermediate' : t.startsWith('pro') || t.startsWith('adv') ? 'Professional' : (clean(s) || ''); };
const hours = (s) => { const m = clean(s).replace(',', '.').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
const reward = (s) => { const c = s.includes('🏆'), b = s.includes('🏅'); return c && b ? 'both' : c ? 'certificate' : b ? 'badge' : ''; };

const items = [];
let topic = '', sub = '';
for (const raw of md.split(/\r?\n/)) {
  const line = raw.trim();
  if (line.startsWith('## ')) { topic = clean(line.slice(3)); sub = ''; continue; }
  if (line.startsWith('### ')) { sub = clean(line.slice(4)); continue; }
  if (!line.startsWith('|') || !topic || SKIP.has(topic)) continue;
  if (/^\|\s*:?-{3,}/.test(line) || /course name/i.test(line)) continue;
  let cells = line.split('|'); if (cells[0].trim() === '') cells.shift(); if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
  if (cells.length < 5) continue;
  const name = link(cells[0]); if (!name.text) continue;
  const rw = link(cells[4]);
  items.push({
    name: name.text, url: name.url, provider: clean(cells[1]), level: level(cells[2]), hours: hours(cells[3]),
    reward: reward(cells[4]), rewardUrl: rw.url || '', topic, sub,
  });
}

const data = { source: 'https://github.com/PanXProject/awesome-certificates', updated: new Date().toISOString().slice(0, 10), count: items.length, items };
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
console.log(`${items.length} courses, ${new Set(items.map(i => i.topic)).size} topics, ${new Set(items.map(i => i.provider)).size} providers`);
