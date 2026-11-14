import test from 'node:test';
import assert from 'node:assert/strict';
import {
  harmonizeObservations,
  evaluateIncidentClassification,
  canTransitionDispatchStatus,
  rankEmergencyRoutes,
  simulateScenarioOutcome,
  computeGeometricFireSpreadProjection,
  filterTemporalEvidenceByCutoff,
  aggregateIncidentHorizontalTimeline,
} from './intelligenceEngine';
import {
  FIXTURE_PRIMARY_INCIDENT,
  FIXTURE_INCIDENTS_LIST,
} from '../../test/fixtures/baselineIncident';
import {
  SatelliteObservation,
  RouteOption,
  TemporalEvidenceEvent,
} from './types';

test('harmonizeObservations merges proximate MODIS and VIIRS detections and reduces uncertainty', () => {
  const sampleObs: SatelliteObservation[] = [
    {
      id: 'OBS-1',
      sensor: 'MODIS_AQUA',
      timestamp: '2026-10-31T08:15:00Z',
      lat: 11.412,
      lng: 76.695,
      brightnessKelvin: 334.2,
      frpMw: 62.0,
      confidencePct: 82,
      scanPixelKm: 1.0,
      trackPixelKm: 1.0,
      dayNight: 'D',
      orbitPass: 'Ascending #4102',
    },
    {
      id: 'OBS-2',
      sensor: 'VIIRS_SNPP',
      timestamp: '2026-10-31T08:42:00Z',
      lat: 11.414,
      lng: 76.697,
      brightnessKelvin: 358.9,
      frpMw: 84.5,
      confidencePct: 96,
      scanPixelKm: 0.375,
      trackPixelKm: 0.375,
      dayNight: 'D',
      orbitPass: 'Ascending #1084',
    },
  ];

  const cells = harmonizeObservations(sampleObs, 40);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].observationCount, 2);
  assert.equal(cells[0].contributingSensors.length, 2);
  assert.ok(cells[0].uncertaintyRadiusMeters < 375);
  assert.ok(cells[0].harmonizedFrpMw > 62 && cells[0].harmonizedFrpMw < 85);
  assert.ok(cells[0].historicalAnomalyRatio > 1.5);
});

test('evaluateIncidentClassification never promotes unverified anomaly to confirmed emergency', () => {
  const singlePass = evaluateIncidentClassification({
    satelliteCount: 1,
    independentSensorsCount: 1,
    corroboratedNewsOrWeather: false,
    fieldRangerConfirmed: false,
    authorityEmergencyDeclared: false,
  });
  assert.equal(singlePass, 'satellite_thermal_anomaly');

  const multiSensor = evaluateIncidentClassification({
    satelliteCount: 3,
    independentSensorsCount: 2,
    corroboratedNewsOrWeather: true,
    fieldRangerConfirmed: false,
    authorityEmergencyDeclared: false,
  });
  assert.equal(multiSensor, 'independently_corroborated');

  const authorityConfirmed = evaluateIncidentClassification({
    satelliteCount: 4,
    independentSensorsCount: 2,
    corroboratedNewsOrWeather: true,
    fieldRangerConfirmed: true,
    authorityEmergencyDeclared: true,
  });
  assert.equal(authorityConfirmed, 'authority_confirmed_emergency');
});

test('canTransitionDispatchStatus blocks completion without authorized service integration', () => {
  const draftToApproval = canTransitionDispatchStatus(
    'draft',
    'awaiting_dispatcher_approval',
    false
  );
  assert.equal(draftToApproval.allowed, true);

  const unauthorizedComplete = canTransitionDispatchStatus(
    'on_scene',
    'completed',
    false
  );
  assert.equal(unauthorizedComplete.allowed, false);

  const authorizedComplete = canTransitionDispatchStatus(
    'on_scene',
    'completed',
    true
  );
  assert.equal(authorizedComplete.allowed, true);
});

