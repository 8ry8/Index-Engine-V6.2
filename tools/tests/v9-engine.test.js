#!/usr/bin/env node
/**
 * Functional test suite — Index Engine v9.1.0.1 (v9/index.html)
 *
 * Run:
 *   npm install jsdom
 *   node tools/tests/v9-engine.test.js
 *
 * Exercises the engine's exported surface inside a real DOM. Covers every
 * invariant named in docs/SPEC-AUDIT.md §1–§4, plus the regressions that
 * V6.2 exhibited (C-01 … C-13).
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const target = process.argv[2] || path.join(__dirname, '..', '..', 'v9', 'index.html');
const html = fs.readFileSync(target, 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  // jsdom's CSSOM does not parse Tailwind v4's modern @supports/@layer rules;
  // those rules are browser-facing presentation, not application runtime errors.
  if (e.type === 'css parsing') return;
  errors.push('jsdomError: ' + e.message);
});
vc.on('error', e => errors.push('console.error: ' + e));

const dom = new JSDOM(html, {
  url: 'http://localhost/v9/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;
const E = window.IndexEngine;

const T = [];
const ok = (c, m) => T.push([c ? 'PASS' : 'FAIL', m]);
const eq = (a, b, m) => T.push([a === b ? 'PASS' : 'FAIL', `${m}  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`]);
const sec = s => T.push(['SEC', s]);

/* ── boot / single-file deployment contract ───────────────────────────── */
ok(!/cdn\.tailwindcss\.com|<script[^>]+src=/i.test(html), 'core SPA has no runtime CDN/script dependency');
ok(/<style id="tailwind-generated">[\s\S]{1000,}<\/style>/.test(html), 'Tailwind CSS is inlined into the runnable HTML');
ok(/<link rel="manifest" href="\.\/manifest\.webmanifest">/.test(html), 'optional PWA manifest uses a same-origin relative URL');
ok(!!E, 'engine exports window.IndexEngine');
ok(errors.length === 0, 'boots with zero runtime errors' + (errors.length ? ' → ' + errors.join(' | ') : ''));

/* ── 1. nomenclature contract ─────────────────────────────────────────── */
sec('§1 Nomenclature contract');
eq(E.ARITY, 12, 'INV-NOM-07 semantic arity is exactly 12');
eq(E.TOTAL_FIELDS, 14, 'field layout is 14 dot-fields (DATE occupies 3 — the delimiter subtlety)');
eq(E.LAYOUT.length, 12, 'layout maps 12 semantic parts onto 14 fields');
eq(E.LAYOUT[0].width, 3, 'DATE has width 3');
ok(E.LAYOUT.slice(1).every(l => l.width === 1), 'every slot after DATE has width 1');
eq(E.SLOTS.length, 12, 'twelve named slots');
eq(E.SLOTS[E.SLOTS.length - 1], 'id', 'INV-NOM-03 ID is terminal');
ok(E.SEGMENTS.slice(0, 8).every(s => s.group === 'base'), 'INV-NOM-02 base slots occupy 1–8');
ok(E.SEGMENTS.slice(8, 11).every(s => s.group === 'ext'), 'extension slots occupy 9–11');
eq(E.SEGMENTS[11].group, 'id', 'slot 12 is ID');

const sample = () => ({
  date: '2024.03.11', cs: 'SmithVWong', type: 'TRAN', title: 'DepositionOfWong',
  ver: 'v01', priv: 'PRIV', origin: 'OPPS', author: 'RWILLIAMS',
  e1: 'ABC000123', e2: 'NA', e3: 'NA', id: 'FILE000001',
});
eq(E.buildName(sample()).split('.').length, 14, 'buildName emits exactly 14 dot-fields');
eq(E.parseName(E.buildName(sample())).date, sample().date, 'DATE round-trips as a single semantic part');
eq(E.parseName(E.buildName(sample())).__arity, 12, 'parsed semantic arity is 12');
eq(E.parseName(E.buildName(sample())).__conformant, true, 'INV-NOM-06 built name parses as conformant');
eq((sample().date.match(/\./g) || []).length, 2, 'DATE is the sanctioned exception: it embeds the delimiter twice');
ok(E.SEGMENTS.filter(s => s.key !== 'date').every(s => !s.re.test('a.b')), 'no slot other than DATE may contain the delimiter');

