#!/usr/bin/env node
/**
 * Session 4 verification — Index Engine v9.1.0.1 browser SPA.
 * Run with: npm run test:v9
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');
const { webcrypto } = require('node:crypto');
const { JSDOM, VirtualConsole } = require('jsdom');
const { IDBFactory, IDBKeyRange } = require('fake-indexeddb');

const target = process.argv[2] || path.join(__dirname, '..', '..', 'v9', 'index.html');
const html = fs.readFileSync(target, 'utf8');
const GENESIS = '0'.repeat(64);
const runtimeErrors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', error => {
  if (error.type === 'css parsing') return;
  runtimeErrors.push('jsdomError: ' + error.message);
});
vc.on('error', error => runtimeErrors.push('console.error: ' + error));

function appWithSeed(seed = {}, indexedDBFactory = new IDBFactory()) {
  const dom = new JSDOM(html, {
    url: 'http://localhost/v9/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      Object.defineProperty(window, 'crypto', { configurable: true, value: webcrypto });
      window.TextEncoder = TextEncoder;
      window.TextDecoder = TextDecoder;
      if (indexedDBFactory) {
        Object.defineProperty(window, 'indexedDB', { configurable: true, value: indexedDBFactory });
        window.IDBKeyRange = IDBKeyRange;
      } else {
        Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined });
      }
      for (const [key, value] of Object.entries(seed)) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    },
  });
  return dom;
}

const checks = [];
function check(label, fn) {
  return Promise.resolve().then(fn).then(
    () => checks.push(['PASS', label]),
    error => checks.push(['FAIL', label + ' — ' + (error && error.stack || error)]),
  );
}
function canonical(id = 'FILE00000001', overrides = {}) {
  return Object.assign({
    date: '2024.03.11', cs: 'SmithVWong', type: 'TRAN', type2: 'NA',
    title: 'DepositionOfWong', ver: 'FINAL', priv: 'PRIV', priv2: 'NA',
    origin: 'OPPS', origin2: 'NA', author: 'RWilliams', id,
  }, overrides);
}
function digest(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function run() {
  const sharedIDB = new IDBFactory();
  const dom = appWithSeed({}, sharedIDB);
  const { window } = dom;
  const E = window.IndexEngine;
  let restoreEnvelope = null;
  let restoreSnapshot = null;
  try {
    await check('single-file SPA exports the engine and waits for storage hydration', async () => {
      assert.ok(E);
      assert.equal(await E.ready, true);
      assert.equal(documentValue(window, 'aria-busy'), 'false');
      assert.equal(E.Store.mode(), 'IndexedDB');
      assert.doesNotMatch(html, /cdn\.tailwindcss\.com|<script[^>]+src=/i);
      assert.match(html, /<style id="tailwind-generated">[\s\S]{1000,}<\/style>/);
    });

    await check('V9.1.0.1 semantic order, 12 parts, 14 dot-fields, and file extensions', () => {
      assert.equal(E.ARITY, 12);
      assert.deepEqual(Array.from(E.SLOTS), ['date','cs','type','type2','title','ver','priv','priv2','origin','origin2','author','id']);
      const parts = canonical();
      const base = E.buildName(parts);
      assert.equal(base.split('.').length, 14);
      assert.equal(E.parseName(base).__conformant, true);
      assert.equal(E.buildFilename(parts, 'tar.gz'), base + '.tar.gz');
      assert.equal(E.parseName(base + '.tar.gz').__extension, 'tar.gz');
    });

    await check('NA is accepted only in TYPE2, PRIV2, and ORIGIN2', () => {
      assert.equal(E.validate(canonical()).ok, true);
      assert.equal(E.validate(canonical('FILE00000001', { type: 'NA' })).ok, false);
      assert.equal(E.validate(canonical('FILE00000001', { author: 'NA' })).ok, false);
    });

    await check('10,000 valid records round-trip without field drift', () => {
      const types = ['TRAN','PLDG','VOCH','LEAS','MEDC'];
      const vers = ['v01','FINAL','DRAFT','REV','EXE'];
      for (let i = 0; i < 10000; i++) {
        const parts = canonical('FILE' + String(i + 1).padStart(8, '0'), {
          cs: 'Case' + (i % 91) + 'Matter', type: types[i % types.length],
          type2: i % 2 ? 'NA' : 'SCAN', title: 'ArchiveTitle' + (i % 97),
          ver: vers[i % vers.length], priv2: i % 3 ? 'NA' : 'PII',
          origin2: i % 2 ? 'NA' : 'HFGD',
        });
        const parsed = E.parseName(E.buildName(parts));
        assert.equal(parsed.__conformant, true, 'record ' + i);
        for (const slot of E.SLOTS) assert.equal(parsed[slot], parts[slot], slot + ' in record ' + i);
      }
    });

    await check('titles are preserved and routed to review instead of clipped', () => {
      const long = 'L'.repeat(48);
      assert.equal(E.sanitize('title', long), long);
      assert.ok(E.detectTriggers(canonical('FILE00000001', { title: long }), { confidence: 1 }).includes('TITLE_OVERFLOW'));
      assert.equal(E.migrateV62([{ newName: '2024.03.11.SmithVWong.TRAN.' + long + '.v01.PRIV.OPPS.RWilliams.FILE00000002' }]).queued[0].parts.title, long);
    });

    await check('duplicate naming uses Part2 without a hyphen and re-tests collisions', () => {
      const base = canonical();
      const existing = [
        { parts: base },
        { parts: Object.assign({}, base, { title: 'DepositionOfWongPart2' }) },
      ];
      assert.equal(E.disambiguate(base, existing).parts.title, 'DepositionOfWongPart3');
      assert.ok(!E.disambiguate(base, existing).parts.title.includes('-'));
    });

    await check('rename-script paths are safely quoted for bash and batch output', () => {
      const hostile = "name'; printf injected; $(printf still-data) `echo safe` $PATH";
      const script = "printf '%s' " + E.bashQuote(hostile);
      assert.equal(execFileSync('bash', ['-c', script], { encoding: 'utf8' }), hostile);
      assert.equal(E.batchQuote('percent%name.txt'), '"percent%%name.txt"');
    });

    await check('IDs use max+1, eight-digit formatting, and persistent high-water protection', () => {
      assert.equal(E.nextId([], 42), '00000043');
      assert.equal(E.nextIdFull([{ id: 'FILE00000015' }], 42), 'FILE00000043');
      assert.throws(() => E.nextId([], 99999999), error => error.code === 'ID_EXHAUSTED');
    });

    await check('complete ledger and audit chains detect tampering without auto-repair', () => {
      let prev = GENESIS;
      const chain = [];
      for (let i = 1; i <= 3; i++) {
        const parts = canonical('FILE' + String(i).padStart(8, '0'), { cs: 'Case' + i });
        const row = { id: parts.id, parts, newName: E.buildName(parts), timestamp: i,
          chainVersion: 2, prevHash: prev, provenance: 'test', hash: '' };
        row.hash = E.rowHash(prev, row);
        prev = row.hash;
        chain.push(row);
      }
      assert.equal(E.verifyChain(chain).ok, true);
      const broken = structuredClone(chain);
      broken[1].parts.cs = 'Tampered';
      assert.equal(E.verifyChain(broken).ok, false);
      assert.equal(E.verifyChain(E.upgradeHashChain(broken)).ok, false);
      const audit = E.makeAuditEntry([], 'TEST', { value: 1 }, 1);
      assert.equal(E.verifyAuditChain(audit).ok, true);
      const tamperedAudit = structuredClone(audit);
      tamperedAudit[0].detail.value = 2;
      assert.equal(E.verifyAuditChain(tamperedAudit).ok, false);
    });

    await check('legacy V6.2 migration preserves IDs and queues title overflow', () => {
      const legacy = [{ oldName: 'scan.pdf', newName: '2024.03.11.SmithVWong.TRAN.Deposition.v01.PRIV.OPPS.RWilliams.FILE000001' }];
      const converted = E.migrateV62(legacy);
      assert.equal(converted.committed.length, 1);
      assert.equal(converted.committed[0].id, 'FILE000001');
      assert.equal(E.parseName(converted.committed[0].newName).__conformant, true);
      const over = E.migrateV62([{ newName: '2024.03.11.SmithVWong.TRAN.' + 'X'.repeat(42) + '.v01.PRIV.OPPS.RW.FILE000002' }]);
      assert.equal(over.queued[0].trigger, 'TITLE_OVERFLOW');
      assert.equal(over.queued[0].parts.title.length, 42);
    });

    await check('file-intake vault metadata detects edits and does not retain file bytes', () => {
      const file = new window.File(['not persisted'], 'source.pdf', { type: 'application/pdf' });
      const hash = digest('not persisted');
      const record = E.makeVaultRecord(file, hash, { extension: 'pdf', sourceFamily: 'USER', sourceSpecific: 'NA' }, 1700000000000);
      assert.equal(record.contentStored, false);
      assert.equal(E.verifyVault([record]).ok, true);
      const tampered = structuredClone(record);
      tampered.fileSize += 1;
      assert.equal(E.verifyVault([tampered]).ok, false);
      assert.equal(JSON.stringify(record).includes('not persisted'), false);
    });

    await check('actual intake hashes file bytes, atomically persists metadata/audit, then drops the byte-bearing File reference', async () => {
      const bytes = new TextEncoder().encode('EFNAI source bytes are not archived');
      const source = {
        name: '2024-03-11 Smith v Wong Transcript FINAL.pdf', size: bytes.byteLength,
        type: 'application/pdf', arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      };
      const state = E.getState();
      state.staged = [source];
      await E.runExtraction();
      assert.equal(state.staged.length, 0);
      assert.equal(state.env.length, 1);
      const expectedHash = digest(Buffer.from(bytes));
      assert.equal(state.env[0].fileHash, expectedHash);
      assert.equal(state.vault.at(-1).sha256, expectedHash);
      assert.equal(state.vault.at(-1).contentStored, false);
      assert.equal(E.verifyVault(state.vault).ok, true);
      assert.ok(state.audit.some(event => event.op === 'INTAKE_HASH'));
      assert.equal(JSON.stringify(state.vault).includes('EFNAI source bytes are not archived'), false);
      assert.equal(Object.hasOwn(state.env[0], 'file'), false);
    });

    await check('append commits are atomic, concurrent IDs stay unique, and chains verify', async () => {
      const commits = Array.from({ length: 5 }, (_, i) => E.commitRecord(canonical('', { cs: 'Matter' + i }), {
        oldName: 'manual-' + i + '.pdf', extension: 'pdf', provenance: 'manual',
      }));
      const results = await Promise.all(commits);
      assert.ok(results.every(result => result && result.row));
      const state = E.getState();
      const ids = state.ledger.map(row => row.id);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(state.ledger.length, 5);
      assert.equal(E.verifyChain(state.ledger).ok, true);
      assert.equal(E.verifyAuditChain(state.audit).ok, true);
      assert.equal(E.Store.read(E.Store.K.idHighWater), 5);
    });

    await check('separate browser tabs serialize IndexedDB append transactions without ID or chain collisions', async () => {
      const secondDom = appWithSeed({}, sharedIDB);
      try {
        const E2 = secondDom.window.IndexEngine;
        assert.equal(await E2.ready, true);
        await Promise.all([
          E.commitRecord(canonical('', { cs: 'CrossTabOne' }), { oldName: 'tab-one.pdf', extension: 'pdf', provenance: 'manual' }),
          E2.commitRecord(canonical('', { cs: 'CrossTabTwo' }), { oldName: 'tab-two.pdf', extension: 'pdf', provenance: 'manual' }),
        ]);
        const state = await E.Store.readMany([E.Store.K.ledger, E.Store.K.audit, E.Store.K.idHighWater]);
        assert.equal(state[E.Store.K.ledger].length, 7);
        assert.equal(new Set(state[E.Store.K.ledger].map(row => row.id)).size, 7);
        assert.equal(E.verifyChain(state[E.Store.K.ledger]).ok, true);
        assert.equal(E.verifyAuditChain(state[E.Store.K.audit]).ok, true);
        assert.equal(state[E.Store.K.idHighWater], 7);
      } finally {
        secondDom.window.close();
      }
    });

    await check('write transaction abort leaves every key unchanged', async () => {
      const beforeSeq = E.Store.read(E.Store.K.seq, 0);
      const beforeQueue = E.Store.read(E.Store.K.queue, []);
      await assert.rejects(E.Store.transact([E.Store.K.seq, E.Store.K.queue], () => {
        throw new Error('intentional abort');
      }, 'test-abort'), /intentional abort/);
      assert.equal(E.Store.read(E.Store.K.seq, 0), beforeSeq);
      assert.deepEqual(E.Store.read(E.Store.K.queue, []), beforeQueue);
    });

    await check('queue resolution removes the item and records who/when in ledger and audit', async () => {
      const parts = canonical('', { title: 'A'.repeat(38) });
      const item = await E.enqueue('TITLE_OVERFLOW', parts, { chars: 38 }, { fileName: 'queue.pdf' });
      const index = E.getState().queue.findIndex(row => row.queueId === item.queueId);
      const fixed = Object.assign({}, parts, { title: 'ShortTitle' });
      const result = await E.resolveQueue(index, 'shortened', { title: 'ShortTitle' }, fixed, false);
      assert.ok(result && result.row);
      assert.equal(E.getState().queue.some(row => row.queueId === item.queueId), false);
      assert.equal(result.row.resolvedBy, 'operator');
      assert.ok(Number.isFinite(result.row.resolvedAt));
      assert.equal(E.verifyChain(E.getState().ledger).ok, true);
      assert.equal(E.verifyAuditChain(E.getState().audit).ok, true);
    });

    await check('encrypted backup uses AES-GCM/PBKDF2, round-trips, and rejects wrong key or tampering', async () => {
      const passphrase = 'Archive backup passphrase 2026';
      const text = await E.encryptBackup(passphrase);
      const envelope = JSON.parse(text);
      assert.equal(envelope.format, 'EFNAI-V9-ENCRYPTED-BACKUP');
      assert.equal(envelope.cipher, 'AES-256-GCM');
      assert.equal(envelope.kdf, 'PBKDF2-SHA256');
      assert.ok(envelope.iterations >= 600000);
      assert.ok(envelope.salt && envelope.iv && envelope.keyId);
      const payload = await E.decryptBackup(text, passphrase);
      restoreEnvelope = text;
      restoreSnapshot = payload;
      assert.equal(payload.format, 'EFNAI-LEDGER-PAYLOAD');
      assert.equal(payload.ledger.length, E.getState().ledger.length);
      assert.equal(E.verifyChain(payload.ledger).ok, true);
      await assert.rejects(E.decryptBackup(text, 'incorrect passphrase'), /authentication failed/i);
      const modified = JSON.parse(text);
      modified.ciphertext = (modified.ciphertext[0] === 'A' ? 'B' : 'A') + modified.ciphertext.slice(1);
      await assert.rejects(E.decryptBackup(JSON.stringify(modified), passphrase), /authentication failed/i);
    });

    await check('restore replaces data only after confirmation, logs RESTORE, and never lowers the ID high-water mark', async () => {
      assert.ok(restoreEnvelope && restoreSnapshot);
      const beforeWater = E.Store.read(E.Store.K.idHighWater);
      await E.commitRecord(canonical('', { cs: 'AddedAfterBackup' }), { oldName: 'later.pdf', extension: 'pdf', provenance: 'manual' });
      const afterWater = E.Store.read(E.Store.K.idHighWater);
      assert.ok(afterWater > restoreSnapshot.idHighWater);
      window.confirm = () => true;
      const restoreInput = window.document.getElementById('restoreFile');
      Object.defineProperty(restoreInput, 'files', { configurable: true, value: [{ size: restoreEnvelope.length, text: async () => restoreEnvelope }] });
      window.document.getElementById('restorePass').value = 'Archive backup passphrase 2026';
      await E.restoreEncryptedBackup();
      const state = E.getState();
      assert.equal(state.ledger.length, restoreSnapshot.ledger.length);
      assert.equal(state.audit[state.audit.length - 1].op, 'RESTORE');
      assert.equal(E.verifyChain(state.ledger).ok, true);
      assert.equal(E.verifyAuditChain(state.audit).ok, true);
      assert.equal(E.Store.read(E.Store.K.idHighWater), Math.max(afterWater, restoreSnapshot.idHighWater));
      assert.equal(E.nextIdFull(state.ledger, E.Store.read(E.Store.K.idHighWater)), 'FILE' + String(afterWater + 1).padStart(8, '0'));
      assert.ok(beforeWater <= afterWater);
    });

    await check('Gemini key exists only in memory and can be explicitly cleared', () => {
      const input = window.document.getElementById('apiKey');
      input.value = 'test-key-never-persist';
      window.document.getElementById('btnKeySet').click();
      const state = E.getState();
      assert.equal(state.apiKey, 'test-key-never-persist');
      assert.ok(state.apiKeyExpiresAt > Date.now() && state.apiKeyExpiresAt <= Date.now() + 30 * 60 * 1000 + 1000);
      for (let i = 0; i < window.localStorage.length; i++) {
        const value = window.localStorage.getItem(window.localStorage.key(i)) || '';
        assert.ok(!value.includes('test-key-never-persist'));
      }
      window.document.getElementById('btnKeyClear').click();
      assert.equal(state.apiKey, null);
    });

    await check('self-test and UI integration pass after hydration', () => {
      const self = E.runSelfTest();
      assert.equal(self.pass, self.total);
      const doc = window.document;
      assert.equal(doc.querySelectorAll('.tab').length, 5);
      assert.equal(doc.querySelectorAll('[data-slot]').length, 11);
      doc.getElementById('btnPrefill').click();
      const preview = doc.getElementById('previewText').textContent;
      assert.equal(E.parseName(preview).__conformant, true);
      assert.equal(E.parseName(preview).__extension, 'pdf');
      for (const tab of ['ingest','queue','ledger','settings','constructor']) doc.querySelector('.tab[data-tab="' + tab + '"]').click();
      assert.equal(doc.querySelectorAll('[data-view]:not(.hidden)').length, 1);
    });

    await check('no key or source-file contents appear in the encrypted payload', async () => {
      const payload = await E.backupPayload();
      const encoded = JSON.stringify(payload);
      assert.ok(!encoded.includes('test-key-never-persist'));
      assert.ok(!encoded.includes('not persisted'));
      assert.equal(payload.ledger.length, E.getState().ledger.length);
    });

    const migrationSeed = {
      'ie9.ledger': [{ id: 'FILE00000007', oldName: 'old.pdf',
        newName: '2024.03.11.SmithVWong.TRAN.NA.Deposition.FINAL.PRIV.NA.OPPS.NA.RWilliams.FILE00000007',
        timestamp: 1700000000000 }],
      'ie9.queue': [{ trigger: 'TITLE_OVERFLOW', parts: canonical('', { title: 'A'.repeat(37) }), meta: { fileName: 'old-long.pdf' } }],
      'ie9.srqseq': 0,
    };
    const migrationDom = appWithSeed(migrationSeed);
    try {
      const migratedEngine = migrationDom.window.IndexEngine;
      await check('boot migrates legacy localStorage chains, queue IDs, and ID high-water without loss', async () => {
        assert.equal(await migratedEngine.ready, true);
        const state = migratedEngine.getState();
        assert.equal(state.ledger.length, 1);
        assert.equal(state.ledger[0].id, 'FILE00000007');
        assert.equal(migratedEngine.verifyChain(state.ledger).ok, true);
        assert.equal(state.queue.length, 1);
        assert.equal(state.queue[0].queueId, 'SRQ-000001');
        assert.equal(migratedEngine.Store.read(migratedEngine.Store.K.idHighWater), 7);
        assert.equal(state.audit[state.audit.length - 1].op, 'STORE_MIGRATE');
        assert.equal(migratedEngine.verifyAuditChain(state.audit).ok, true);
      });
    } finally {
      migrationDom.window.close();
    }

    const fallbackDom = appWithSeed({
      'ie9.state.journal': { version: 1, at: 1, values: { 'ie9.srqseq': 17 } },
    }, null);
    try {
      const F = fallbackDom.window.IndexEngine;
      await check('localStorage fallback replays its write journal and commits atomically', async () => {
        assert.equal(await F.ready, true);
        assert.equal(F.Store.mode(), 'localStorage fallback');
        assert.equal(F.Store.read(F.Store.K.seq), 17);
        assert.equal(fallbackDom.window.localStorage.getItem('ie9.state.journal'), null);
        await F.Store.transact([F.Store.K.seq, F.Store.K.queue], snapshot => {
          const values = {};
          values[F.Store.K.seq] = snapshot[F.Store.K.seq] + 1;
          values[F.Store.K.queue] = [{ queueId: 'SRQ-000018' }];
          return { values, result: true };
        }, 'fallback-test');
        assert.equal(F.Store.read(F.Store.K.seq), 18);
        assert.equal(F.Store.read(F.Store.K.queue)[0].queueId, 'SRQ-000018');
        assert.equal(fallbackDom.window.localStorage.getItem('ie9.state.journal'), null);
      });
    } finally {
      fallbackDom.window.close();
    }

    await check('runtime boots without JavaScript errors', () => assert.deepEqual(runtimeErrors, []));
  } finally {
    window.close();
  }

  console.log('\n  INDEX ENGINE V9.1.0.1 — SESSION 4 TESTS\n  ' + '─'.repeat(76));
  let failures = 0;
  for (const [status, label] of checks) {
    if (status === 'FAIL') failures++;
    console.log('  ' + (status === 'PASS' ? '✅ ' : '❌ ') + label.replace(/\n/g, '\n     '));
  }
  console.log('\n  ' + '─'.repeat(76));
  console.log(`  ${checks.length - failures}/${checks.length} passed`);
  if (failures) process.exitCode = 1;
}
function documentValue(window, name) {
  return window.document.body.getAttribute(name);
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
