import test from 'node:test';
import assert from 'node:assert/strict';
import { NasaFirmsAdapter } from '../server/adapters/nasaFirms';

test('NasaFirmsAdapter - reports all supported operational sensors and truthful config status', () => {
  const adapter = new NasaFirmsAdapter();
  const status = adapter.getStatus();

  assert.equal(status.provider, 'NASA FIRMS Near-Real-Time');
  assert.equal(status.configured, false); // No key in test env
  assert.ok(status.supportedSensors.length >= 4);
  assert.ok(status.supportedSensors.some((s) => s.includes('NOAA21')));
  assert.ok(status.supportedSensors.some((s) => s.includes('NOAA20')));
  assert.ok(status.supportedSensors.some((s) => s.includes('MODIS')));
});

test('NasaFirmsAdapter - returns honest unconfigured state without throwing', async () => {
  const adapter = new NasaFirmsAdapter();
  const result = await adapter.fetchObservations({
    sensor: 'VIIRS_NOAA20_NRT',
    areaBbox: [76.5, 11.2, 77.1, 11.7],
  });

  assert.equal(result.isLive, false);
  assert.equal(result.queryType, 'area_bbox');
  assert.equal(result.observations.length, 0);
  assert.ok(result.providerNotice.includes('NASA_FIRMS_MAP_KEY not supplied'));
});

test('NasaFirmsAdapter - parses FIRMS CSV correctly with deduplication and sensor mapping', () => {
  const adapter = new NasaFirmsAdapter();
  const sampleCsv = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,frp,daynight
11.4185,76.7042,342.5,0.375,0.375,2026-10-31,0842,N20,nominal,42.5,D
11.4185,76.7042,342.5,0.375,0.375,2026-10-31,0842,N20,nominal,42.5,D
11.4250,76.7120,328.0,1.0,1.0,2026-10-31,0915,Aqua,85,28.0,D
11.3900,76.6800,355.2,0.375,0.375,2026-10-31,0850,N21,high,54.0,D`;

  const parsed = adapter.parseFirmsCsv(sampleCsv, 'VIIRS_NOAA20_NRT');

  // Second row is an exact duplicate and must be discarded
  assert.equal(parsed.length, 3);

  // NOAA-20 detection
  assert.equal(parsed[0].satellite, 'N20');
  assert.equal(parsed[0].lat, 11.4185);
  assert.equal(parsed[0].lng, 76.7042);
  // VIIRS categorical confidence preserved per DATA-05
  assert.equal(parsed[0].viirsConfidenceCategory, 'nominal');

  // Aqua MODIS detection
  assert.equal(parsed[1].satellite, 'Aqua');
  assert.equal(parsed[1].frpMw, 28.0);
  assert.equal(parsed[1].scanKm, 1.0);

  // NOAA-21 detection
  assert.equal(parsed[2].satellite, 'N21');
  assert.equal(parsed[2].viirsConfidenceCategory, 'high');
});

test('NasaFirmsAdapter - raw observations stored independently with full provenance without attaching to hardcoded incidents (Rule P2.1)', async () => {
  const { globalStore } = await import('../server/db/store');
  const sampleObs = [
    {
      id: 'OBS-TEST-01',
      sourceProvider: 'NASA_FIRMS' as const,
      sourceProductId: 'VIIRS_NOAA20_NRT',
      productLayer: 'VIIRS_375M' as const,
      satellite: 'N20',
      sensor: 'VIIRS',
      acquisitionTimestampUtc: '2026-10-31T08:42:00Z',
      ingestionTimestampUtc: '2026-10-31T08:45:00Z',
      lat: 11.4185,
      lng: 76.7042,
      brightnessKelvin: 342.5,
      brightness2Kelvin: null,
      frpMw: 42.5,
      scanKm: 0.375,
      trackKm: 0.375,
      modisConfidencePct: null,
      viirsConfidenceCategory: 'nominal' as const,
      dayNight: 'D' as const,
      version: '2.0NRT',
      type: null,
    },
  ];

  await globalStore.addRawObservations(sampleObs);
  const stored = globalStore.getRawObservations();
  assert.ok(stored.some((o) => o.id === 'OBS-TEST-01'));
  // Ensure incidents array was NOT automatically populated with a fake incident
  assert.equal(globalStore.getIncidents().length, 0);
});
