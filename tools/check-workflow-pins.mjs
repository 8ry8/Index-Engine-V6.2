#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowDirectory = path.join(root, '.github/workflows');
const workflowFiles = (await fs.readdir(workflowDirectory))
  .filter((name) => /\.ya?ml$/i.test(name))
  .map((name) => path.join(workflowDirectory, name));
const yamlFiles = [...workflowFiles, path.join(root, '.github/dependabot.yml')];
assert.ok(workflowFiles.length > 0, 'at least one workflow must exist');
let checkedActions = 0;
for (const file of yamlFiles) {
  const source = await fs.readFile(file, 'utf8');
  const document = parseDocument(source, { uniqueKeys: true, strict: true });
  assert.equal(document.errors.length, 0, `${path.relative(root, file)} has YAML errors: ${document.errors.map((error) => error.message).join('; ')}`);
  if (!workflowFiles.includes(file)) continue;
  const workflow = document.toJS();
  assert.ok(workflow.jobs && typeof workflow.jobs === 'object', `${path.relative(root, file)} must define jobs`);
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)/);
    if (!match) continue;
    const reference = match[1];
    if (reference.startsWith('./')) continue;
    assert.match(reference, /@[0-9a-f]{40}$/, `${path.relative(root, file)}:${index + 1} must pin an action to a full commit SHA`);
    assert.match(line, /#\s*v\d/, `${path.relative(root, file)}:${index + 1} must document the pinned action version`);
    checkedActions++;
  }
}
assert.ok(checkedActions > 0, 'at least one external GitHub Action must be checked');
console.log(`Validated ${yamlFiles.length} YAML files and ${checkedActions} full-SHA GitHub Action references.`);
