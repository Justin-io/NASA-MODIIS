import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePixelFootprintArea,
  haversineDistanceKm,
  hydrateTier1Observations,
  matchTier2CrossSensor,
  clusterTier3PhysicalFireEvents,
  generateTier4Statistics,
} from '../src/shared/fireReconciliationEngine';
import { CanonicalObservation } from '../src/shared/canonicalSchema';

function createMockCanonicalObservation(overrides: Partial<CanonicalObservation>): CanonicalObservation {
  return {
    id: 'OBS-TEST-1',
    granuleOrSourceUrl: 'https://firms.modaps.eosdis.nasa.gov',
    queryParams: {},
    provenanceVersion: 'NASA_FIRMS_COL6.1',
    rawPayloadChecksumSha256: 'abc123hash',
    acquisitionTimestampUtc: '2024-03-15T05:30:00Z',
    ingestionTimestampUtc: '2024-03-15T06:00:00Z',
    sensor: 'MODIS',
    satellite: 'Terra',
    productLayer: 'MODIS_1KM',
    orbitPass: 'Descending',
    latitude: 11.40,
    longitude: 76.70,
    dayNight: 'D',
    localSolarTimeHours: 10.5,
    viewZenithBin: 'nadir_0_20',
    viewZenithAngleDeg: 10.0,
    scanKm: 1.0,
    trackKm: 1.0,
    pixelAreaKm2: 0.785,
    frpMw: 25.0,
    brightnessKelvin: 325.5,
    backgroundBrightnessKelvin: 298.0,
    modisConfidencePct: 85,
    viirsConfidenceCategory: null,
    qaCloudFlag: 'cloud_free',
    fireType: 0,
    studyAoi: 'REG-NILGIRI',
    ...overrides,
  };
}

test('FireReconciliationEngine - Tier 1 calculates accurate pixel footprint area', () => {
  const nadirModisArea = calculatePixelFootprintArea(1.0, 1.0);
  assert.ok(Math.abs(nadirModisArea - 0.7854) < 0.001);

  const viirsArea = calculatePixelFootprintArea(0.375, 0.375);
  assert.ok(Math.abs(viirsArea - 0.1104) < 0.001);

  const obs = [createMockCanonicalObservation({ scanKm: 1.2, trackKm: 1.1 })];
  const tier1 = hydrateTier1Observations(obs);
  assert.strictEqual(tier1[0].tier, 1);
  assert.ok(tier1[0].footprintAreaKm2 > 0);
});

test('FireReconciliationEngine - Tier 2 matches contemporaneous MODIS and VIIRS detections', () => {
  const modis = createMockCanonicalObservation({
    id: 'OBS-MODIS-1',
    sensor: 'MODIS',
    satellite: 'Aqua',
    latitude: 11.406,
    longitude: 76.693,
    acquisitionTimestampUtc: '2024-03-15T08:00:00Z',
    frpMw: 30.0,
    brightnessKelvin: 330.0,
  });

  const viirsCoincident = createMockCanonicalObservation({
    id: 'OBS-VIIRS-1',
    sensor: 'VIIRS',
    satellite: 'Suomi-NPP',
    latitude: 11.410,
    longitude: 76.695,
    acquisitionTimestampUtc: '2024-03-15T08:12:00Z', // 12 mins apart
    scanKm: 0.375,
    trackKm: 0.375,
    frpMw: 18.5,
    brightnessKelvin: 334.2,
    modisConfidencePct: null,
    viirsConfidenceCategory: 'nominal',
  });

  const viirsDistantTime = createMockCanonicalObservation({
    id: 'OBS-VIIRS-FAR',
    sensor: 'VIIRS',
    satellite: 'NOAA-20',
    latitude: 11.407,
    longitude: 76.694,
    acquisitionTimestampUtc: '2024-03-15T12:00:00Z', // 4 hours apart
    frpMw: 12.0,
  });

  const matches = matchTier2CrossSensor([modis, viirsCoincident, viirsDistantTime]);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].tier, 2);
  assert.strictEqual(matches[0].matchClassification, 'COINCIDENT_OVERPASS');
  assert.ok(matches[0].temporalDeltaMinutes <= 15);
  assert.ok(matches[0].spatialDistanceKm < 1.0);
  assert.ok(matches[0].frpRatioViirsToModis !== null && matches[0].frpRatioViirsToModis < 1.0);
  assert.ok(matches[0].brightnessDeltaK !== null && matches[0].brightnessDeltaK > 0);
});