/* ── 2. round-trip property test ──────────────────────────────────────── */
sec('INV-NOM-06 / INV-NOM-09  round-trip property test (10 000 names)');
{
  const pool = ['A', 'B', 'Depo', 'Contract', 'Wong', 'Smith', 'Exhibit', 'X', 'Y', 'Zed'];
  let fail = 0;
  for (let i = 0; i < 10000; i++) {
    const p = sample();
    p.cs = 'Case' + (i % 97);
    p.title = pool[i % pool.length] + (i % 41);
    p.type = ['TRAN', 'CONT', 'PLEA', 'EXHB', 'DOCU', 'PDFX'][i % 6];
    p.ver = i % 3 === 0 ? 'v0' + ((i % 9) + 1) : ['FIN', 'EXE', 'DRAF', 'AMND'][i % 4];
    p.e1 = i % 2 ? 'NA' : 'B' + i;
    const back = E.parseName(E.buildName(p));
    if (!back.__conformant || E.SLOTS.some(k => back[k] !== p[k])) fail++;
  }
  eq(fail, 0, '10 000 round-trips: parse(build(x)) === x with zero divergence');
}

/* ── 3. G-01 / G-03 — the two operator confirmations ──────────────────── */
sec('§0.1 Operator confirmations');
eq(E.disambiguate(sample(), []).changed, false, 'G-01 no suffix when the tuple is unique');

{
  // build a ledger of 4 identical tuples
  const L = [];
  for (let k = 1; k <= 4; k++) {
    const d = E.disambiguate(sample(), L);
    const id = 'FILE' + String(k).padStart(6, '0');
    const withId = Object.assign({}, d.parts, { id });
    L.push({ id, parts: withId, newName: E.buildName(withId) });
  }
  const titles = L.map(r => r.parts.title);
  eq(titles[0], 'DepositionOfWong', 'first occurrence keeps the bare title');
  eq(titles[1], 'DepositionOfWongPart2', 'G-01 second occurrence → Part2');
  eq(titles[2], 'DepositionOfWongPart3', 'C-08 third occurrence → Part3 (V6.2 saturated)');
  eq(titles[3], 'DepositionOfWongPart4', 'C-08 fourth occurrence → Part4');
  ok(titles.slice(1).every(t => !t.includes('-')), 'G-01 suffix carries NO hyphen (README was wrong)');
}

{
  const over = Object.assign(sample(), { title: 'A'.repeat(36) });
  const v = E.validate(over);
  ok(v.errors.some(e => e.code === 'TITLE_OVERFLOW'), 'G-03 36-char title fails validation');
  ok(E.detectTriggers(over, { confidence: 1 }).includes('TITLE_OVERFLOW'), 'G-03 36-char title raises the SRQ trigger');
  eq(E.validate(Object.assign(sample(), { title: 'A'.repeat(35) })).ok, true, 'G-03 35-char title is accepted (boundary)');
}

/* ── 4. deduplication semantics — C-08 / C-09 ─────────────────────────── */
sec('§2 C-08 / C-09  deduplication');
{
  const L = [{ id: 'FILE000001', parts: sample(), newName: E.buildName(sample()) }];
  eq(E.collisionCount(sample(), L), 1, 'INV-DUP-02 exact tuple collides');
  eq(E.collisionCount(Object.assign(sample(), { title: 'DepositionOfWong2' }), L), 0, 'C-09 near-miss does NOT collide (substring bug closed)');
  eq(E.collisionCount(Object.assign(sample(), { cs: 'SmithVWongX' }), L), 0, 'C-09 case near-miss does NOT collide');
  eq(E.keyTuple(sample()).length, 11, 'dedup tuple covers the 11 non-ID slots');
}

/* ── 5. ID allocation — C-06 / INV-ID-01 ──────────────────────────────── */
sec('§2 C-06  ID allocation');
eq(E.nextId([]), '000001', 'empty ledger → 000001');
eq(E.nextId([{ id: 'FILE000001' }, { id: 'FILE000042' }, { id: 'FILE000007' }]), '000043', 'INV-ID-01 max+1, order independent');
eq(E.nextId([{ id: 'FILE000900' }]), '000901', 'INV-ID-01 lost counter cache cannot reissue an ID');
eq(E.nextIdFull([]), 'FILE000001', 'nextIdFull prefixes FILE');

