import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { orbitalService } from '../server/services/orbitalService';
import { weatherAdapter } from '../server/adapters/weatherAdapter';
import { nasaEonetAdapter } from '../server/adapters/nasaEonet';

test('WebDatasetHarvest - verifies authoritative web data files and integrity', () => {
  const dataDir = path.resolve(process.cwd(), 'data');

  // 1. CelesTrak TLEs
  const tlePath = path.join(dataDir, 'celestrak_tles.json');
  assert.ok(fs.existsSync(tlePath), 'celestrak_tles.json must exist');
  const tles = JSON.parse(fs.readFileSync(tlePath, 'utf8'));
  assert.ok(tles.TERRA, 'TERRA TLE must exist');
  assert.ok(tles.AQUA, 'AQUA TLE must exist');
  assert.ok(tles.SUOMI_NPP, 'SUOMI_NPP TLE must exist');
  assert.ok(tles.NOAA_20, 'NOAA_20 TLE must exist');
  assert.ok(tles.NOAA_21, 'NOAA_21 TLE must exist');
  assert.match(tles.TERRA.line1, /^1 25994U/, 'Terra NORAD ID 25994 must match');

  // 2. NASA EONET Wildfires
  const eonetPath = path.join(dataDir, 'nasa_eonet_wildfires.json');
  assert.ok(fs.existsSync(eonetPath), 'nasa_eonet_wildfires.json must exist');
  const eonet = JSON.parse(fs.readFileSync(eonetPath, 'utf8'));
  assert.ok(Array.isArray(eonet) && eonet.length >= 20, 'EONET events must contain at least 20 active events');
  assert.ok(eonet[0].id.startsWith('EONET_'), 'Event ID must match EONET prefix');
  assert.ok(Array.isArray(eonet[0].latestCoordinates), 'Coordinates must be valid array');

  // 3. NIFC WFIGS Perimeters
  const nifcPath = path.join(dataDir, 'nifc_wfigs_perimeters.json');
  assert.ok(fs.existsSync(nifcPath), 'nifc_wfigs_perimeters.json must exist');
  const nifc = JSON.parse(fs.readFileSync(nifcPath, 'utf8'));
  assert.equal(nifc.type, 'FeatureCollection');
  assert.ok(Array.isArray(nifc.features) && nifc.features.length >= 5);
  assert.ok(nifc.features[0].properties.gisAcres > 0);

  // 4. Open-Meteo Weather Grid
  const weatherPath = path.join(dataDir, 'open_meteo_weather_grid.json');
  assert.ok(fs.existsSync(weatherPath), 'open_meteo_weather_grid.json must exist');
  const weatherGrid = JSON.parse(fs.readFileSync(weatherPath, 'utf8'));
  assert.ok(Array.isArray(weatherGrid) && weatherGrid.length >= 8);
  const nilgiriStation = weatherGrid.find((s: any) => s.stationId === 'AWS-NILGIRI-01');
  assert.ok(nilgiriStation, 'Nilgiri AWS must be present');
  assert.ok(Number.isFinite(nilgiriStation.temperatureC));
  assert.ok(Number.isFinite(nilgiriStation.soilMoisturePct));
  assert.ok(Number.isFinite(nilgiriStation.fuelDrynessPct));

  // 5. Grounded Real Incidents
  const incidents = nasaEonetAdapter.getGroundedIncidents();
  assert.ok(Array.isArray(incidents) && incidents.length >= 5);
  const nilgiriInc = incidents.find((i) => i.id === 'INC-NILGIRI-MASINAGUDI-2024');
  assert.ok(nilgiriInc, 'Masinagudi canonical incident must be present');
  assert.equal(nilgiriInc?.status, 'authority_confirmed_emergency');
  assert.ok(nilgiriInc?.observations.length >= 2);

  // 6. Orbital Live TLE Catalog
  const liveTles = orbitalService.getLiveTleCatalog();
  assert.ok(liveTles.TERRA.tle[0].startsWith('1 25994U'));

  // 7. Weather Adapter Monitored Stations
  const monitored = weatherAdapter.getAllMonitoredStations();
  assert.ok(monitored.length >= 8);
});