test('rankEmergencyRoutes switches recommendation when primary corridor is blocked', () => {
  const routes: RouteOption[] = [
    {
      id: 'ROUTE-PRI-01',
      name: 'NH-181 Coonoor Ghat Primary Corridor',
      isPrimary: true,
      originName: 'Ooty Fire Station HQ',
      destinationName: 'Sector 4 Staging Point',
      vehicleAllowed: ['ambulance', 'fire_engine', 'rescue_vehicle', 'logistics_vehicle'],
      distanceKm: 18.4,
      baseDurationMin: 19,
      trafficAdjustedDurationMin: 21,
      confidencePct: 92,
      lastUpdated: '2026-10-31T11:10:00Z',
      hazardProximityKm: 2.1,
      roadRestrictions: [],
      reportedBlockages: [],
      recommendationReason: 'Direct arterial grade',
      waypoints: [[11.41, 76.7], [11.38, 76.75]],
    },
    {
      id: 'ROUTE-ALT-02',
      name: 'Kotagiri Eastern Ridge Bypass',
      isPrimary: false,
      originName: 'Ooty Fire Station HQ',
      destinationName: 'Sector 4 Staging Point',
      vehicleAllowed: ['ambulance', 'fire_engine', 'rescue_vehicle', 'logistics_vehicle'],
      distanceKm: 26.8,
      baseDurationMin: 31,
      trafficAdjustedDurationMin: 34,
      confidencePct: 89,
      lastUpdated: '2026-10-31T11:10:00Z',
      hazardProximityKm: 6.4,
      roadRestrictions: [],
      reportedBlockages: [],
      recommendationReason: 'Upwind of thermal plume',
      waypoints: [[11.41, 76.7], [11.43, 76.82]],
    },
  ];

  const normalRanking = rankEmergencyRoutes(routes, 'fire_engine', false);
  assert.equal(normalRanking[0].id, 'ROUTE-PRI-01');
  assert.equal(normalRanking[0].isRecommended, true);

  const blockedRanking = rankEmergencyRoutes(routes, 'fire_engine', true);
  assert.equal(blockedRanking[0].id, 'ROUTE-ALT-02');
  assert.equal(blockedRanking[0].isRecommended, true);
});

test('simulateScenarioOutcome marks output as simulation and scales spread with wind vs rain', () => {
  const highWind = simulateScenarioOutcome(140, 28, 82, {
    windSpeedDeltaKmh: 20,
    windShiftDeg: 45,
    rainfallMmHr: 0,
    primaryRoadClosed: true,
    additionalCasualties: 2,
    waterSupplyDepletedPct: 50,
    secondaryIgnitionActive: true,
    satellitePassDelayed: true,
  });

  const heavyRain = simulateScenarioOutcome(140, 28, 82, {
    windSpeedDeltaKmh: -10,
    windShiftDeg: 0,
    rainfallMmHr: 12,
    primaryRoadClosed: false,
    additionalCasualties: 0,
    waterSupplyDepletedPct: 0,
    secondaryIgnitionActive: false,
    satellitePassDelayed: false,
  });

  assert.equal(highWind.isSimulated, true);
  assert.ok(highWind.projectedSpreadRateHaHr > heavyRain.projectedSpreadRateHaHr);
  assert.equal(highWind.recommendedRouteId, 'ROUTE-ALT-02');
  assert.ok(highWind.uncertaintyBandPct > heavyRain.uncertaintyBandPct);
});

test('computeGeometricFireSpreadProjection increases elliptical eccentricity and spread rate with wind vector and lower relative humidity', () => {
  const aridHighWind = computeGeometricFireSpreadProjection({
    baseWindKmh: 34,
    windSpeedDeltaKmh: 15,
    baseWindDirectionDeg: 65,
    windShiftDeg: 10,
    fuelMoisturePct: 9,
    relativeHumidityPct: 14,
    rainfallMmHr: 0,
    baseAreaHa: 185,
  });

  const humidLowWind = computeGeometricFireSpreadProjection({
    baseWindKmh: 34,
    windSpeedDeltaKmh: -15,
    baseWindDirectionDeg: 65,
    windShiftDeg: 10,
    fuelMoisturePct: 26,
    relativeHumidityPct: 72,
    rainfallMmHr: 6,
    baseAreaHa: 185,
  });

  assert.equal(aridHighWind.isSimulated, true);
  assert.equal(aridHighWind.isochrones.length, 3);
  assert.ok(aridHighWind.lengthToBreadthRatio > humidLowWind.lengthToBreadthRatio);
  assert.ok(aridHighWind.headFireRateMMin > humidLowWind.headFireRateMMin);
  assert.ok(aridHighWind.vaporPressureDeficitKpa > humidLowWind.vaporPressureDeficitKpa);
  assert.ok(
    aridHighWind.isochrones[2].semiMajorKm > humidLowWind.isochrones[2].semiMajorKm
  );
  assert.equal(aridHighWind.propagationBearingDeg, (65 + 10 + 180) % 360);
});

