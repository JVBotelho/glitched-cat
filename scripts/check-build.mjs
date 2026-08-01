import { readFileSync } from 'fs';

const html = readFileSync('dist/index.html', 'utf8');
const catMatches = html.match(/viewBox="0 0 1024 1024"/g);
console.log('Cat SVG instances on index:', catMatches ? catMatches.length : 0);
console.log('Has catl1:', html.includes('catl1-'));
console.log('Has catl2:', html.includes('catl2-'));
console.log('Has fill-rule="evenodd":', html.includes('fill-rule="evenodd"'));
console.log('Has aria-hidden="true":', html.includes('aria-hidden="true"'));
console.log('Has Glitched_Cat text:', html.includes('Glitched_Cat'));
