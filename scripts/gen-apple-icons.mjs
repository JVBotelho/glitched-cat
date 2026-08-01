import { readFileSync, writeFileSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';

const svgContent = readFileSync('public/favicon.svg', 'utf8');

const resvg = new Resvg(svgContent, {
  fitTo: {
    mode: 'width',
    value: 180,
  },
  background: '#0a0a0f',
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

writeFileSync('public/apple-touch-icon.png', pngBuffer);
writeFileSync('public/apple-touch-icon-precomposed.png', pngBuffer);
console.log('Generated apple-touch-icon.png and apple-touch-icon-precomposed.png (180x180)');
