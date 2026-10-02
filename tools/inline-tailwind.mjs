#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const generatedPath = path.resolve(process.argv[2] || '.tailwind.tmp.css');
const htmlPath = path.resolve('v9/index.html');
const marker = /<style id="tailwind-generated">[\s\S]*?<\/style>/;

if (!fs.existsSync(generatedPath)) throw new Error(`Generated CSS not found: ${generatedPath}`);
const html = fs.readFileSync(htmlPath, 'utf8');
if (!marker.test(html)) throw new Error('Tailwind inline style marker is missing from v9/index.html');
const css = fs.readFileSync(generatedPath, 'utf8').trim();
fs.writeFileSync(htmlPath, html.replace(marker, `<style id="tailwind-generated">\n${css}\n</style>`));
fs.unlinkSync(generatedPath);
console.log(`Inlined ${Buffer.byteLength(css)} bytes of Tailwind CSS into ${htmlPath}`);
