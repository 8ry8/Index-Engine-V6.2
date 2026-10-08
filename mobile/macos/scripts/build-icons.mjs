#!/usr/bin/env node
/*
 * Regenerates the macOS AppIcon asset catalog from the canonical `v9/icon.svg`.
 *
 * This is a maintenance-time tool, not part of `npm run lint` or `npm test`.
 * `@resvg/resvg-js` is deliberately NOT a package dependency: install it only
 * when you need to redraw the icons, then discard it.
 *
 *   npm install --no-save @resvg/resvg-js
 *   node mobile/macos/scripts/build-icons.mjs
 *
 * The rendered PNGs are committed so that a clean clone can build the macOS app
 * without any rasterizer at all.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '../..');
const sourceSvg = path.join(repoRoot, 'v9', 'icon.svg');
const targetDir = path.join(appRoot, 'IndexEngine', 'Assets.xcassets', 'AppIcon.appiconset');

/** macOS AppIcon slots: [asset-catalog filename, rendered pixel width]. */
const SLOTS = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
];

let Resvg;
try {
  ({ Resvg } = await import('@resvg/resvg-js'));
} catch {
  console.error(
    'This tool needs a rasterizer that is not a package dependency.\n' +
      'Run:  npm install --no-save @resvg/resvg-js\n' +
      'Then: node mobile/macos/scripts/build-icons.mjs'
  );
  process.exit(1);
}

const svg = await fs.readFile(sourceSvg, 'utf8');
await fs.mkdir(targetDir, { recursive: true });
for (const [name, size] of SLOTS) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  await fs.writeFile(path.join(targetDir, name), png);
  console.log(`wrote ${name} (${size}×${size})`);
}
console.log(`macOS AppIcon set regenerated from ${path.relative(repoRoot, sourceSvg)}.`);
