#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '../..');
const source = path.join(repoRoot, 'v9');
const target = path.join(appRoot, 'www');
const required = ['index.html', 'manifest.webmanifest', 'sw.js', 'icon.svg'];

for (const item of required) {
  try { await fs.access(path.join(source, item)); }
  catch { throw new Error(`Required V9 asset is missing: ${path.join(source, item)}`); }
}
const html = await fs.readFile(path.join(source, 'index.html'), 'utf8');
for (const token of ['TYPE2', 'PRIV2', 'ORIGIN2', 'TITLE > 35']) {
  if (!html.includes(token)) throw new Error(`The source SPA is missing expected V9 marker: ${token}`);
}
await fs.rm(target, { recursive: true, force: true });
await fs.cp(source, target, { recursive: true });
console.log(`Copied the V9.1.0.1 SPA bundle to ${target}`);
