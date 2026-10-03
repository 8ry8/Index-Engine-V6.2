#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['v9/index.html', 'tools/terminal-engine.html'];
const before = new Map(await Promise.all(files.map(async (file) => [file, await fs.readFile(path.join(root, file))])));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const script of ['build:spa', 'build:terminal']) {
  const result = spawnSync(npm, ['run', script], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `npm run ${script} failed with exit status ${result.status}`);
}
for (const file of files) {
  const after = await fs.readFile(path.join(root, file));
  assert.deepEqual(after, before.get(file), `${file} was stale; rebuild and commit the generated HTML artifact`);
}
console.log('Both self-contained HTML artifacts reproduce byte-for-byte from their checked-in maintenance sources.');
