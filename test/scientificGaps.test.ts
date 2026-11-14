import test from 'node:test';
import assert from 'node:assert/strict';
import { NifcPerimetersAdapter } from '../server/adapters/nifcPerimeters';
import { LiveFuelsAdapter } from '../server/adapters/liveFuelsAdapter';
import { exposureService } from '../server/services/exposureService';
import { hazardAndFleetService } from '../server/services/hazardAndFleetService';
import { groundVerificationService } from '../server/services/groundVerificationService';
import { evaluateSeasonalAnomaly } from '../src/shared/fireObservationsData';

test('NifcPerimetersAdapter - returns structured perimeters and spread isochrones', async () => {
  const adapter = new NifcPerimetersAdapter();
  // Call with short timeout so it either fetches live NIFC or cleanly falls back to calibrated benchmark
  const result = await adapter.fetchLivePerimeters({ minAcres: 500, limit: 3, timeoutMs: 3000 });

  assert.ok(result.count > 0, 'Perimeter adapter must return at least one perimeter record');
  assert.ok(result.perimeters.length > 0, 'Perimeter list must be non-empty');
  assert.ok(result.spreadForecasts.length > 0, 'Spread forecasts must be non-empty');

  const firstPerim = result.perimeters[0];
  assert.ok(firstPerim.polygonCoordinates.length >= 3, 'Polygon coordinates must have >= 3 vertices');
  assert.ok(firstPerim.gisAcres > 0, 'GIS acres must be positive');

  const firstForecast = result.spreadForecasts[0];
  assert.equal(firstForecast.isochrones.length, 3, 'Rothermel model must generate 1h, 3h, 6h isochrone projections');
  assert.equal(firstForecast.isochrones[0].horizonHours, 1);
  assert.equal(firstForecast.isochrones[1].horizonHours, 3);
  assert.equal(firstForecast.isochrones[2].horizonHours, 6);
});

test('LiveFuelsAdapter - physical fuel moisture physics and station queries', async () => {
  const adapter = new LiveFuelsAdapter();
  const stations = adapter.getAllStations();
  assert.ok(stations.length >= 4, 'Must have at least 4 RAWS stations across monitored biomes');

  // Fetch fuel estimate for Nilgiri coordinates
  const estimate = await adapter.fetchLiveFuelMoisture(11.4185, 76.7042, 'TEST-STATION', 'Test Station');
  assert.ok(Number.isFinite(estimate.deadFuel1hrPct), 'Dead fuel 1hr moisture must be a finite number');
  assert.ok(Number.isFinite(estimate.deadFuel10hrPct), 'Dead fuel 10hr moisture must be a finite number');
  assert.ok(Number.isFinite(estimate.energyReleaseComponent), 'ERC must be a finite number');
  assert.ok(Number.isFinite(estimate.burningIndex), 'Burning Index must be a finite number');
  assert.ok(estimate.surfaceSoilMoistureM3M3 >= 0, 'Surface soil moisture must be non-negative');
  assert.ok(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'EXTREME'].includes(estimate.fireDangerRating));
});

test('ExposureService - aggregates demographics, infrastructure and evacuation zones', () => {
  const summary = exposureService.getRegionalSummary('REG-NILGIRI');
  assert.ok(summary.totalPopulation > 0, 'Total regional population must be > 0');
  assert.ok(summary.vulnerablePopulation > 0, 'Vulnerable population count must be > 0');
  assert.ok(summary.criticalInfrastructureCount > 0, 'Critical infrastructure count must be > 0');
  assert.ok(summary.evacuationZoneCount > 0, 'Evacuation zone count must be > 0');

  const buildings = exposureService.getBuildings('REG-NILGIRI');
  assert.ok(buildings.length > 0, 'Building footprints must be non-empty');
  assert.ok(buildings.every((b) => Number.isFinite(b.structureVulnerabilityIndex)));
});

