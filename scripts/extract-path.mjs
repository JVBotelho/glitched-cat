import { readFileSync, writeFileSync } from 'fs';
const svg = readFileSync('src/assets/logo/cat.svg', 'utf8');
const dMatch = svg.match(/d="([^"]+)"/);
if (dMatch) {
  writeFileSync('scripts/cat-path-data.txt', dMatch[1]);
  console.log('Path data length:', dMatch[1].length);
}
