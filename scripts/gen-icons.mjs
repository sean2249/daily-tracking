import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public', { recursive: true });

// Framed icon: cream "card" with dark border + green check, on terracotta (matches px-card).
const framed = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#d96f47"/>
  <rect x="56" y="56" width="400" height="400" fill="#fbf3df" stroke="#2a1d12" stroke-width="22"/>
  <path d="M150 268 L226 344 L372 176" fill="none" stroke="#3a6b2a"
        stroke-width="50" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>`;

// Maskable: full-bleed terracotta, check centered well inside the safe zone.
const maskable = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#d96f47"/>
  <path d="M168 270 L236 338 L356 196" fill="none" stroke="#fbf3df"
        stroke-width="46" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>`;

const out = async (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/${file}`);

await out(framed(192), 192, 'pwa-192.png');
await out(framed(512), 512, 'pwa-512.png');
await out(maskable(512), 512, 'maskable-512.png');
await out(framed(180), 180, 'apple-touch-icon.png');
await out(framed(32), 32, 'favicon-32.png');
console.log('icons written to public/');