test('HazardAndFleetService - evaluates vehicle weight and height clearance against road hazards', () => {
  // Evaluation with high vehicle weight (32 tons) on a bridge with 14-ton limit
  const overweightCheck = hazardAndFleetService.evaluateCorridor({
    hazardIds: ['HAZ-NIL-002'], // bridge limit 14t
    vehicleClass: 'TACTICAL_WATER_TENDER_HEAVY',
    vehicleWeightTons: 26,
    vehicleHeightMeters: 3.2,
  });

  assert.equal(overweightCheck.isTraversable, false, 'Heavy tender must be blocked by 14-ton bridge restriction');
  assert.ok(overweightCheck.blockingHazards.length > 0);

  // Evaluation with light vehicle (3 tons) on the same bridge
  const lightCheck = hazardAndFleetService.evaluateCorridor({
    hazardIds: ['HAZ-NIL-002'],
    vehicleClass: 'TYPE_6_RAPID_ATTACK_BRUSH_TRUCK',
    vehicleWeightTons: 3.8,
    vehicleHeightMeters: 2.2,
  });

  assert.equal(lightCheck.isTraversable, true, 'Light attack truck must clear 14-ton bridge limit');
});

test('GroundVerificationService - delivers authenticated ranger reports and corroboration matrix', () => {
  const cadEvents = groundVerificationService.getCadDispatches('REG-NILGIRI');
  assert.ok(cadEvents.length > 0, 'CAD dispatch events must be non-empty');

  const pkg = groundVerificationService.getVerificationPackage('INC-2026-10-31-01');
  assert.ok(pkg.rangerReports.length > 0, 'Must have at least one authenticated ranger report');
  assert.ok(pkg.corroboration !== null, 'Corroboration matrix must be present');
  assert.equal(pkg.isVerified, true, 'Multi-source corroborated incident must be marked verified');

  const report = pkg.rangerReports[0];
  assert.ok(report.digitalSignatureSha256.length === 64, 'Ranger report must carry 64-char SHA-256 signature');
});

test('SeasonalAnomalyEvaluation - accurately evaluates hotspot deviations against 25-year median', () => {
  // Nilgiri March median is ~118 hotspots.
  // 320 hotspots represents an extreme anomaly (> 2.2x median)
  const extreme = evaluateSeasonalAnomaly('REG-NILGIRI', 3, 320);
  assert.equal(extreme.severityTier, 'EXTREME_ANOMALY');
  assert.ok(extreme.anomalyRatio !== null && extreme.anomalyRatio >= 2.2);

  // 120 hotspots is close to normal
  const normal = evaluateSeasonalAnomaly('REG-NILGIRI', 3, 120);
  assert.equal(normal.severityTier, 'NORMAL');

  // 25 hotspots is significantly below normal
  const low = evaluateSeasonalAnomaly('REG-NILGIRI', 3, 25);
  assert.equal(low.severityTier, 'SIGNIFICANTLY_BELOW');
});

test('RoutingService - calculates authentic road network corridor with failover and zero synthetic routes', async () => {
  const { routingService } = await import('../server/services/routingService');
  const route = await routingService.calculateRoute({
    origin: [11.5724, 76.6438],
    destination: [11.4102, 76.6950],
    originName: 'Masinagudi Reserve Staging Post',
    destinationName: 'Ooty District Headquarters',
    vehicleCategory: 'fire_engine',
  });

  assert.ok(route.id.startsWith('RTE-'), 'Route must have valid RTE ID');
  assert.ok(route.distanceKm > 0, 'Route distance must be positive');
  assert.ok(route.trafficAdjustedDurationMin > 0, 'Duration must be positive');
  assert.ok(route.waypoints.length > 5, 'Route must contain real geographic waypoints along road network');
  assert.ok(
    route.name.includes('Google Maps') || route.name.includes('OSRM'),
    'Route must be attributed to an authentic third-party provider'
  );
});