test('FireReconciliationEngine - Tier 3 clusters coherent multi-pass fire events and computes perimeters', () => {
  const obsCluster = [
    createMockCanonicalObservation({
      id: 'OBS-EVT-1',
      latitude: 11.400,
      longitude: 76.690,
      acquisitionTimestampUtc: '2024-03-15T05:00:00Z',
      frpMw: 45.0,
    }),
    createMockCanonicalObservation({
      id: 'OBS-EVT-2',
      latitude: 11.405,
      longitude: 76.694,
      acquisitionTimestampUtc: '2024-03-15T08:15:00Z',
      frpMw: 80.0,
      sensor: 'VIIRS',
      satellite: 'Suomi-NPP',
    }),
    createMockCanonicalObservation({
      id: 'OBS-EVT-3',
      latitude: 11.412,
      longitude: 76.698,
      acquisitionTimestampUtc: '2024-03-16T05:30:00Z', // Next day pass (+21.25 hrs)
      frpMw: 25.0,
    }),
  ];

  const distantObs = createMockCanonicalObservation({
    id: 'OBS-DISCONNECTED',
    latitude: 11.850, // Far away
    longitude: 77.200,
    acquisitionTimestampUtc: '2024-03-15T05:00:00Z',
  });

  const events = clusterTier3PhysicalFireEvents([...obsCluster, distantObs]);
  assert.strictEqual(events.length, 2);

  const mainEvent = events.find((e) => e.observationCount === 3);
  assert.ok(mainEvent);
  assert.strictEqual(mainEvent.tier, 3);
  assert.strictEqual(mainEvent.peakFrpMw, 80.0);
  assert.ok(mainEvent.durationHours > 20);
  assert.ok(mainEvent.estimatedPerimeterKm > 0);
  assert.strictEqual(mainEvent.sensorBreakdown.modisCount, 2);
  assert.strictEqual(mainEvent.sensorBreakdown.viirsCount, 1);
  assert.strictEqual(mainEvent.status, 'EXTINGUISHED');
  assert.strictEqual(mainEvent.footprintClassification, 'OBSERVATION_CLUSTER_HULL');
  assert.strictEqual(mainEvent.estimatedThermalEnergyGWh, null);
  assert.ok(mainEvent.observedSnapshotEnergyMJ > 0);
  assert.ok(mainEvent.boundingHullPerimeterKm > 0);
  assert.ok(mainEvent.samplingDisclaimer.includes('ground-truth fire perimeters'));
});

test('FireReconciliationEngine - Tier 4 aggregates statistics with effort index and Z-scores', () => {
  const observations: CanonicalObservation[] = [];
  for (let i = 0; i < 80; i++) {
    observations.push(
      createMockCanonicalObservation({
        id: `OBS-BULK-${i}`,
        sensor: i < 20 ? 'MODIS' : 'VIIRS',
        frpMw: 15 + (i % 10),
      })
    );
  }

  const stats = generateTier4Statistics(observations, '2024-03', 'REG-NILGIRI', 50, 15);
  assert.strictEqual(stats.tier, 4);
  assert.strictEqual(stats.rawHotspotCount, 80);
  assert.ok(stats.effortAdjustedHotspotRate < 80); // Normalized down by effort
  assert.strictEqual(stats.sensorShare.modisPct, 25.0);
  assert.strictEqual(stats.sensorShare.viirsPct, 75.0);
  assert.ok(stats.seasonalAnomalyZScore !== undefined);
  assert.ok(stats.percentileRank >= 0 && stats.percentileRank <= 100);
  assert.ok(stats.uncertaintyInterval95[0] <= stats.effortAdjustedHotspotRate);
  assert.ok(stats.uncertaintyInterval95[1] >= stats.effortAdjustedHotspotRate);
});
