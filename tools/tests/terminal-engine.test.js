#!/usr/bin/env node
/**
 * Functional test suite — Terminal Command Engine (tools/terminal-engine.html)
 *
 * Run:
 *   npm install jsdom
 *   node tools/tests/terminal-engine.test.js
 *
 * Asserts the engine's core invariants:
 *   INV-1  boots with zero runtime errors
 *   INV-2  parameter substitution resolves every token in the default profile
 *   INV-3  Github-Actions `${{ }}` expressions survive template interpolation byte-exact
 *   INV-4  the parameter panel is scoped to the parameters the active protocol uses
 *   INV-5  editing a parameter re-renders dependent commands with no reload
 *   INV-6  a blank parameter raises the visible "Unresolved parameter" guard
 *   INV-7  completion state persists across reloads
 */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');
const target = process.argv[2] || path.join(__dirname, '..', 'terminal-engine.html');
const html = fs.readFileSync(target, 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost/tools/terminal-engine.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: undefined,          // do NOT fetch the Tailwind CDN
  virtualConsole: new (require('jsdom').VirtualConsole)()
    .on('jsdomError', e => errors.push('jsdomError: ' + e.message))
    .on('error', e => errors.push('error: ' + e))
});
const { window } = dom;
const doc = window.document;

const T = [];
const ok = (c, m) => T.push([c ? 'PASS' : 'FAIL', m]);

// 1. boot without throwing
ok(errors.length === 0, 'boots with zero script errors' + (errors.length ? ' → ' + errors.join(' | ') : ''));

// 2. nav rendered all 8 recipes
const navBtns = doc.querySelectorAll('#recipeNav button[data-recipe]');
ok(navBtns.length === 8, `recipe nav rendered 8 protocols (got ${navBtns.length})`);

// 3. header populated
ok(doc.getElementById('recipeName').textContent === 'SPA → GitHub Pages',
   `default protocol = "${doc.getElementById('recipeName').textContent}"`);

// 4. steps rendered for default recipe
let steps = doc.querySelectorAll('#stepHost article.step');
ok(steps.length === 10, `steps rendered for spa-pages = 10 (got ${steps.length})`);

// 5. INTERPOLATION: default vars must resolve — no «» tokens remain
const allCmd = [...doc.querySelectorAll('#stepHost pre.cmd code')].map(e => e.textContent).join('\n');
const leftover = [...new Set((allCmd.match(/«[A-Z_]+»/g) || []))];
ok(leftover.length === 0, `all parameters resolved by default (leftover: ${leftover.join(',') || 'none'})`);

// 6. the real value actually appears
ok(allCmd.includes('index-engine') && allCmd.includes('8ry8'), 'substituted values appear in rendered commands (index-engine, 8ry8)');

// 7. GitHub Actions expression survives byte-exact
ok(allCmd.includes('${{ steps.deployment.outputs.page_url }}'), 'un-escaped ${{ }} expression preserved through template');

// 8. variables panel lists only parameters used by this protocol
const varInputs = doc.querySelectorAll('#varHost input[data-var]');
const keys = [...varInputs].map(i => i.getAttribute('data-var')).sort();
ok(keys.join(',') === 'GH_REPO,GH_USER,NODE_MAJOR,PROJECT', `variable panel scoped to protocol: ${keys.join(',')}`);
ok(doc.getElementById('varCount').textContent === '4 used', `counter reads "4 used" (got "${doc.getElementById('varCount').textContent}")`);

// 9. changing a parameter re-renders dependent commands live
const repoInput = doc.querySelector('#varHost input[data-var="GH_REPO"]');
repoInput.value = 'my-legal-archive';
repoInput.dispatchEvent(new window.Event('input', { bubbles: true }));
const after = [...doc.querySelectorAll('#stepHost pre.cmd code')].map(e => e.textContent).join('\n');
ok(after.includes('my-legal-archive') && !after.includes('/Index-Engine-V6.2/'),
   'live re-render on parameter change (base path updated)');

// 10. progress toggle works
const check = doc.querySelector('#stepHost button[data-check]');
check.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok(doc.getElementById('progressLabel').textContent.startsWith('1 / 10'), `progress label after 1 tick = "${doc.getElementById('progressLabel').textContent}"`);
ok(doc.querySelector('#stepHost article.step').classList.contains('done'), 'step gains .done state');

// 11. progress persists to localStorage
const persisted = JSON.parse(window.localStorage.getItem('tce.progress.v1'));
ok(persisted && persisted['spa-pages'] && Object.keys(persisted['spa-pages']).length === 1, 'progress persisted to localStorage');

// 12. shell toggle switches command bodies
doc.querySelector('.shell-btn[data-shell="win"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const winCmd = [...doc.querySelectorAll('#stepHost pre.cmd code')].map(e => e.textContent).join('\n');
ok(winCmd.includes('npm create vite@latest'), 'PowerShell view renders a command body (scaffold step)');
ok(doc.querySelector('.shell-btn[data-shell="win"]').style.background.includes('56, 189, 248'), 'active shell button is visually marked');
doc.querySelector('.shell-btn[data-shell="unix"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

// 13. empty parameter surfaces the unresolved guard
const nodeInput = doc.querySelector('#varHost input[data-var="NODE_MAJOR"]');
nodeInput.value = '';
nodeInput.dispatchEvent(new window.Event('input', { bubbles: true }));
const unresolvedShown = [...doc.querySelectorAll('#stepHost article.step')]
  .some(a => a.textContent.includes('Unresolved parameter'));
ok(unresolvedShown, 'blanking a parameter raises the "Unresolved parameter" guard');

// 14. search filter
doc.getElementById('search').value = 'keystore';
doc.getElementById('search').dispatchEvent(new window.Event('input', { bubbles: true }));
ok(doc.querySelectorAll('#stepHost article.step').length === 0, 'search filters within the active protocol (keystore not in spa-pages)');

// 15. switching protocol renders its steps
doc.getElementById('search').value = '';
doc.getElementById('search').dispatchEvent(new window.Event('input', { bubbles: true }));
doc.querySelector('#recipeNav button[data-recipe="hardening"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok(doc.querySelectorAll('#stepHost article.step').length === 6, `hardening renders 6 steps (got ${doc.querySelectorAll('#stepHost article.step').length})`);
ok(doc.getElementById('recipeName').textContent === 'Security Hardening', 'header follows protocol switch');

// 16. no unescaped user data injected as HTML
ok(!doc.getElementById('stepHost').innerHTML.includes('<script'), 'no script injection in rendered output');

console.log('\n  TERMINAL COMMAND ENGINE — FUNCTIONAL TEST SUITE\n  ' + '─'.repeat(62));
let fails = 0;
T.forEach(([s, m]) => { if (s === 'FAIL') fails++; console.log(`  ${s === 'PASS' ? '✅' : '❌'}  ${m}`); });
console.log('  ' + '─'.repeat(62));
console.log(`  ${T.length - fails}/${T.length} passed` + (errors.length ? `\n  runtime errors: ${errors.join(' | ')}` : ''));
process.exit(fails ? 1 : 0);
