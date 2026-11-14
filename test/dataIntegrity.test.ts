import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Production Data Integrity & Compliance Gatekeeper Test Suite (Rule 201).
 * Fails builds when forbidden mock datasets, fixture imports, or simulated timers
 * leak into operational code paths.
 */

function scanDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDir(fullPath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

test('DataIntegrity - No drone or UAV references exist in production codebase (Rule 11)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const srcFiles = scanDir(path.join(rootDir, 'src'));
  const serverFiles = scanDir(path.join(rootDir, 'server'));
  const allFiles = [...srcFiles, ...serverFiles];

  const violations: string[] = [];
  const droneRegex = /\b(drone|drones|uav|uavs|quadcopter|hexacopter)\b/i;

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (droneRegex.test(line)) {
        violations.push(`${path.relative(rootDir, filePath)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Discovered prohibited drone/UAV operational occurrences (Rule 11):\n${violations.join('\n')}`
  );
});

test('DataIntegrity - No simulated telephony auto-advancing timers exist (Rule 1, 8, 15, 189)', () => {
  const telephonyFilePath = path.resolve(__dirname, '../server/services/telephonyService.ts');
  const content = fs.readFileSync(telephonyFilePath, 'utf-8');

  assert.equal(
    content.includes('setTimeout'),
    false,
    'telephonyService.ts must NOT contain setTimeout auto-advancing simulation timers per Rule 189.'
  );
  assert.ok(
    content.includes('getProviderStatus'),
    'telephonyService.ts must implement honest provider status reporting.'
  );
});

test('DataIntegrity - No unsupported ~39% FRP attenuation calculation exists (Rule 14)', () => {
  const orbitalMathPath = path.resolve(__dirname, '../src/shared/orbitalMath.ts');
  const content = fs.readFileSync(orbitalMathPath, 'utf-8');

  assert.equal(
    content.includes('expectedFRPAttenuationPct'),
    false,
    'orbitalMath.ts must NOT calculate unsupported expectedFRPAttenuationPct per Rule 14.'
  );
  assert.ok(
    content.includes('nodalPrecessionDegDay'),
    'orbitalMath.ts must calculate physical nodal precession rate from J2 geopotential.'
  );
});

test('DataIntegrity - Weather adapter contains zero synthetic default values on error (Rule 3)', () => {
  const weatherAdapterPath = path.resolve(__dirname, '../server/adapters/weatherAdapter.ts');
  const content = fs.readFileSync(weatherAdapterPath, 'utf-8');

  assert.ok(
    content.includes('isAvailable: false'),
    'weatherAdapter.ts must explicitly set isAvailable: false on provider disruption.'
  );
  assert.equal(
    content.includes('temperatureC: 30.0'),
    false,
    'weatherAdapter.ts must not return synthetic fallback 30.0°C when unreachable.'
  );
});

test('DataIntegrity - Production store and data/store.json contain zero hardcoded production incidents (Rule P0.1)', async () => {
  const { ProductionStore } = await import('../server/db/store');
  const freshStore = new ProductionStore();
  const state = freshStore.createInitialOperationalState();

  assert.equal(state.incidents.length, 0, 'Production initial operational state must start with 0 incidents.');
  assert.equal(state.weather.length, 0, 'Production initial operational state must start with 0 weather stations.');
  assert.equal(state.news.length, 0, 'Production initial operational state must start with 0 news items.');
  assert.equal(state.casualtyReports.length, 0, 'Production initial operational state must start with 0 casualty reports.');
  assert.equal(state.agencyTasks.length, 0, 'Production initial operational state must start with 0 agency tasks.');
  assert.equal(state.routes.length, 0, 'Production initial operational state must start with 0 routes.');

  // Validate persisted data/store.json
  const storeJsonPath = path.resolve(__dirname, '../data/store.json');
  if (fs.existsSync(storeJsonPath)) {
    const raw = JSON.parse(fs.readFileSync(storeJsonPath, 'utf-8'));
    assert.equal(raw.incidents.length, 0, 'data/store.json must contain 0 hardcoded incidents in purified baseline.');
  }
});

test('DataIntegrity - Fire calendar contains zero silent regional substitution fallbacks (Rule P2.3)', async () => {
  const { computeRegionalBurningCalendarMath } = await import('../src/shared/fireCalendarMath');

  // Querying a region without data must return 0 records rather than substituting Nilgiris
  const emptyRegionCalendar = computeRegionalBurningCalendarMath('REG-NONEXISTENT-AREA');
  assert.equal(
    emptyRegionCalendar.monthlyRecords.length,
    0,
    'Fire calendar must return empty records for unmonitored regions without substituting Nilgiris data.'
  );
  assert.equal(
    emptyRegionCalendar.annualSummaries.length,
    0,
    'Fire calendar must return 0 annual summaries for empty regions.'
  );
});
