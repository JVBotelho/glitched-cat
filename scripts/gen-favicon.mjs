import { readFileSync, writeFileSync } from 'fs';

const pathData = readFileSync('scripts/cat-path-data.txt', 'utf8').trim();

// Scale 1024px cat to fit within 60x60 area (2px padding in 64x64 canvas)
// scale = 58/1024 ≈ 0.05664 (leaving 3px padding so ears don't touch edge)
const scale = (58 / 1024).toFixed(6);
const offset = 3; // padding from edges

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#0a0a0f"/>
  <g transform="translate(${offset},${offset}) scale(${scale})">
    <g transform="translate(2.5,-1.5)" fill="#00ffff" opacity="0.65">
      <path fill-rule="evenodd" d="${pathData}"/>
    </g>
    <g transform="translate(-2.5,1.5)" fill="#ff00ff" opacity="0.65">
      <path fill-rule="evenodd" d="${pathData}"/>
    </g>
    <path fill-rule="evenodd" d="${pathData}" fill="#ffffff"/>
  </g>
</svg>
`;

writeFileSync('public/favicon.svg', favicon);
console.log('Generated public/favicon.svg');