/* ── 6. sanitizer — U-04 / U-08 / U-09 / U-10 ─────────────────────────── */
sec('§3 Sanitizer');
eq(E.sanitize('cs', 'José Müller'), 'JoseMuller', 'U-04 diacritics fold to ASCII');
eq(E.sanitize('cs', 'Smith v Wong'), 'SmithVWong', 'multi-word PascalCase fold');
ok(!/[<>:"/\\|?*]/.test(E.sanitize('title', 'A<B>C:D"E/F\\G|H?I*J')), 'U-08 illegal OS characters stripped');
eq(E.sanitize('cs', 'CON'), 'CON_', 'U-09 reserved device name CON guarded');
eq(E.sanitize('cs', 'AUX'), 'AUX_', 'U-09 reserved device name AUX guarded');
ok(!/[. ]$/.test(E.sanitize('cs', 'Smith ')), 'U-10 trailing space stripped');
eq(E.sanitize('title', 'X'.repeat(80)).length, 35, 'title hard-truncates to the 35-char ceiling');
eq(E.sanitize('e1', ''), 'NA', 'empty extension defaults to NA');
eq(E.sanitize('ver', 'v1'), 'v01', 'version normalises v1 → v01');
eq(E.sanitize('ver', 'final'), 'FIN', 'version canonicalises FINAL → FIN');
eq(E.sanitize('ver', 'executed'), 'EXE', 'version canonicalises EXECUTED → EXE');
eq(E.sanitize('ver', 'Amended'), 'AMND', 'version canonicalises Amended → AMND');
eq(E.sanitize('date', '2024-3-1'), '2024.03.01', 'date normalises to YYYY.MM.DD');

/* ── 7. hash chain — U-18 ─────────────────────────────────────────────── */
sec('§3 U-18  hash-chained ledger');
{
  const G = '0'.repeat(64);
  let prev = G;
  const chain = [];
  for (let c = 1; c <= 5; c++) {
    const id = 'FILE' + String(c).padStart(6, '0');
    const nm = E.buildName(Object.assign(sample(), { id, cs: 'Case' + c }));
    const h = E.rowHash(prev, id, nm, c);
    chain.push({ id, newName: nm, timestamp: c, prevHash: prev, hash: h });
    prev = h;
  }
  eq(E.verifyChain(chain).ok, true, 'chain verifies when intact');

  const tampered = JSON.parse(JSON.stringify(chain));
  tampered[2].newName = tampered[2].newName.replace('Case3', 'Case3X');
  const r1 = E.verifyChain(tampered);
  eq(r1.ok, false, 'chain detects content tampering');
  eq(r1.broken[0].id, 'FILE000003', 'tamper is localised to the edited row');

  const reordered = JSON.parse(JSON.stringify(chain));
  reordered.reverse();
  eq(E.verifyChain(reordered).ok, false, 'chain detects reordering');

  const deleted = JSON.parse(JSON.stringify(chain));
  deleted.splice(1, 1);
  eq(E.verifyChain(deleted).ok, false, 'chain detects row deletion');
}

/* ── 8. SHA-256 known-answer tests ────────────────────────────────────── */
sec('§3 SHA-256 known-answer tests');
eq(E.sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'SHA-256 empty string');
eq(E.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 "abc"');
eq(E.sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
   '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1', 'SHA-256 56-byte block boundary');
eq(E.sha256('a'.repeat(1000)).length, 64, 'SHA-256 1000 bytes → 64 hex chars');
eq(E.sha256('The quick brown fox jumps over the lazy dog'),
   'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592', 'SHA-256 pangram');

/* ── 9. migration — C-13 / INV-MIG-01 ─────────────────────────────────── */
sec('§4.1 C-13  arity-9 → arity-12 migration');
{
  const v62 = [{
    id: 'FILE000001', oldName: 'IMG_1.pdf',
    newName: '2024.03.11.SmithVWong.TRAN.Deposition.v01.PRIV.OPPS.RWILLIAMS.FILE000001',
    timestamp: '2024-03-11T00:00:00Z',
  }];
  const m = E.migrateV62(v62);
  eq(m.committed.length, 1, 'arity-9 row migrates');
  eq(m.committed[0].newName.split('.').length, 14, 'migrated name has 14 dot-fields / 12 semantic parts');
  eq(m.committed[0].id, 'FILE000001', 'INV-MIG-01 ID preserved verbatim');
  eq(E.parseName(m.committed[0].newName).__conformant, true, 'migrated name is conformant');
  eq(E.parseName(m.committed[0].newName).date, '2024.03.11', 'migrated DATE reassembles from 3 fields');

  const idem = E.migrateV62([{ newName: m.committed[0].newName }]);
  eq(idem.alreadyConformant, 1, 'C-13 migration is idempotent');
  eq(idem.committed.length, 0, 'idempotent run emits no duplicate rows');

  const over = E.migrateV62([{ newName: '2024.03.11.SmithVWong.TRAN.' + 'A'.repeat(40) + '.v01.PRIV.OPPS.RW.FILE000002' }]);
  eq(over.queued.length, 1, 'C-13 over-length migrated title is QUEUED, not truncated');
  eq(over.queued[0].trigger, 'TITLE_OVERFLOW', 'queued as TITLE_OVERFLOW');

  const junk = E.migrateV62([{ newName: 'a.b.c' }]);
  eq(junk.queued[0].trigger, 'ARITY_OVERFLOW', 'unrecognised arity is quarantined');

  const ext = E.migrateV62([{ newName: '2024.03.11.Case.TRAN.Title.v01.PRIV.CLNT.RW.EXT1.EXT2.EXT3.FILE000003' }]);
  eq(ext.alreadyConformant, 1, 'arity-12 rebuilt to 14 fields is recognised as conformant');

  // V6.2 could carry 0..n dynamic extensions; 1-3 must map into the standing slots
  const oneExt = E.migrateV62([{ newName: '2024.03.11.Case.TRAN.Title.v01.PRIV.CLNT.RW.BATES001.FILE000004' }]);
  eq(oneExt.committed.length, 1, 'V6.2 with 1 dynamic extension migrates');
  eq(oneExt.committed[0].parts.e1, 'BATES001', 'dynamic extension lands in E1');
  eq(oneExt.committed[0].parts.e2, 'NA', 'unused E2 defaults to NA');

  const fourExt = E.migrateV62([{ newName: '2024.03.11.Case.TRAN.Title.v01.PRIV.CLNT.RW.A.B.C.D.FILE000005' }]);
  eq(fourExt.queued.length, 1, 'U-22 four extensions exceed capacity → quarantined');
  eq(fourExt.queued[0].trigger, 'ARITY_OVERFLOW', 'surplus extensions raise ARITY_OVERFLOW');
}

/* ── 10. local extractor (zero-credential ingestion path) ─────────────── */
sec('§3 Local extraction — the key-independent ingress path');
{
  const a = E.localExtract({ name: '2024-03-11 Smith v Wong Deposition Transcript RWILLIAMS FINAL.pdf', type: 'application/pdf', size: 1024 });
  eq(a.date, '2024.03.11', 'reads an ISO-ish date from the filename');
  eq(a.cs, 'SmithVWong', 'reads "X v Y" as the case');
  eq(a.type, 'TRAN', 'classifies a transcript');
  eq(a.ver, 'FIN', 'detects FINAL');
  ok(a.confidence > 0.5, 'confidence exceeds the review threshold for a rich filename');

  eq(E.localExtract({ name: '03-04-2024 Contract Acme.pdf', type: 'application/pdf', size: 1 }).ambiguous, true, 'U-02 ambiguous MM/DD↔DD/MM flagged');
  eq(E.localExtract({ name: 'scan001.pdf', type: 'application/pdf', size: 1 }).date, null, 'U-01 missing date is reported as null, never invented');
  eq(E.localExtract({ name: 'ACME v Zenith Medical Bills CONFIDENTIAL.xlsx', type: 'application/vnd.ms-excel', size: 1 }).priv, 'CONF', 'privilege inferred from CONFIDENTIAL');
  const low = E.localExtract({ name: 'img_4471.jpg', type: 'image/jpeg', size: 1 });
  ok(E.detectTriggers(low, { confidence: low.confidence }).length > 0, 'an uninformative filename raises at least one SRQ trigger');
}

/* ── 11. end-to-end: commit × 30 with collisions, then verify ─────────── */
sec('§4 End-to-end pipeline');
{
  const S = E.getState();
  const before = S.ledger.length;
  const G = '0'.repeat(64);
  const mk = i => {
    const p = Object.assign({}, sample(), { cs: 'Case' + i, title: i % 3 === 0 ? 'DepositionOfWong' : 'Title' + i, id: '' });
    const d = E.disambiguate(p, S.ledger);
    const id = E.nextIdFull(S.ledger);
    const withId = Object.assign({}, d.parts, { id });
    const name = E.buildName(withId);
    const prev = S.ledger.length ? S.ledger[S.ledger.length - 1].hash : G;
    const ts = Date.now() + i;
    S.ledger.push({ id, oldName: 'IMG_' + i + '.pdf', newName: name, parts: withId, timestamp: ts, prevHash: prev, hash: E.rowHash(prev, id, name, ts), provenance: 'test' });
  };
  for (let i = 0; i < 30; i++) mk(i);
  eq(S.ledger.length - before, 30, '30 records committed');
  eq(E.verifyChain(S.ledger).ok, true, 'chain verifies across the whole committed ledger');

  const ids = S.ledger.map(r => r.id);
  eq(new Set(ids).size, ids.length, 'INV-ID-01 every ID is unique');

  const names = S.ledger.map(r => r.newName);
  eq(new Set(names).size, names.length, 'every newName is unique (dedup engine holds under load)');

  ok(S.ledger.every(r => E.parseName(r.newName).__conformant), 'every committed name is conformant');
  ok(S.ledger.every(r => E.parseName(r.newName).__fields === 14), 'every committed name has exactly 14 fields');
  ok(S.ledger.every(r => r.newName.length <= 180), 'INV-NOM-08 every name is within the 180-char budget');
  ok(S.ledger.every(r => !/[<>:"/\\|?*]/.test(r.newName)), 'U-08 no committed name contains an OS-illegal character');
}

/* ── 12. in-page suite ────────────────────────────────────────────────── */
sec('§5 In-page self-test suite');
{
  const r = E.runSelfTest();
  eq(r.pass, r.total, `in-page invariant suite: ${r.pass}/${r.total}`);
}

/* ── 13. UI integration ───────────────────────────────────────────────── */
sec('UI integration');
{
  const doc = window.document;
  eq(doc.querySelectorAll('.tab').length, 5, 'five tabs render');
  eq(doc.querySelectorAll('[data-slot]').length, 11, '11 editable slots render (ID is engine-assigned)');

  doc.getElementById('btnPrefill').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const preview = doc.getElementById('previewText').textContent;
  eq(preview.split('.').length, 14, 'prefilled preview renders 14 dot-fields / 12 semantic parts');
  eq(preview.indexOf('0000.00.00') < 0, true, 'prefill uses today\'s LOCAL date, not an ISO UTC slice');

  const tabs = ['ingest', 'queue', 'ledger', 'settings', 'constructor'];
  let visOk = true;
  tabs.forEach(t => {
    doc.querySelector(`.tab[data-tab="${t}"]`).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const view = doc.querySelector(`[data-view="${t}"]`);
    if (view.classList.contains('hidden')) visOk = false;
  });
  ok(visOk, 'every tab switches its view to visible');
  eq(doc.querySelectorAll('[data-view]:not(.hidden)').length, 1, 'exactly one view is visible at a time');
}

/* ── report ───────────────────────────────────────────────────────────── */
console.log('\n  INDEX ENGINE v9.1.0.1 — INVARIANT TEST SUITE\n  ' + '─'.repeat(74));
let fails = 0;
for (const [s, m] of T) {
  if (s === 'SEC') { console.log(`\n  ── ${m}`); continue; }
  if (s === 'FAIL') fails++;
  console.log(`  ${s === 'PASS' ? '✅' : '❌'}  ${m}`);
}
const total = T.filter(x => x[0] !== 'SEC').length;
console.log('\n  ' + '─'.repeat(74));
console.log(`  ${total - fails}/${total} passed` + (errors.length ? `\n  runtime errors: ${errors.join(' | ')}` : ''));
process.exit(fails ? 1 : 0);