test('filterTemporalEvidenceByCutoff filters events chronologically and computes modality counts', () => {
  const sampleEvents: TemporalEvidenceEvent[] = [
    {
      id: 'TEV-1',
      timestampUtc: '06:14 UTC',
      minutesFromStart: 14,
      modality: 'sensor_telemetry',
      title: 'MODIS Terra Pass',
      sourceUnit: 'MODIS Terra',
      linkedNodeId: 'EV-SAT-01',
      verification: 'verified',
      confidencePct: 81,
      coordinates: { lat: 11.416, lng: 76.708 },
      metricLabel: 'FRP',
      metricValue: '64.2 MW',
      summary: 'Initial thermal anomaly.',
    },
    {
      id: 'TEV-2',
      timestampUtc: '08:30 UTC',
      minutesFromStart: 150,
      modality: 'incident_report',
      title: 'Ranger Visual Report',
      sourceUnit: 'Beat #FD-882',
      linkedNodeId: 'EV-FLD-01',
      verification: 'verified',
      confidencePct: 98,
      coordinates: { lat: 11.418, lng: 76.704 },
      metricLabel: 'Flame Length',
      metricValue: '6.0 m',
      summary: 'Ground patrol visual confirmation.',
    },
    {
      id: 'TEV-3',
      timestampUtc: '09:50 UTC',
      minutesFromStart: 230,
      modality: 'satellite_observation',
      title: 'VIIRS Overpass Confirmation',
      sourceUnit: 'VIIRS NOAA-20',
      linkedNodeId: 'EV-HYP-01',
      verification: 'verified',
      confidencePct: 96,
      coordinates: { lat: 11.417, lng: 76.705 },
      metricLabel: 'Core Temp',
      metricValue: '642 °C',
      summary: 'Radiometric crown mosaic.',
    },
  ];

  const earlySlice = filterTemporalEvidenceByCutoff(sampleEvents, 160, 'all');
  assert.equal(earlySlice.visibleEvents.length, 2);
  assert.deepEqual(earlySlice.activeNodeIds, ['EV-SAT-01', 'EV-FLD-01']);
  assert.equal(earlySlice.modalityCounts.sensor_telemetry, 1);
  assert.equal(earlySlice.modalityCounts.incident_report, 1);
  assert.equal(earlySlice.modalityCounts.satellite_observation, 0);

  const satOnly = filterTemporalEvidenceByCutoff(
    sampleEvents,
    300,
    'satellite_observation'
  );
  assert.equal(satOnly.visibleEvents.length, 1);
  assert.equal(satOnly.visibleEvents[0].id, 'TEV-3');
});

test('aggregateIncidentHorizontalTimeline aggregates satellite detections, field reports, and sensor alerts chronologically', () => {
  const primaryIncident = FIXTURE_PRIMARY_INCIDENT;
  const aggregated = aggregateIncidentHorizontalTimeline(primaryIncident, 'all', 1440);

  assert.ok(aggregated.allItems.length >= 8);
  assert.ok(aggregated.categoryCounts.satellite_detection >= 4);
  assert.ok(aggregated.categoryCounts.field_report >= 2);
  assert.ok(aggregated.categoryCounts.sensor_alert >= 2);

  // Verify chronological ordering and horizontal track positions
  for (let i = 1; i < aggregated.allItems.length; i++) {
    assert.ok(
      aggregated.allItems[i].minutesFromDayStart >=
        aggregated.allItems[i - 1].minutesFromDayStart
    );
    assert.ok(
      aggregated.allItems[i].horizontalPositionPct >= 6 &&
        aggregated.allItems[i].horizontalPositionPct <= 94
    );
  }

  const satOnly = aggregateIncidentHorizontalTimeline(
    primaryIncident,
    'satellite_detection',
    1440
  );
  assert.equal(
    satOnly.visibleItems.length,
    aggregated.categoryCounts.satellite_detection
  );
  assert.ok(
    satOnly.visibleItems.every((item) => item.category === 'satellite_detection')
  );
});

test('computeTslEarthSolarState computes day/twilight/night terminator transitions matching webgpu_tsl_earth shader math', async () => {
  const { computeTslEarthSolarState } = await import('./intelligenceEngine');

  // Sun aligned with region normal -> full daylit hemisphere
  const daylit = computeTslEarthSolarState({
    sunPhiRad: Math.PI / 2,
    sunThetaRad: 0.85,
    globeRotationYRad: -2.92,
    globeRotationXRad: 0.2,
    regionLatDeg: 11.41,
    regionLngDeg: 76.7,
  });

  // Sun opposite to region normal -> nocturnal city-light hemisphere
  const nocturnal = computeTslEarthSolarState({
    sunPhiRad: Math.PI / 2,
    sunThetaRad: 0.85 + Math.PI,
    globeRotationYRad: -2.92,
    globeRotationXRad: 0.2,
    regionLatDeg: 11.41,
    regionLngDeg: 76.7,
  });

  assert.equal(daylit.sunDirection.length, 3);
  assert.ok(daylit.dayStrength > nocturnal.dayStrength);
  assert.ok(nocturnal.cityLightWeight > daylit.cityLightWeight);
  assert.equal(daylit.illuminationPhase, 'Daylit Hemisphere');
  assert.equal(nocturnal.illuminationPhase, 'Nocturnal City-Light Hemisphere');
});

