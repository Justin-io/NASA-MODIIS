import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitalService } from '../server/services/orbitalService';

test('OrbitalService - satellite inventory contains major Earth observation platforms', () => {
  const satellites = orbitalService.getAllSatellites();
  assert.ok(satellites.length >= 10);

  const terra = orbitalService.getSatelliteById('TERRA');
  assert.ok(terra);
  assert.equal(terra?.agency, 'NASA / Earth Science Division');
  assert.equal(terra?.operationalStatus, 'orbital_drift_mode');

  const himawari = orbitalService.getSatelliteById('HIMAWARI_9');
  assert.ok(himawari);
  assert.equal(himawari?.orbitType, 'geostationary');
});

test('OrbitalService - evaluates Terra orbital drift and diurnal sampling bias accurately', () => {
  const impact2000 = orbitalService.evaluateTerraDriftImpact(2000);
  assert.equal(impact2000.driftMinutes, 0);

  const impact2026 = orbitalService.evaluateTerraDriftImpact(2026);
  assert.ok(impact2026.altitudeKm <= 695.0);
  assert.ok(impact2026.mlstHours < 9.5); // Crossed before 9:30 AM
  assert.ok(impact2026.driftMinutes >= 80);
  assert.ok(impact2026.nodalPrecessionDegDay > 0.98);
  assert.ok(impact2026.scientificAssessment.includes('diurnal'));
});

test('OrbitalService - viewing geometry calculation expands pixel footprint across scan', () => {
  const nadirGeom = orbitalService.computeViewingGeometry('TERRA', 0);
  assert.equal(nadirGeom.viewZenithAngleDeg, 0);
  assert.equal(nadirGeom.bowtieExpansionRatio, 1.0);

  const offNadirGeom = orbitalService.computeViewingGeometry('TERRA', 45);
  assert.ok(offNadirGeom.viewZenithAngleDeg > 45);
  assert.ok(offNadirGeom.bowtieExpansionRatio > 2.0);
  assert.ok(offNadirGeom.pixelFootprintKm2 > 2.0);
});

test('OrbitalService - observation opportunities include quality and clear sky predictions', () => {
  const opps = orbitalService.getObservationOpportunities('REG-NILGIRI');
  assert.ok(opps.length >= 3);
  const noaa = opps.find((o) => o.satelliteId === 'NOAA_20');
  assert.ok(noaa);
  assert.equal(noaa?.qualityStatus, 'OPTIMAL');
  assert.ok(noaa?.clearSkyProbabilityPct > 70);
});

test('OrbitalService - SGP4 orbital propagation accurately computes geodetic coordinates and distinguishes GEO from LEO (Rule P2.4)', () => {
  // 1. Polar Sun-Synchronous LEO (Terra)
  const terraState = orbitalService.propagateSatelliteState('TERRA', new Date('2026-10-31T12:00:00Z'));
  assert.equal(terraState.model, 'SGP4');
  assert.equal(terraState.isGeostationary, false);
  assert.ok(terraState.latitudeDeg >= -90 && terraState.latitudeDeg <= 90);
  assert.ok(terraState.longitudeDeg >= -180 && terraState.longitudeDeg <= 180);
  assert.ok(terraState.altitudeKm > 600 && terraState.altitudeKm < 800);

  // 2. Geostationary (Himawari-9)
  const himawariState = orbitalService.propagateSatelliteState('HIMAWARI_9', new Date('2026-10-31T12:00:00Z'));
  assert.equal(himawariState.model, 'GEOSTATIONARY_KINEMATICS');
  assert.equal(himawariState.isGeostationary, true);
  assert.equal(himawariState.latitudeDeg, 0.0);
  assert.equal(himawariState.longitudeDeg, 140.7);
  assert.equal(himawariState.altitudeKm, 35786.0);
});
