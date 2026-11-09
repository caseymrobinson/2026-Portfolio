// Downloads the project images referenced in src/content from my old Wix
// portfolio and saves web-sized WebP copies to public/images/.
// Usage: node scripts/fetch-images.mjs [--force]
import { mkdir, writeFile, access } from 'node:fs/promises';
import sharp from 'sharp';
import { placesImages } from '../src/content/places.js';
import { recordsImages } from '../src/content/records.js';
import { localImageName } from '../src/content/site.js';

const OUT = new URL('../public/images/', import.meta.url);
const MAX = 1800; // px on the long edge; plenty for a 880px column at 2x
const force = process.argv.includes('--force');

function collect(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (typeof obj.id === 'string' && obj.id.includes('~mv2')) out.push(obj);
  for (const v of Object.values(obj)) if (typeof v === 'object') collect(v, out);
  return out;
}

const images = [...collect(placesImages), ...collect(recordsImages)];
await mkdir(OUT, { recursive: true });
let total = 0;
for (const img of images) {
  const name = localImageName(img.id);
  const dest = new URL(name, OUT);
  if (!force) {
    try {
      await access(dest);
      console.log(`skip ${name}`);
      continue;
    } catch {}
  }
  const res = await fetch(`https://static.wixstatic.com/media/${img.id}`);
  if (!res.ok) {
    console.error(`FAILED ${res.status} ${img.id}`);
    process.exitCode = 1;
    continue;
  }
  const input = Buffer.from(await res.arrayBuffer());
  const output = await sharp(input)
    .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await writeFile(dest, output);
  total += output.length;
  console.log(`saved ${name}  ${(input.length / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB  (${img.alt})`);
}
console.log(`done: ${images.length} images, ${(total / 1024).toFixed(0)} KB written`);
