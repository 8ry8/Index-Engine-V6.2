#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const appPackage = JSON.parse(await fs.readFile(path.join(appRoot, 'package.json'), 'utf8'));
const config = JSON.parse(await fs.readFile(path.join(appRoot, 'capacitor.config.json'), 'utf8'));
const version = '8.4.3';
assert.equal(appPackage.dependencies['@capacitor/core'], version);
assert.equal(appPackage.dependencies['@capacitor/android'], version);
assert.equal(appPackage.devDependencies['@capacitor/cli'], version);
assert.equal(config.appId, 'org.efnai.indexengine');
assert.equal(config.webDir, 'www');
assert.equal(config.android.allowMixedContent, false);
assert.equal(config.server.androidScheme, 'https');
assert.equal(config.server?.url, undefined, 'production config must bundle local assets, not a development URL');

const publicDir = path.join(appRoot, 'www');
const source = await fs.readFile(path.resolve(appRoot, '../../v9/index.html'));
const bundled = await fs.readFile(path.join(publicDir, 'index.html'));
assert.deepEqual(bundled, source, 'web:sync must copy the current canonical SPA byte-for-byte');
for (const file of ['manifest.webmanifest', 'sw.js', 'icon.svg'])
  await fs.access(path.join(publicDir, file));

const androidRoot = path.join(appRoot, 'android');
const variables = await fs.readFile(path.join(androidRoot, 'variables.gradle'), 'utf8');
assert.match(variables, /minSdkVersion\s*=\s*24/);
assert.match(variables, /compileSdkVersion\s*=\s*36/);
assert.match(variables, /targetSdkVersion\s*=\s*36/);
const gradle = await fs.readFile(path.join(androidRoot, 'app/build.gradle'), 'utf8');
assert.match(gradle, /applicationId\s+"org\.efnai\.indexengine"/);
assert.match(gradle, /versionCode\s+90101/);
assert.match(gradle, /versionName\s+"9\.1\.0\.1"/);
const manifest = await fs.readFile(path.join(androidRoot, 'app/src/main/AndroidManifest.xml'), 'utf8');
assert.match(manifest, /android\.permission\.INTERNET/);
assert.match(manifest, /android:allowBackup="false"/);
assert.match(manifest, /android:usesCleartextTraffic="false"/);
assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
assert.doesNotMatch(manifest, /READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE|usesCleartextTraffic="true"/);
const extractionRules = await fs.readFile(path.join(androidRoot, 'app/src/main/res/xml/data_extraction_rules.xml'), 'utf8');
assert.match(extractionRules, /<cloud-backup>/);
assert.match(extractionRules, /<device-transfer>/);
assert.match(extractionRules, /domain="root" path="\."/);
const filePaths = await fs.readFile(path.join(androidRoot, 'app/src/main/res/xml/file_paths.xml'), 'utf8');
assert.match(filePaths, /<cache-path name="share" path="shared\/"/);
assert.doesNotMatch(filePaths, /<external-path/);
await fs.access(path.join(androidRoot, 'gradlew'));
await fs.access(path.join(androidRoot, 'gradlew.bat'));
console.log('Capacitor Android skeleton verified: local V9 assets, API 24–36, no cleartext or broad storage permissions.');
