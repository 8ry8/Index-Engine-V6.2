#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (relative) => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));
const rootPackage = await readJson('package.json');
const rootLock = await readJson('package-lock.json');
const mobilePackage = await readJson('mobile/capacitor/package.json');
const mobileLock = await readJson('mobile/capacitor/package-lock.json');
const version = rootPackage.version;
assert.match(version, /^\d+\.\d+\.\d+\.\d+$/, 'release version must have four numeric components');
assert.equal(rootLock.packages[''].version, version, 'root lockfile version must match package.json');
assert.equal(mobilePackage.version, version, 'mobile package version must match root');
assert.equal(mobileLock.packages[''].version, version, 'mobile lockfile version must match root');

const [major, minor, patch, revision] = version.split('.').map(Number);
assert.ok(minor < 100 && patch < 10 && revision < 10, 'Android versionCode mapping limits are exceeded');
const versionCode = major * 10_000 + minor * 100 + patch * 10 + revision;
const androidGradle = await fs.readFile(path.join(root, 'mobile/capacitor/android/app/build.gradle'), 'utf8');
assert.match(androidGradle, new RegExp(`versionName\\s+"${version.replaceAll('.', '\\.')}"`));
assert.match(androidGradle, new RegExp(`versionCode\\s+${versionCode}\\b`));

const iosProject = await fs.readFile(path.join(root, 'mobile/capacitor/ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
assert.match(iosProject, new RegExp(`MARKETING_VERSION = ${version.replaceAll('.', '\\.')};`));
assert.match(iosProject, new RegExp(`CURRENT_PROJECT_VERSION = ${versionCode};`));

const dottedVersion = version.split(".").join("[.]");
const macosProject = await fs.readFile(path.join(root, 'mobile/macos/IndexEngine.xcodeproj/project.pbxproj'), 'utf8');
assert.match(macosProject, new RegExp(`MARKETING_VERSION = ${dottedVersion};`));
assert.match(macosProject, new RegExp(`CURRENT_PROJECT_VERSION = ${versionCode};`));

const html = await fs.readFile(path.join(root, 'v9/index.html'), 'utf8');
assert.ok(html.includes(`Index Engine v${version}`), 'V9 page title must use the release version');

console.log(`Version ${version} is aligned across root/mobile lockfiles, Android (${versionCode}), iOS, macOS, and the V9 SPA.`);
