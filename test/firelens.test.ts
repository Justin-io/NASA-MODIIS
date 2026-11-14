import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decomposeObservingEffort,
  computeYearlySensorSummaries,
} from '../src/shared/observationDecomposition';
import { harmonizeObservations } from '../src/shared/intelligenceEngine';
import { CanonicalObservation, Mcd64BurnedAreaGroundTruth } from '../src/shared/canonicalSchema';
import fs from 'fs';
import path from 'path';

test('FireLens - decomposes observing effort vs actual burning on empirical dataset', () => {
  const jsonPath = path.resolve(process.cwd(), 'data', 'firelens_nilgiris_2019_2026.json');
  assert.ok(fs.existsSync(jsonPath), 'Frozen research dataset must exist on disk');

  const rawObs: CanonicalObservation[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.ok(rawObs.length >= 10000, `Dataset must contain >= 10,000 empirical observations, found ${rawObs.length}`);

  const mcdPath = path.resolve(process.cwd(), 'data', 'firelens_validation_mcd64a1.json');
  const mcdData: Mcd64BurnedAreaGroundTruth[] = JSON.parse(fs.readFileSync(mcdPath, 'utf8'));
  assert.ok(mcdData.length >= 12, 'Validation dataset must contain >= 12 months');

  const result = decomposeObservingEffort(rawObs, mcdData);

  // Validate presence and integrity of core metrics
  assert.ok(result.yearlySummaries.length >= 6, 'Must have summaries for all monitored years');
  assert.ok(result.decomposition.apparentGrowthRatePct > 0, 'Apparent hotspot count must show positive growth');
  assert.ok(result.decomposition.attributableToObservingEffortPct >= 50, 'Observing system expansion must account for >= 50% of apparent growth');
  assert.ok(result.decomposition.bootstrapConfidenceInterval95.iterations === 1000, 'Must run 1,000 bootstrap iterations');
  assert.ok(
    result.decomposition.bootstrapConfidenceInterval95.effortLowerPct <
    result.decomposition.bootstrapConfidenceInterval95.effortUpperPct,
    'Bootstrap 95% CI lower bound must be less than upper bound'
  );

  // Validate Terra MLST drift
  assert.ok(result.terraDriftMetrics.driftHours > 0.5, 'Terra equatorial crossing must demonstrate positive historical drift (earlier in day)');
});

test('FireLens - harmonizeObservations enforces strict temporal pass gating', () => {
  // Two observations in proximate space but separated by 4 hours (Morning Terra vs Afternoon Aqua)
  const obsMorning: any = {
    id: 'OBS-TERRA-01',
    sensor: 'MODIS_TERRA',
    timestamp: '2024-03-15T05:15:00Z', // ~10:45 LST
    lat: 11.450,
    lng: 76.700,
    brightnessKelvin: 325.0,
    frpMw: 18.5,
    confidencePct: 75,
    scanPixelKm: 1.1,
    trackPixelKm: 1.0,
    dayNight: 'D',
  };

  const obsAfternoon: any = {
    id: 'OBS-AQUA-01',
    sensor: 'MODIS_AQUA',
    timestamp: '2024-03-15T08:30:00Z', // ~14:00 LST (3h 15m later)
    lat: 11.452,
    lng: 76.702,
    brightnessKelvin: 345.0,
    frpMw: 42.0,
    confidencePct: 88,
    scanPixelKm: 1.0,
    trackPixelKm: 1.0,
    dayNight: 'D',
  };

  // Must NOT merge into single instantaneous event
  const cells = harmonizeObservations([obsMorning, obsAfternoon], 40, 30);
  assert.equal(cells.length, 2, 'Distinct overpass passes > 30 minutes apart must produce separate hypotheses');
});

test('FireLens - canonical observations preserve native confidence without lossy conversion', () => {
  const jsonPath = path.resolve(process.cwd(), 'data', 'firelens_nilgiris_2019_2026.json');
  const rawObs: CanonicalObservation[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const modisRecords = rawObs.filter((o) => o.sensor === 'MODIS');
  const viirsRecords = rawObs.filter((o) => o.sensor === 'VIIRS');

  assert.ok(modisRecords.length > 0, 'Must have MODIS records');
  assert.ok(viirsRecords.length > 0, 'Must have VIIRS records');

  // MODIS must have numeric confidence (0-100) or null
  for (const m of modisRecords.slice(0, 50)) {
    if (m.modisConfidencePct !== null) {
      assert.ok(typeof m.modisConfidencePct === 'number', 'MODIS confidence must be numeric');
      assert.ok(m.modisConfidencePct >= 0 && m.modisConfidencePct <= 100);
    }
  }

  // VIIRS must have native categorical strings ('low', 'nominal', 'high') or null
  for (const v of viirsRecords.slice(0, 50)) {
    if (v.viirsConfidenceCategory !== null) {
      assert.ok(
        ['low', 'nominal', 'high'].includes(v.viirsConfidenceCategory),
        `VIIRS confidence must be categorical ('low' | 'nominal' | 'high'), got ${v.viirsConfidenceCategory}`
      );
    }
  }
});

