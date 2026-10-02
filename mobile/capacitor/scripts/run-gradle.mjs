#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const androidRoot = path.join(appRoot, 'android');
const task = process.argv[2];
const allowed = new Set(['assembleDebug', 'bundleRelease']);
if (!allowed.has(task)) {
  console.error('Usage: node scripts/run-gradle.mjs assembleDebug|bundleRelease');
  process.exit(2);
}
const windows = process.platform === 'win32';
const wrapper = path.join(androidRoot, windows ? 'gradlew.bat' : 'gradlew');
const result = spawnSync(wrapper, [task], {
  cwd: androidRoot,
  stdio: 'inherit',
  shell: windows,
  env: process.env,
});
if (result.error) {
  console.error(`Could not start Gradle wrapper: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
