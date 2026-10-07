#!/usr/bin/env node
/*
 * Static verification for the macOS shell.
 *
 * This workspace is Linux, so no Xcode build can run here. Everything that can
 * be checked without a compiler is checked here: app identity, deployment
 * target, universal architecture, version alignment with the root package,
 * least-privilege entitlements, icon sizes, and a byte-for-byte confirmation
 * that the bundled SPA matches `v9/index.html`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '../..');

const read = (relative) => fs.readFile(path.join(appRoot, relative), 'utf8');
const readJson = async (relative) => JSON.parse(await read(relative));

const rootPackage = await readJson('../../package.json');
const version = rootPackage.version;
const [major, minor, patch, revision] = version.split('.').map(Number);
const versionCode = major * 10_000 + minor * 100 + patch * 10 + revision;
const escapedVersion = version.replaceAll('.', '\\.');

// ── Bundled SPA must be a byte-identical copy of the canonical engine ─────
const publicDir = path.join(appRoot, 'IndexEngine', 'Resources', 'www');
for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', 'icon.svg']) {
  try {
    await fs.access(path.join(publicDir, file));
  } catch {
    throw new Error(
      `The bundled web assets are missing (${path.join(publicDir, file)}).\n` +
        'Run `npm run macos:sync` to copy v9/ into the app bundle, then verify again.'
    );
  }
}
const sourceHtml = await fs.readFile(path.join(repoRoot, 'v9', 'index.html'));
const bundledHtml = await fs.readFile(path.join(publicDir, 'index.html'));
assert.deepEqual(bundledHtml, sourceHtml, 'macos:sync must copy the canonical SPA byte-for-byte');
for (const file of ['manifest.webmanifest', 'sw.js', 'icon.svg']) {
  await fs.access(path.join(publicDir, file));
}

// ── Swift sources referenced by the project must exist ───────────────────
const expectedSources = [
  'IndexEngineApp.swift',
  'AppDelegate.swift',
  'ContentView.swift',
  'WebBrowserView.swift',
  'BrowserController.swift',
  'BrowserModel.swift',
  'LocalAssetServer.swift',
  'NSAlert+IndexEngine.swift'
];
for (const file of expectedSources) {
  await fs.access(path.join(appRoot, 'IndexEngine', file));
}

// ── Xcode project identity, target, and version ──────────────────────────
const project = await read('IndexEngine.xcodeproj/project.pbxproj');
assert.match(project, /SDKROOT = macosx;/, 'the project must target the macOS SDK');
assert.match(project, /productType = "com\.apple\.product-type\.application";/);
assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = org\.efnai\.indexengine;/);
assert.match(project, /MACOSX_DEPLOYMENT_TARGET = 13\.0;/);
assert.match(project, /ARCHS = "arm64 x86_64";/, 'the app must build universal (Apple Silicon + Intel)');
assert.match(project, /MARKETING_VERSION = 9\.1\.0\.1;/);
assert.match(project, new RegExp(`MARKETING_VERSION = ${escapedVersion};`));
assert.match(project, new RegExp(`CURRENT_PROJECT_VERSION = ${versionCode};`));
assert.match(project, /ENABLE_HARDENED_RUNTIME = YES;/, 'hardened runtime is required for notarization');
assert.match(project, /GENERATE_INFOPLIST_FILE = NO;/, 'the project must use the checked-in Info.plist');
assert.match(project, /CODE_SIGN_ENTITLEMENTS = IndexEngine\/IndexEngine\.entitlements;/);
assert.match(project, /INFOPLIST_FILE = IndexEngine\/Info\.plist;/);
assert.match(project, /SWIFT_VERSION = 5\.0;/);
assert.match(project, /www in Resources/, 'the synced www bundle must be copied as a resource');
for (const file of expectedSources) {
  const token = file === 'NSAlert+IndexEngine.swift' ? 'NSAlert\\+IndexEngine\\.swift' : file;
  assert.match(project, new RegExp(`${token} in Sources`), `${file} must be in the Sources build phase`);
}

// ── Info.plist ───────────────────────────────────────────────────────────
const infoPlist = await read('IndexEngine/Info.plist');
assert.match(infoPlist, /<string>Index Engine<\/string>/);
assert.match(infoPlist, /<key>NSHighResolutionCapable<\/key>\s*<true\/>/);
assert.match(infoPlist, /<key>NSAllowsLocalNetworking<\/key>\s*<true\/>/);
assert.match(infoPlist, /<key>LSMinimumSystemVersion<\/key>/);
assert.match(infoPlist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
// The app is offline-first; no background location/camera/contacts declarations.
assert.doesNotMatch(infoPlist, /NSCameraUsageDescription|NSMicrophoneUsageDescription|NSLocationWhenInUseUsageDescription|NSContactsUsageDescription/);

// ── Entitlements: least privilege ────────────────────────────────────────
const entitlements = await read('IndexEngine/IndexEngine.entitlements');
assert.match(entitlements, /<key>com\.apple\.security\.app-sandbox<\/key>\s*<true\/>/);
assert.match(entitlements, /<key>com\.apple\.security\.network\.server<\/key>\s*<true\/>/);
assert.match(entitlements, /<key>com\.apple\.security\.files\.user-selected\.read-write<\/key>\s*<true\/>/);
assert.doesNotMatch(
  entitlements,
  /<key>com\.apple\.security\.network\.client<\/key>\s*<true\/>/,
  'the shipped app must not request outbound network access; the engine works offline'
);
assert.doesNotMatch(entitlements, /com\.apple\.security\.cs\.disable-library-validation|com\.apple\.security\.cs\.allow-dyld-environment-variables|com\.apple\.security\.cs\.allow-jit/);

// ── App icon: every macOS slot must exist at the right pixel size ────────
const iconDir = path.join(appRoot, 'IndexEngine', 'Assets.xcassets', 'AppIcon.appiconset');
const iconCatalog = JSON.parse(await fs.readFile(path.join(iconDir, 'Contents.json'), 'utf8'));
assert.ok(iconCatalog.images.length >= 10, 'the macOS AppIcon set must cover every size slot');
for (const slot of iconCatalog.images) {
  assert.equal(slot.idiom, 'mac');
  const file = slot.filename.replace(/@2x\.png$/, '.png').replace(/\.png$/, '');
  const size = Number(slot.size.split('x')[0]);
  const scale = slot.scale === '2x' ? 2 : 1;
  const png = await fs.readFile(path.join(iconDir, slot.filename));
  const expected = size * scale;
  assert.equal(png.readUInt32BE(16), expected, `${slot.filename} must be ${expected}px wide`);
  assert.equal(png.readUInt32BE(20), expected, `${slot.filename} must be ${expected}px tall`);
  assert.ok(file.length > 0);
}

console.log(
  `macOS shell verified: bundled V9.1.0.1 assets byte-identical, ` +
    `org.efnai.indexengine, macOS 13.0+, universal arm64+x86_64, ` +
    `version ${version} (${versionCode}), sandboxed with least-privilege entitlements.`
);
