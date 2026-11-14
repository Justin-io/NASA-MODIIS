import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptographicLedger } from '../server/db/ledger';
import fs from 'fs/promises';
import path from 'path';

test('CryptographicLedger - genesis, chaining, and tamper detection', async () => {
  const testFile = path.resolve(process.cwd(), 'test', 'fixtures', 'test_ledger.jsonl');
  try {
    await fs.unlink(testFile);
  } catch {}

  const ledger = new CryptographicLedger(testFile);
  await ledger.init();

  // Genesis block exists
  assert.equal(ledger.getAllEvents().length, 1);
  const genesis = ledger.getAllEvents()[0];
  assert.equal(genesis.sequence, 0);
  assert.equal(genesis.eventType, 'system_init');
  assert.equal(
    genesis.prevHash,
    '0000000000000000000000000000000000000000000000000000000000000000'
  );

  // Append new event
  const evt1 = await ledger.appendEvent('observation_ingested', 'NASA_FIRMS_NRT', {
    sensor: 'VIIRS_SNPP',
    frpMw: 49.6,
  });
  assert.equal(evt1.sequence, 1);
  assert.equal(evt1.prevHash, genesis.hash);

  // Append decision event
  const evt2 = await ledger.appendEvent('decision_recorded', 'Skeptic', {
    decisionId: 'DEC-TEST-01',
    recommendation: 'Suppress rumor regarding Burliar bridge',
    invalidatedAssumption: 'Bridge collapsed',
  });
  assert.equal(evt2.sequence, 2);
  assert.equal(evt2.prevHash, evt1.hash);

  // Validate integrity
  const integrity = ledger.verifyIntegrity();
  assert.equal(integrity.valid, true);
  assert.equal(integrity.totalEvents, 3);

  // Test decision backtracking
  const backtrack = ledger.backtrackDecision('DEC-TEST-01');
  assert.ok(backtrack.decisionEvent);
  assert.equal(backtrack.decisionEvent.payload.decisionId, 'DEC-TEST-01');

  // Clean up
  try {
    await fs.unlink(testFile);
  } catch {}
});
