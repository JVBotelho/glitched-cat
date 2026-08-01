import potrace from 'potrace';
import sharp from 'sharp';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const src = 'src/assets/images/cat-source.png';
const tmp = 'scripts/temp-cat-bw.png';
const out = 'src/assets/logo/cat.svg';

async function main() {
  const meta = await sharp(src).metadata();
  const { width, height } = meta;

  await sharp(src)
    .ensureAlpha()
    .extractChannel('alpha')
    .threshold(128)
    .negate({ alpha: false })
    .png()
    .toFile(tmp);

  const svg = await new Promise((resolve, reject) => {
    potrace.trace(tmp, {
      turdSize: 2,
      optCurve: true,
      optTolerance: 0.2,
    }, (err, svg) => {
      if (err) reject(err);
      else resolve(svg);
    });
  });

  let result = svg
    .replace(/fill="[^"]*"/g, 'fill="currentColor"')
    .replace(/stroke="[^"]*"/g, '')
    .replace(/width="[^"]*"/g, '')
    .replace(/height="[^"]*"/g, '')
    .replace('<path ', '<path fill-rule="evenodd" ')
    .replace(/<svg([^>]*)>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`);

  writeFileSync(out, result);

  execSync(`npx svgo --multipass "${out}" -o "${out}"`, { stdio: 'pipe' });
  console.log(`Optimized ${out}`);
}

main().catch(console.error);