test('latLngToCartesian and cartesianToLatLng accurately invert 3D globe click-to-pin coordinates', async () => {
  const { latLngToCartesian, cartesianToLatLng } = await import(
    './intelligenceEngine'
  );

  const testPoints = [
    { lat: 11.4185, lng: 76.7042 }, // Nilgiris
    { lat: 39.9921, lng: -120.8031 }, // Sierra Basin
    { lat: 37.5102, lng: 22.3712 }, // Arcadia
    { lat: -23.5505, lng: -46.6333 }, // Southern Hemisphere
  ];

  for (const pt of testPoints) {
    const [x, y, z] = latLngToCartesian(pt.lat, pt.lng, 1.42);
    const recovered = cartesianToLatLng(x, y, z);
    assert.ok(Math.abs(recovered.lat - pt.lat) < 0.01);
    assert.ok(Math.abs(recovered.lng - pt.lng) < 0.01);
  }
});

test('computeHotspotMarkerVisuals scales 3D NASA MODIS/VIIRS markers by FRP intensity and filters by sensor', async () => {
  const { computeHotspotMarkerVisuals } = await import('./intelligenceEngine');

  const allHotspots = computeHotspotMarkerVisuals(FIXTURE_INCIDENTS_LIST, 'ALL', 1.0);
  const viirsOnly = computeHotspotMarkerVisuals(
    FIXTURE_INCIDENTS_LIST,
    'VIIRS_ONLY',
    1.0
  );
  const modisOnly = computeHotspotMarkerVisuals(
    FIXTURE_INCIDENTS_LIST,
    'MODIS_ONLY',
    1.0
  );
  const boostedScale = computeHotspotMarkerVisuals(
    FIXTURE_INCIDENTS_LIST,
    'ALL',
    1.8
  );

  assert.ok(allHotspots.totalCount >= 4);
  assert.equal(
    allHotspots.totalCount,
    viirsOnly.totalCount + modisOnly.totalCount
  );
  assert.ok(viirsOnly.markers.every((m) => m.sensorFamily === 'VIIRS'));
  assert.ok(modisOnly.markers.every((m) => m.sensorFamily === 'MODIS'));

  // Verify higher FRP markers have taller pillarHeight than lower FRP markers
  const extremeMarker = allHotspots.markers.find(
    (m) => m.intensityTier === 'extreme' || m.intensityTier === 'high'
  );
  const moderateMarker = allHotspots.markers.find(
    (m) => m.intensityTier === 'moderate' || m.intensityTier === 'low'
  );
  assert.ok(extremeMarker && moderateMarker);
  assert.ok(extremeMarker.pillarHeight > moderateMarker.pillarHeight);
  assert.ok(
    boostedScale.markers[0].scaleFactor > allHotspots.markers[0].scaleFactor
  );
});

test('createPinnedIncidentRecord generates a valid IncidentRecord with MODIS/VIIRS observations and timeline', async () => {
  const {
    inferPinnedSectorContext,
    createPinnedIncidentRecord,
    aggregateIncidentHorizontalTimeline,
  } = await import('./intelligenceEngine');

  const draft = inferPinnedSectorContext(11.462, 76.648);
  assert.equal(draft.regionId, 'REG-NILGIRI');

  const created = createPinnedIncidentRecord(draft, FIXTURE_INCIDENTS_LIST.length);
  assert.ok(created.id.startsWith('INC-2026-'));
  assert.equal(created.coordinates.lat, 11.462);
  assert.equal(created.coordinates.lng, 76.648);
  assert.equal(created.observations.length, 2);
  assert.ok(created.timeline.length >= 2);

  // Verify the newly pinned incident seamlessly aggregates in the Incident Intelligence horizontal timeline
  const timelineData = aggregateIncidentHorizontalTimeline(created, 'all', 1440);
  assert.ok(timelineData.allItems.length >= 4);
});
