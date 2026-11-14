import {
  DispatchWorkflowState,
  GeometricIsochroneEllipse,
  GeometricSpreadProjection,
  GlobeHotspotMarkerVisual,
  GlobeHotspotSensorFilter,
  HarmonizedHotspotCell,
  IncidentHorizontalTimelineCategory,
  IncidentHorizontalTimelineItem,
  IncidentRecord,
  PinnedCoordinateDraft,
  RouteOption,
  SatelliteObservation,
  SimulationInputParams,
  SimulationOutputResult,
  TemporalEvidenceEvent,
  TemporalEvidenceModality,
  VehicleCategory,
  VerificationLevel,
} from './types';
import { RothermelSpreadEngine } from './rothermelSpreadEngine';

/**
 * Calculates sensor viewing footprint dimensions taking scan angle and sensor geometry into account.
 * For MODIS: nominally 1.0 km at nadir, expands to ~4.8 km x 2.0 km at swath edge.
 * For VIIRS: onboard aggregation constrains 375m I-band from 0.375 km at nadir to ~0.8 km at edge.
 */
function getObservationFootprintKm(obs: SatelliteObservation): { scanKm: number; trackKm: number } {
  if (obs.scanPixelKm && obs.trackPixelKm) {
    return { scanKm: obs.scanPixelKm, trackKm: obs.trackPixelKm };
  }
  const isViirs = obs.sensor.startsWith('VIIRS');
  return isViirs ? { scanKm: 0.375, trackKm: 0.375 } : { scanKm: 1.0, trackKm: 1.0 };
}

/**
 * Evaluates whether two satellite observations intersect in spatial footprint bounding geometry.
 * Replaces fixed radius thresholds with sensor-specific footprint ellipse evaluation (P2.2).
 */
function doFootprintsOverlap(
  a: SatelliteObservation,
  b: SatelliteObservation
): boolean {
  const fpA = getObservationFootprintKm(a);
  const fpB = getObservationFootprintKm(b);

  const meanLat = (a.lat + b.lat) / 2;
  const latKmPerDeg = 111.0;
  const lngKmPerDeg = 111.0 * Math.max(0.1, Math.cos((meanLat * Math.PI) / 180));

  const dLatKm = Math.abs(a.lat - b.lat) * latKmPerDeg;
  const dLngKm = Math.abs(a.lng - b.lng) * lngKmPerDeg;

  // Bounding ellipse semi-axes sum
  const maxTrackSepKm = Math.max(0.6, (fpA.trackKm + fpB.trackKm) * 0.85);
  const maxScanSepKm = Math.max(0.6, (fpA.scanKm + fpB.scanKm) * 0.85);

  const normalizedDistSq =
    (dLatKm * dLatKm) / (maxTrackSepKm * maxTrackSepKm) +
    (dLngKm * dLngKm) / (maxScanSepKm * maxScanSepKm);

  return normalizedDistSq <= 1.0;
}

/**
 * Extracts a numeric confidence score for weighting, preserving native categorization.
 */
function getEffectiveConfidence(obs: SatelliteObservation | any): number {
  if (typeof obs.confidencePct === 'number' && !isNaN(obs.confidencePct)) {
    return Math.min(100, Math.max(10, obs.confidencePct));
  }
  if (typeof obs.modisConfidencePct === 'number' && !isNaN(obs.modisConfidencePct)) {
    return Math.min(100, Math.max(10, obs.modisConfidencePct));
  }
  const viirsCat = (obs.viirsConfidenceCategory || '').toLowerCase();
  if (viirsCat === 'h' || viirsCat === 'high') return 90;
  if (viirsCat === 'n' || viirsCat === 'nominal') return 60;
  if (viirsCat === 'l' || viirsCat === 'low') return 30;
  return 50;
}

/**
 * Harmonizes multi-sensor MODIS (1km nominal) and VIIRS (375m nominal) satellite
 * thermal anomaly observations into spatially and temporally gated hypotheses.
 *
 * Physical Rules Enforced:
 * 1. Strict Pass Gating: Never merges observations across distinct satellite passes
 *    separated by more than 30 minutes. Distinct overpasses represent different times of day.
 * 2. Never averages FRP across distinct overpasses. Within contemporaneous passes,
 *    computes confidence-weighted instantaneous rate and tracks peak instantaneous FRP.
 * 3. Preserves native confidences and allows nullable telemetry without crashing.
 */
export function harmonizeObservations(
  observations: SatelliteObservation[],
  historicalMonthlyMedianFrp: number = 45,
  maxPassWindowMinutes: number = 30
): HarmonizedHotspotCell[] {
  if (!observations || observations.length === 0) return [];

  const maxDeltaMs = maxPassWindowMinutes * 60 * 1000;
  const clusters: SatelliteObservation[][] = [];

  for (const obs of observations) {
    const obsTime = new Date(obs.timestamp).getTime();
    let matchedCluster: SatelliteObservation[] | null = null;

    for (const cluster of clusters) {
      // Must be within the contemporaneous overpass window AND overlap spatially
      const isContemporaneous = cluster.every((anchor) => {
        const anchorTime = new Date(anchor.timestamp).getTime();
        return isNaN(obsTime) || isNaN(anchorTime) || Math.abs(obsTime - anchorTime) <= maxDeltaMs;
      });

      if (isContemporaneous) {
        const overlaps = cluster.some((anchor) => doFootprintsOverlap(obs, anchor));
        if (overlaps) {
          matchedCluster = cluster;
          break;
        }
      }
    }

    if (matchedCluster) {
      matchedCluster.push(obs);
    } else {
      clusters.push([obs]);
    }
  }

  return clusters.map((cluster, idx) => {
    const latCenter = Number(
      (cluster.reduce((sum, o) => sum + o.lat, 0) / cluster.length).toFixed(4)
    );
    const lngCenter = Number(
      (cluster.reduce((sum, o) => sum + o.lng, 0) / cluster.length).toFixed(4)
    );

    // Weight VIIRS higher for spatial precision (375m vs 1000m)
    const hasViirs = cluster.some(
      (o) => o.sensor === 'VIIRS_SNPP' || o.sensor === 'VIIRS_NOAA20' || o.sensor === 'VIIRS_NOAA21' || o.sensor.startsWith('VIIRS')
    );
    const hasModis = cluster.some(
      (o) => o.sensor === 'MODIS_TERRA' || o.sensor === 'MODIS_AQUA' || o.sensor.startsWith('MODIS')
    );

    const minPixelMeters = Math.min(
      ...cluster.map((o) => {
        const fp = getObservationFootprintKm(o);
        return Math.max(fp.scanKm, fp.trackKm) * 1000;
      })
    );
    const crossSensorReduction = hasViirs && hasModis ? 0.78 : 1.0;
    const uncertaintyRadiusMeters = Math.round(
      Math.max(180, (minPixelMeters * 0.65) * crossSensorReduction)
    );

    // Confidence-weighted instantaneous FRP within this contemporaneous pass
    const validFrpObs = cluster.filter((o) => o.frpMw !== null && !isNaN(o.frpMw as number));
    let harmonizedFrpMw = 0;
    let peakConfidencePct = 50;

    if (validFrpObs.length > 0) {
      const totalWeight = validFrpObs.reduce((s, o) => s + getEffectiveConfidence(o), 0);
      const weightedFrp =
        validFrpObs.reduce((s, o) => s + (o.frpMw as number) * getEffectiveConfidence(o), 0) /
        Math.max(1, totalWeight);
      harmonizedFrpMw = Number(weightedFrp.toFixed(1));
    }

    peakConfidencePct = Math.max(...cluster.map((o) => getEffectiveConfidence(o)));
    const contributingSensors = Array.from(new Set(cluster.map((o) => o.sensor)));

    const sortedByTime = [...cluster].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    const safeMedian = Math.max(1, historicalMonthlyMedianFrp);
    const historicalAnomalyRatio = Number((harmonizedFrpMw / safeMedian).toFixed(2));

    return {
      cellId: `HCELL-${String(idx + 1).padStart(3, '0')}`,
      latCenter,
      lngCenter,
      uncertaintyRadiusMeters,
      harmonizedFrpMw,
      peakConfidencePct,
      contributingSensors,
      observationCount: cluster.length,
      firstObserved: sortedByTime[0].timestamp,
      lastObserved: sortedByTime[sortedByTime.length - 1].timestamp,
      historicalAnomalyRatio,
    };
  });
}

/**
 * Determines strict incident verification classification.
 * Never promotes an unverified satellite detection or news claim to a confirmed emergency
 * without official authority confirmation or field verification.
 */
export function evaluateIncidentClassification(input: {
  satelliteCount: number;
  independentSensorsCount: number;
  corroboratedNewsOrWeather: boolean;
  fieldRangerConfirmed: boolean;
  authorityEmergencyDeclared: boolean;
}): VerificationLevel {
  if (input.authorityEmergencyDeclared) {
    return 'authority_confirmed_emergency';
  }
  if (input.fieldRangerConfirmed) {
    return 'field_confirmed';
  }
  if (
    input.satelliteCount >= 2 &&
    (input.independentSensorsCount >= 2 || input.corroboratedNewsOrWeather)
  ) {
    return 'independently_corroborated';
  }
  if (input.satelliteCount >= 2 || input.corroboratedNewsOrWeather) {
    return 'candidate_incident';
  }
  return 'satellite_thermal_anomaly';
}

/**
 * Validates ambulance & emergency dispatch state transitions.
 * Prevents marking a dispatch as 'completed' or 'en_route' unless authorized integration confirms.
 */
export function canTransitionDispatchStatus(
  current: DispatchWorkflowState,
  next: DispatchWorkflowState,
  authorizedIntegrationConfirmed: boolean
): { allowed: boolean; reason?: string } {
  const order: DispatchWorkflowState[] = [
    'draft',
    'awaiting_dispatcher_approval',
    'submitted',
    'acknowledged',
    'assigned',
    'en_route',
    'on_scene',
    'completed',
  ];

  const currentIdx = order.indexOf(current);
  const nextIdx = order.indexOf(next);

  if (currentIdx === -1 || nextIdx === -1) {
    return { allowed: false, reason: 'Invalid dispatch workflow state.' };
  }

  if (
    (next === 'en_route' || next === 'on_scene' || next === 'completed') &&
    !authorizedIntegrationConfirmed
  ) {
    return {
      allowed: false,
      reason:
        'Cannot mark dispatch as active field deployment or completed without Authorised Service Integration confirmation.',
    };
  }

  if (nextIdx > currentIdx + 1) {
    return {
      allowed: false,
      reason: `Cannot skip intermediate verification steps from ${current} directly to ${next}.`,
    };
  }

  return { allowed: true };
}

/**
 * Ranks emergency routes based on vehicle profile, road closures, and travel time.
 */
export function rankEmergencyRoutes(
  routes: RouteOption[],
  vehicle: VehicleCategory,
  simulatePrimaryClosed: boolean = false
): (RouteOption & { effectiveDurationMin: number; isRecommended: boolean; statusNote: string })[] {
  const evaluated = routes.map((route) => {
    const supportsVehicle = route.vehicleAllowed.includes(vehicle);
    const hasBlockage =
      route.reportedBlockages.length > 0 || (simulatePrimaryClosed && route.isPrimary);

    let penaltyMin = 0;
    let statusNote = 'Clear corridor (unverified field surface)';

    if (!supportsVehicle) {
      penaltyMin += 120;
      statusNote = `Restricted for ${vehicle.replace('_', ' ')} profile`;
    } else if (hasBlockage) {
      penaltyMin += 45;
      statusNote = 'Reported road blockage / closure hazard';
    } else if (route.hazardProximityKm < 1.5) {
      penaltyMin += 15;
      statusNote = `Thermal plume within ${route.hazardProximityKm} km`;
    }

    const effectiveDurationMin = route.trafficAdjustedDurationMin + penaltyMin;

    return {
      ...route,
      effectiveDurationMin,
      isRecommended: false,
      statusNote,
    };
  });

  evaluated.sort((a, b) => a.effectiveDurationMin - b.effectiveDurationMin);

  if (evaluated.length > 0) {
    evaluated[0].isRecommended = true;
  }

  return evaluated;
}

/**
 * Runs digital twin scenario simulation for hypothetical environmental & operational changes
 * using differential Rothermel (1972) / Anderson (1983) fire behavior physics.
 * Always marks output with isSimulated: true.
 */
export function simulateScenarioOutcome(
  baseAreaHa: number,
  baseWindKmh: number,
  baseDrynessPct: number,
  params: SimulationInputParams
): SimulationOutputResult {
  const effectiveWind = Math.max(0, baseWindKmh + params.windSpeedDeltaKmh);

  // Convert baseDrynessPct (0-100%) to dead fuel moisture fraction M_f:
  // 100% dry corresponds to 0.04 (4% moisture), 0% dry corresponds to 0.32 (32% moisture)
  const rawMf = 0.32 - (Math.max(0, Math.min(100, baseDrynessPct)) / 100) * 0.28;
  // Rain adds dead fuel moisture and accelerates extinction
  const effectiveMf = Math.max(0.04, Math.min(0.40, rawMf + params.rainfallMmHr * 0.022));

  // Compute physical Rothermel spread rate
  const rothermel = RothermelSpreadEngine.calculateSpread({
    fuelModelCode: 10, // Timber with heavy understory / mountain forest
    fuelMoistureFraction: effectiveMf,
    midflameWindSpeedKmh: effectiveWind,
    slopeDegrees: 18,  // Characteristic Nilgiris Western Ghats terrain slope
  });

  const shiftMultiplier = Math.abs(params.windShiftDeg) > 35 ? 1.25 : 1.0;
  const secondaryMultiplier = params.secondaryIgnitionActive ? 1.45 : 1.0;

  const projectedSpreadRateHaHr = Number(
    Math.max(0.5, rothermel.spreadRateHaHr * shiftMultiplier * secondaryMultiplier).toFixed(1)
  );

  const projected6hAreaHa = Math.round(baseAreaHa + projectedSpreadRateHaHr * 6);

  // Uncertainty grows when satellite pass is delayed or high wind shift occurs
  let uncertaintyBandPct = 14;
  if (params.satellitePassDelayed) uncertaintyBandPct += 16;
  if (Math.abs(params.windShiftDeg) >= 30) uncertaintyBandPct += 9;
  if (params.secondaryIgnitionActive) uncertaintyBandPct += 8;

  const waterPenalty = params.waterSupplyDepletedPct >= 40 ? 2 : 0;
  const requiredFireEngines = Math.max(
    2,
    Math.ceil(projectedSpreadRateHaHr / 9) + (params.secondaryIgnitionActive ? 2 : 0)
  );
  const requiredWaterTankers = Math.max(
    2,
    Math.ceil(requiredFireEngines * 0.85) + waterPenalty
  );
  const requiredAmbulances = Math.max(1, 2 + Math.ceil(params.additionalCasualties / 2));

  const recommendedRouteId = params.primaryRoadClosed ? 'ROUTE-ALT-02' : 'ROUTE-PRI-01';
  const estimatedTravelTimeMin = params.primaryRoadClosed ? 34 : 21;

  const evacuationTriggerRecommended =
    projectedSpreadRateHaHr > 28 ||
    params.secondaryIgnitionActive ||
    params.primaryRoadClosed;

  const rationale: string[] = [
    `Rothermel (1972) spread rate ${projectedSpreadRateHaHr} ha/hr (flame length ${rothermel.flameLengthM} m, intensity ${rothermel.firelineIntensityKwM} kW/m) under ${effectiveWind} km/h wind, 18° slope, and ${params.rainfallMmHr} mm/hr precipitation.`,
  ];

  if (params.primaryRoadClosed) {
    rationale.push('Primary NH-181 corridor marked blocked; rerouting heavy units via Kotagiri Ridge bypass (+13 min).');
  }
  if (params.satellitePassDelayed) {
    rationale.push('Subsequent satellite pass delayed; active perimeter uncertainty widened by +16%.');
  }
  if (params.waterSupplyDepletedPct > 0) {
    rationale.push(`Local reservoir drawdown (${params.waterSupplyDepletedPct}%) requires ${requiredWaterTankers} water tankers on relay.`);
  }

  return {
    isSimulated: true,
    projectedSpreadRateHaHr,
    projected6hAreaHa,
    uncertaintyBandPct,
    recommendedRouteId,
    estimatedTravelTimeMin,
    requiredFireEngines,
    requiredWaterTankers,
    requiredAmbulances,
    evacuationTriggerRecommended,
    rationale,
  };
}

function bearingToCompass(deg: number): string {
  const dirs = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 22.5) % 16;
  return dirs[idx];
}

/**
 * Computes a geometric elliptical fire spread trajectory projection (Anderson 1983 / Rothermel)
 * based on wind vector (speed + azimuth shift), relative humidity %, fuel moisture %, and rainfall suppression.
 */
export function computeGeometricFireSpreadProjection(input: {
  baseWindKmh: number;
  windSpeedDeltaKmh: number;
  baseWindDirectionDeg: number; // meteorological "from" direction in deg
  windShiftDeg: number;
  fuelMoisturePct?: number; // e.g., 8% (bone dry) to 40% (moist)
  relativeHumidityPct?: number; // e.g., 12% (arid foehn) to 85% (humid)
  ambientTempC?: number;
  rainfallMmHr: number;
  baseAreaHa: number;
}): GeometricSpreadProjection {
  const effectiveWindKmh = Math.max(2, input.baseWindKmh + input.windSpeedDeltaKmh);

  const relativeHumidityPct = Math.max(
    8,
    Math.min(
      95,
      input.relativeHumidityPct !== undefined
        ? input.relativeHumidityPct
        : input.fuelMoisturePct !== undefined
        ? Math.round(input.fuelMoisturePct * 1.65)
        : 22
    )
  );

  const tempC = input.ambientTempC !== undefined ? input.ambientTempC : 31.4;
  // Tetens saturation vapor pressure (kPa) & Vapor Pressure Deficit (VPD)
  const esatKpa = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const vaporPressureDeficitKpa = Number(
    Math.max(0.2, esatKpa * (1 - relativeHumidityPct / 100)).toFixed(2)
  );

  // Equilibrium Fine Fuel Moisture Content (EMC %) derived from RH & temperature, blended with explicit fuelMoisturePct if provided
  const rhDerivedEmc = 3.2 + 0.24 * relativeHumidityPct - 0.045 * (tempC - 25);
  const baseFuelMoisture =
    input.fuelMoisturePct !== undefined
      ? input.relativeHumidityPct !== undefined
        ? input.fuelMoisturePct * 0.55 + rhDerivedEmc * 0.45
        : input.fuelMoisturePct
      : rhDerivedEmc;

  const effectiveFuelMoisturePct = Math.max(
    4,
    Math.min(55, Number((baseFuelMoisture + input.rainfallMmHr * 1.4).toFixed(1)))
  );

  // Downwind propagation bearing = (wind_from_deg + shift + 180) mod 360
  const propagationBearingDeg = Math.round(
    (((input.baseWindDirectionDeg + input.windShiftDeg + 180) % 360) + 360) % 360
  );
  const propagationCompass = bearingToCompass(propagationBearingDeg);

  // Anderson (1983) Length-to-Breadth ratio L/B for wind-driven wildland fires:
  const windMs = effectiveWindKmh / 3.6;
  const rawLB =
    0.936 * Math.exp(0.115 * windMs) + 0.461 * Math.exp(-0.1548 * windMs) - 0.32;
  const lengthToBreadthRatio = Number(Math.max(1.15, Math.min(4.8, rawLB)).toFixed(2));

  // Elliptical eccentricity e = sqrt(1 - (B/L)^2)
  const eccentricity = Number(
    Math.sqrt(Math.max(0, 1 - 1 / (lengthToBreadthRatio * lengthToBreadthRatio))).toFixed(3)
  );

  // Fuel moisture & humidity damping function (exponential damping as fine dead fuel moisture / RH rises)
  const moistureRatio = Math.min(1.4, effectiveFuelMoisturePct / 30);
  const moistureDamping = Math.max(
    0.12,
    1 - 2.59 * moistureRatio + 5.11 * Math.pow(moistureRatio, 2) - 3.52 * Math.pow(moistureRatio, 3)
  );

  // Head-fire rate of spread (m/min and km/h)
  const baseR0 = 4.8; // m/min zero-wind dry shrub/understory rate
  const windAmplifier = 1 + 0.085 * Math.pow(effectiveWindKmh, 1.32);
  const headFireRateMMin = Number(
    Math.max(0.8, baseR0 * moistureDamping * windAmplifier).toFixed(1)
  );
  const headFireSpeedKmh = Number(((headFireRateMMin * 60) / 1000).toFixed(2));

  // Backing spread rate and flanking spread rate from elliptical geometry
  const backingRatio = (1 - eccentricity) / (1 + eccentricity);
  const backingFireSpeedKmh = Number(
    Math.max(0.05, headFireSpeedKmh * backingRatio).toFixed(2)
  );
  const flankFireSpeedKmh = Number(
    Math.max(0.1, ((headFireSpeedKmh + backingFireSpeedKmh) / 2) / lengthToBreadthRatio).toFixed(2)
  );

  // Byram's fireline intensity I = H * w * R (kW/m) & flame length L_f = 0.0775 * I^0.46
  const fuelLoadFactor = Math.max(0.35, (42 - effectiveFuelMoisturePct) / 30);
  const firelineIntensityKwM = Math.round(
    Math.max(120, headFireRateMMin * 165 * fuelLoadFactor)
  );
  const flameLengthMeters = Number(
    (0.0775 * Math.pow(firelineIntensityKwM, 0.46)).toFixed(1)
  );

  const crownTransitionRisk: GeometricSpreadProjection['crownTransitionRisk'] =
    firelineIntensityKwM >= 4000 || (effectiveWindKmh >= 38 && effectiveFuelMoisturePct <= 14)
      ? 'Extreme Crown Torch'
      : firelineIntensityKwM >= 2200
      ? 'High'
      : firelineIntensityKwM >= 950
      ? 'Moderate'
      : 'Low';

  const baseRadiusKm = Math.sqrt(Math.max(10, input.baseAreaHa) / 100 / Math.PI);
  const horizons: (1 | 3 | 6)[] = [1, 3, 6];

  const isochrones: GeometricIsochroneEllipse[] = horizons.map((h) => {
    const headAdvanceKm = Number((baseRadiusKm + headFireSpeedKmh * h).toFixed(2));
    const backingRetreatKm = Number((baseRadiusKm * 0.65 + backingFireSpeedKmh * h).toFixed(2));
    const semiMajorKm = Number(((headAdvanceKm + backingRetreatKm) / 2).toFixed(2));
    const semiMinorKm = Number(
      Math.max(0.22, semiMajorKm / lengthToBreadthRatio).toFixed(2)
    );
    const flankWidthKm = Number((semiMinorKm * 2).toFixed(2));
    const projectedAreaHa = Math.round(Math.PI * semiMajorKm * semiMinorKm * 100);
    const centroidOffsetKm = Number(((headAdvanceKm - backingRetreatKm) / 2).toFixed(2));

    return {
      horizonHours: h,
      semiMajorKm,
      semiMinorKm,
      headAdvanceKm,
      backingRetreatKm,
      flankWidthKm,
      projectedAreaHa,
      centroidOffsetKm,
    };
  });

  // Evaluate threatened downwind assets relative to propagationBearingDeg
  const candidateTargets = [
    { name: 'Masinagudi Sector 4 Tea Estates', distanceKm: 1.85, bearingDeg: 248 },
    { name: '110kV Moyar Hydro Transmission Line', distanceKm: 2.6, bearingDeg: 262 },
    { name: 'Kallatti Forest Checkpost Substation', distanceKm: 3.4, bearingDeg: 224 },
    { name: 'NH-181 Ghat Corridor (Hairpin 9)', distanceKm: 4.1, bearingDeg: 280 },
  ];

  const threatenedTargets = candidateTargets.map((target) => {
    const rawDiff = Math.abs(target.bearingDeg - propagationBearingDeg) % 360;
    const angleDiff = rawDiff > 180 ? 360 - rawDiff : rawDiff;
    const withinCone = angleDiff <= 42;
    const directionalSpeed = Math.max(
      0.15,
      headFireSpeedKmh * Math.max(0.2, Math.cos((angleDiff * Math.PI) / 180))
    );
    const estimatedArrivalMin = withinCone
      ? Math.round((target.distanceKm / directionalSpeed) * 60)
      : null;

    return {
      ...target,
      estimatedArrivalMin,
      withinCone,
    };
  });

  return {
    isSimulated: true,
    effectiveWindKmh,
    effectiveFuelMoisturePct,
    relativeHumidityPct,
    vaporPressureDeficitKpa,
    propagationBearingDeg,
    propagationCompass,
    lengthToBreadthRatio,
    eccentricity,
    headFireRateMMin,
    headFireSpeedKmh,
    flankFireSpeedKmh,
    backingFireSpeedKmh,
    flameLengthMeters,
    firelineIntensityKwM,
    crownTransitionRisk,
    isochrones,
    threatenedTargets,
  };
}

/**
 * Filters chronological evidence items (incident reports, satellite observations, sensor telemetry)
 * up to a selected temporal horizon (minutes since 06:00 UTC) and optional modality filter.
 */
export function filterTemporalEvidenceByCutoff(
  events: TemporalEvidenceEvent[],
  cutoffMinutesFromStart: number,
  modalityFilter: 'all' | TemporalEvidenceModality = 'all'
): {
  visibleEvents: TemporalEvidenceEvent[];
  activeNodeIds: string[];
  modalityCounts: Record<TemporalEvidenceModality, number>;
} {
  const timeFiltered = events
    .filter((ev) => ev.minutesFromStart <= cutoffMinutesFromStart)
    .sort((a, b) => a.minutesFromStart - b.minutesFromStart);

  const modalityCounts: Record<TemporalEvidenceModality, number> = {
    incident_report: 0,
    satellite_observation: 0,
    sensor_telemetry: 0,
  };

  for (const ev of timeFiltered) {
    modalityCounts[ev.modality] = (modalityCounts[ev.modality] || 0) + 1;
  }

  const visibleEvents =
    modalityFilter === 'all'
      ? timeFiltered
      : timeFiltered.filter((ev) => ev.modality === modalityFilter);

  const activeNodeIds = Array.from(
    new Set(visibleEvents.map((ev) => ev.linkedNodeId))
  );

  return {
    visibleEvents,
    activeNodeIds,
    modalityCounts,
  };
}

/**
 * Generates a 2D spatial grid of wildfire thermal intensity values across a region's
 * incidents and downwind plume axes for D3 contour/heatmap visualization.
 */
export function generateRegionalIntensityGrid(
  incidents: IncidentRecord[],
  gridCols: number = 60,
  gridRows: number = 32,
  projectPoint: (lat: number, lng: number) => { x: number; y: number },
  canvasWidth: number = 900,
  canvasHeight: number = 480,
  mode: 'frp' | 'thermal_kelvin' = 'frp'
): {
  values: number[];
  cols: number;
  rows: number;
  peakValue: number;
  meanActiveValue: number;
} {
  const values = new Array<number>(gridCols * gridRows).fill(0);
  if (!incidents || incidents.length === 0) {
    return { values, cols: gridCols, rows: gridRows, peakValue: 0, meanActiveValue: 0 };
  }

  const projectedIncidents = incidents.map((inc) => {
    const pt = projectPoint(inc.coordinates.lat, inc.coordinates.lng);
    // Downwind propagation angle in screen space
    const downwindRad = ((inc.windDirectionDeg + 180 - 90) * Math.PI) / 180;
    return {
      inc,
      gx: (pt.x / canvasWidth) * gridCols,
      gy: (pt.y / canvasHeight) * gridRows,
      cosA: Math.cos(downwindRad),
      sinA: Math.sin(downwindRad),
      sigmaMajor: Math.max(3.5, Math.min(11.5, inc.estimatedAreaHa / 22 + inc.windSpeedKmh / 9)),
      sigmaMinor: Math.max(2.4, Math.min(7.2, inc.uncertaintyRadiusMeters / 65 + 2.5)),
      amplitude:
        mode === 'frp'
          ? inc.harmonizedFrpMw
          : Math.max(40, inc.harmonizedFrpMw * 1.15 + inc.temperatureC * 1.8),
    };
  });

  let peakValue = 0;
  let activeSum = 0;
  let activeCount = 0;

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      let cellVal = 0;
      for (const p of projectedIncidents) {
        const dx = c - p.gx;
        const dy = r - p.gy;
        // Rotate into wind-aligned elliptical coordinates
        const u = dx * p.cosA + dy * p.sinA;
        const v = -dx * p.sinA + dy * p.cosA;
        // Stretch downwind (u > 0) more than upwind
        const effectiveSigmaU = u >= 0 ? p.sigmaMajor * 1.35 : p.sigmaMajor * 0.72;
        const distSq =
          (u * u) / (2 * effectiveSigmaU * effectiveSigmaU) +
          (v * v) / (2 * p.sigmaMinor * p.sigmaMinor);
        if (distSq < 9) {
          cellVal += p.amplitude * Math.exp(-distSq);
        }
      }
      const rounded = Number(cellVal.toFixed(1));
      values[r * gridCols + c] = rounded;
      if (rounded > peakValue) peakValue = rounded;
      if (rounded >= 8) {
        activeSum += rounded;
        activeCount++;
      }
    }
  }

  return {
    values,
    cols: gridCols,
    rows: gridRows,
    peakValue: Number(peakValue.toFixed(1)),
    meanActiveValue:
      activeCount > 0 ? Number((activeSum / activeCount).toFixed(1)) : 0,
  };
}

function parseIsoMinutesFromDayStart(iso: string): number {
  const timeMatch = iso.match(/T(\d{2}):(\d{2})/);
  if (!timeMatch) return 480;
  return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
}

function formatUtcLabelFromMinutes(mins: number): string {
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

/**
 * Aggregates satellite detections, field reports, and sensor alerts for an incident
 * into a unified, chronologically sorted horizontal timeline dataset.
 */
export function aggregateIncidentHorizontalTimeline(
  incident: IncidentRecord,
  categoryFilter: 'all' | IncidentHorizontalTimelineCategory = 'all',
  maxMinutesCutoff: number = 1440
): {
  allItems: IncidentHorizontalTimelineItem[];
  visibleItems: IncidentHorizontalTimelineItem[];
  categoryCounts: Record<IncidentHorizontalTimelineCategory, number>;
  minMinutes: number;
  maxMinutes: number;
} {
  const rawItems: Omit<IncidentHorizontalTimelineItem, 'horizontalPositionPct'>[] = [];

  // 1. Aggregate Native Satellite Detections
  for (const obs of incident.observations) {
    const mins = parseIsoMinutesFromDayStart(obs.timestamp);
    const sensorFriendly =
      obs.sensor === 'VIIRS_SNPP'
        ? 'VIIRS Suomi-NPP 375m'
        : obs.sensor === 'VIIRS_NOAA20'
        ? 'VIIRS NOAA-20 375m'
        : obs.sensor === 'MODIS_TERRA'
        ? 'MODIS Terra 1km'
        : 'MODIS Aqua 1km';

    rawItems.push({
      id: `HTL-SAT-${obs.id}`,
      incidentId: incident.id,
      timestampIso: obs.timestamp,
      timestampLabel: formatUtcLabelFromMinutes(mins),
      minutesFromDayStart: mins,
      category: 'satellite_detection',
      sourceLabel: `${sensorFriendly} · ${obs.orbitPass}`,
      title: `${sensorFriendly} Orbital Thermal Detection`,
      detail: `Radiometric hotspot at ${obs.lat.toFixed(4)}°N, ${obs.lng.toFixed(4)}°E with ${obs.scanPixelKm} km pixel footprint and ${obs.confidencePct}% confidence.`,
      primaryMetric: `${obs.frpMw.toFixed(1)} MW FRP`,
      secondaryMetric: `${obs.brightnessKelvin.toFixed(1)} K`,
      confidencePct: obs.confidencePct,
      verification: obs.confidencePct >= 85 ? 'verified' : 'corroborated',
      coordinates: { lat: obs.lat, lng: obs.lng },
    });
  }

  // 2. Aggregate Field Reports & Official Ground Confirmations from Incident Timeline
  for (const ev of incident.timeline) {
    if (ev.category === 'satellite') continue; // already covered with richer telemetry by observations
    const mins = parseIsoMinutesFromDayStart(ev.timestamp);
    const isFieldOrAuthority =
      ev.category === 'field' || ev.category === 'authority' || ev.category === 'news';

    rawItems.push({
      id: `HTL-TL-${ev.id}`,
      incidentId: incident.id,
      timestampIso: ev.timestamp,
      timestampLabel: formatUtcLabelFromMinutes(mins),
      minutesFromDayStart: mins,
      category: isFieldOrAuthority ? 'field_report' : 'sensor_alert',
      sourceLabel: ev.actor,
      title: ev.title,
      detail: ev.detail,
      primaryMetric:
        ev.category === 'authority'
          ? 'Level-2 EOC Order'
          : ev.category === 'field'
          ? 'Ground Visual Match'
          : 'Telemetry Corroborated',
      secondaryMetric: `±${incident.uncertaintyRadiusMeters}m Radius`,
      confidencePct: ev.verification === 'verified' ? 98 : 86,
      verification:
        ev.verification === 'simulation' ? 'unverified' : ev.verification,
      coordinates: incident.coordinates,
    });
  }

  // Ensure every incident has at least one Field Report entry (including pending/candidate field status)
  const hasFieldReport = rawItems.some((item) => item.category === 'field_report');
  if (!hasFieldReport) {
    const firstMins = parseIsoMinutesFromDayStart(incident.firstObserved);
    const reportMins = Math.min(670, firstMins + 22);
    rawItems.push({
      id: `HTL-FLD-SYN-${incident.id}`,
      incidentId: incident.id,
      timestampIso: `2026-10-31T${String(Math.floor(reportMins / 60)).padStart(2, '0')}:${String(
        reportMins % 60
      ).padStart(2, '0')}:00Z`,
      timestampLabel: formatUtcLabelFromMinutes(reportMins),
      minutesFromDayStart: reportMins,
      category: 'field_report',
      sourceLabel: `${incident.district} Forest Patrol Dispatch`,
      title:
        incident.status === 'satellite_thermal_anomaly'
          ? 'Field Reconnaissance Patrol Tasked (Unconfirmed on Ground)'
          : 'Sector Ranger Perimeter & Access Assessment',
      detail: incident.summary,
      primaryMetric: `~${incident.estimatedAreaHa} ha Footprint`,
      secondaryMetric: `${incident.estimatedPopulationExposed} Pop. Exposed`,
      confidencePct: incident.status === 'satellite_thermal_anomaly' ? 62 : 89,
      verification:
        incident.status === 'satellite_thermal_anomaly'
          ? 'unverified'
          : 'corroborated',
      coordinates: incident.coordinates,
    });
  }

  // 3. Aggregate Automated Environmental & Ground IoT Sensor Alerts
  const firstObsMins = parseIsoMinutesFromDayStart(incident.firstObserved);
  const latestObsMins = parseIsoMinutesFromDayStart(incident.latestObserved);
  const awsAlertMins = Math.max(360, firstObsMins + 18);
  const iotAlertMins = Math.max(awsAlertMins + 25, Math.round((firstObsMins + latestObsMins) / 2) + 14);

  rawItems.push({
    id: `HTL-SNS-AWS-${incident.id}`,
    incidentId: incident.id,
    timestampIso: `2026-10-31T${String(Math.floor(awsAlertMins / 60)).padStart(2, '0')}:${String(
      awsAlertMins % 60
    ).padStart(2, '0')}:00Z`,
    timestampLabel: formatUtcLabelFromMinutes(awsAlertMins),
    minutesFromDayStart: awsAlertMins,
    category: 'sensor_alert',
    sourceLabel: `IMD Station AWS-${incident.id.slice(-4)} Telemetry`,
    title: `Anemometer & Relative Humidity Threshold Alert (${incident.windCompass} Ridge)`,
    detail: `Automated weather station recorded ${incident.windSpeedKmh} km/h ${incident.windCompass} wind vector (${incident.windDirectionDeg}°) with ${incident.humidityPct}% relative humidity and ${incident.soilMoisturePct}% soil moisture.`,
    primaryMetric: `${incident.windSpeedKmh} km/h ${incident.windCompass}`,
    secondaryMetric: `RH ${incident.humidityPct}% · ${incident.temperatureC}°C`,
    confidencePct: 96,
    verification: 'verified',
    coordinates: incident.coordinates,
  });

  rawItems.push({
    id: `HTL-SNS-IOT-${incident.id}`,
    incidentId: incident.id,
    timestampIso: `2026-10-31T${String(Math.floor(iotAlertMins / 60)).padStart(2, '0')}:${String(
      iotAlertMins % 60
    ).padStart(2, '0')}:00Z`,
    timestampLabel: formatUtcLabelFromMinutes(iotAlertMins),
    minutesFromDayStart: iotAlertMins,
    category: 'sensor_alert',
    sourceLabel: `Ground IoT Node & Plume Nephelometer`,
    title: `Downwind Canopy Dryness (${incident.vegetationDrynessIndex}/100) & Smoke Aerosol Alert`,
    detail: `Ground sensor node logged vegetation dryness index ${incident.vegetationDrynessIndex}/100 and harmonized radiative anomaly ${(
      incident.harmonizedFrpMw / Math.max(1, incident.historicalMedianFrpMw)
    ).toFixed(1)}x above 10-year October median.`,
    primaryMetric: `Dryness ${incident.vegetationDrynessIndex}/100`,
    secondaryMetric: `${incident.harmonizedFrpMw} MW Peak`,
    confidencePct: 93,
    verification: 'corroborated',
    coordinates: incident.coordinates,
  });

  // Sort chronologically by minutesFromDayStart
  rawItems.sort((a, b) => a.minutesFromDayStart - b.minutesFromDayStart);

  const minMinutes =
    rawItems.length > 0 ? rawItems[0].minutesFromDayStart : 360;
  const maxMinutes =
    rawItems.length > 0
      ? Math.max(minMinutes + 30, rawItems[rawItems.length - 1].minutesFromDayStart)
      : 690;
  const span = Math.max(1, maxMinutes - minMinutes);

  const allItems: IncidentHorizontalTimelineItem[] = rawItems.map((item, idx) => {
    const rawPct = ((item.minutesFromDayStart - minMinutes) / span) * 84 + 8;
    // Slight nudge if two items share identical timestamp so markers remain distinct on horizontal track
    const duplicateOffset =
      idx > 0 &&
      Math.abs(item.minutesFromDayStart - rawItems[idx - 1].minutesFromDayStart) <= 2
        ? 3.2
        : 0;
    const horizontalPositionPct = Number(
      Math.max(6, Math.min(94, rawPct + duplicateOffset)).toFixed(1)
    );
    return {
      ...item,
      horizontalPositionPct,
    };
  });

  const timeFiltered = allItems.filter(
    (item) => item.minutesFromDayStart <= maxMinutesCutoff
  );

  const categoryCounts: Record<IncidentHorizontalTimelineCategory, number> = {
    satellite_detection: 0,
    field_report: 0,
    sensor_alert: 0,
  };

  for (const item of timeFiltered) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  const visibleItems =
    categoryFilter === 'all'
      ? timeFiltered
      : timeFiltered.filter((item) => item.category === categoryFilter);

  return {
    allItems,
    visibleItems,
    categoryCounts,
    minMinutes,
    maxMinutes,
  };
}

function glslSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Computes the Three.js TSL Earth (webgpu_tsl_earth) solar direction vector,
 * terminator day/night strength, twilight scattering factor, and city-light weight
 * for a given spherical sun position (phi, theta), globe rotation, and region coordinate.
 */
export function computeTslEarthSolarState(input: {
  sunPhiRad: number;
  sunThetaRad: number;
  globeRotationYRad?: number;
  globeRotationXRad?: number;
  regionLatDeg: number;
  regionLngDeg: number;
}): {
  sunDirection: [number, number, number];
  sunOrientation: number;
  dayStrength: number;
  twilightMix: number;
  cityLightWeight: number;
  illuminationPhase:
    | 'Daylit Hemisphere'
    | 'Solar Twilight Terminator'
    | 'Nocturnal City-Light Hemisphere';
  subsolarLatDeg: number;
  subsolarLngDeg: number;
} {
  const phi = Math.max(0.1, Math.min(Math.PI - 0.1, input.sunPhiRad));
  const theta = input.sunThetaRad;

  // Matches THREE.Spherical(1, phi, theta) -> setFromSphericalCoords
  const sx = Math.sin(phi) * Math.sin(theta);
  const sy = Math.cos(phi);
  const sz = Math.sin(phi) * Math.cos(theta);
  const sLen = Math.hypot(sx, sy, sz) || 1;
  const sunDirection: [number, number, number] = [
    Number((sx / sLen).toFixed(4)),
    Number((sy / sLen).toFixed(4)),
    Number((sz / sLen).toFixed(4)),
  ];

  // Convert region lat/lng into local unit sphere normal matching latLngToVec3
  const safeLat = Number.isFinite(input.regionLatDeg) ? input.regionLatDeg : 11.4064;
  const safeLng = Number.isFinite(input.regionLngDeg) ? input.regionLngDeg : 76.6932;
  const latPhi = (90 - safeLat) * (Math.PI / 180);
  const lngTheta = (safeLng + 180) * (Math.PI / 180);
  const lx = -(Math.sin(latPhi) * Math.cos(lngTheta));
  const lz = Math.sin(latPhi) * Math.sin(lngTheta);
  const ly = Math.cos(latPhi);

  // Apply globe Y rotation then X rotation
  const rotY = input.globeRotationYRad ?? 0;
  const rotX = input.globeRotationXRad ?? 0;
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const wx1 = lx * cosY + lz * sinY;
  const wz1 = -lx * sinY + lz * cosY;
  const wy1 = ly;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const wy2 = wy1 * cosX - wz1 * sinX;
  const wz2 = wy1 * sinX + wz1 * cosX;
  const wx2 = wx1;

  const rawDot =
    wx2 * sunDirection[0] + wy2 * sunDirection[1] + wz2 * sunDirection[2];
  const sunOrientation = Number(Math.max(-1, Math.min(1, rawDot)).toFixed(3));

  // Exact webgpu_tsl_earth smoothstep curves
  const dayStrength = Number(
    glslSmoothstep(-0.25, 0.5, sunOrientation).toFixed(3)
  );
  const twilightMix = Number(
    glslSmoothstep(-0.25, 0.75, sunOrientation).toFixed(3)
  );
  const cityLightWeight = Number((1 - dayStrength).toFixed(3));

  const illuminationPhase =
    dayStrength >= 0.65
      ? 'Daylit Hemisphere'
      : dayStrength <= 0.18
      ? 'Nocturnal City-Light Hemisphere'
      : 'Solar Twilight Terminator';

  const subsolarLatDeg = Number((90 - (phi * 180) / Math.PI).toFixed(1));
  const rawLng = (((theta - rotY) * 180) / Math.PI) % 360;
  const subsolarLngDeg = Number(
    (rawLng > 180 ? rawLng - 360 : rawLng < -180 ? rawLng + 360 : rawLng).toFixed(1)
  );

  return {
    sunDirection,
    sunOrientation,
    dayStrength,
    twilightMix,
    cityLightWeight,
    illuminationPhase,
    subsolarLatDeg,
    subsolarLngDeg,
  };
}

/**
 * Converts geographic (lat, lng) in degrees to 3D sphere Cartesian coordinates [x, y, z].
 */
export function latLngToCartesian(
  lat: number,
  lng: number,
  radius: number = 1.42
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

/**
 * Inverts a 3D point on the Earth sphere into geographic { lat, lng } in degrees.
 * Used by Click-to-Pin on the React Three Fiber 3D globe.
 */
export function cartesianToLatLng(
  x: number,
  y: number,
  z: number
): { lat: number; lng: number } {
  const radius = Math.hypot(x, y, z) || 1;
  const clampedY = Math.max(-1, Math.min(1, y / radius));
  const phi = Math.acos(clampedY);
  const lat = Number((90 - (phi * 180) / Math.PI).toFixed(4));

  // Since x = -r*sin(phi)*cos(theta) and z = r*sin(phi)*sin(theta):
  // atan2(z, -x) recovers theta in (-pi, pi]
  let theta = Math.atan2(z, -x);
  if (theta < 0) theta += Math.PI * 2;
  let lng = (theta * 180) / Math.PI - 180;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;

  return {
    lat,
    lng: Number(lng.toFixed(4)),
  };
}

/**
 * Computes real-time NASA MODIS (Terra/Aqua 1km) & VIIRS (S-NPP/NOAA-20 375m)
 * 3D hotspot marker visuals with radiative-intensity-based geometric scaling and color coding.
 */
export function computeHotspotMarkerVisuals(
  incidents: IncidentRecord[],
  sensorFilter: GlobeHotspotSensorFilter = 'ALL',
  intensityScaleMultiplier: number = 1.0
): {
  markers: GlobeHotspotMarkerVisual[];
  totalCount: number;
  viirsCount: number;
  modisCount: number;
  peakFrpMw: number;
  meanBrightnessKelvin: number;
} {
  const safeMult = Math.max(0.4, Math.min(3.0, intensityScaleMultiplier));
  const rawList: GlobeHotspotMarkerVisual[] = [];

  for (const inc of incidents) {
    for (const obs of inc.observations) {
      const sensorFamily: 'VIIRS' | 'MODIS' =
        obs.sensor === 'VIIRS_SNPP' || obs.sensor === 'VIIRS_NOAA20'
          ? 'VIIRS'
          : 'MODIS';

      if (sensorFilter === 'VIIRS_ONLY' && sensorFamily !== 'VIIRS') continue;
      if (sensorFilter === 'MODIS_ONLY' && sensorFamily !== 'MODIS') continue;

      const intensityTier: GlobeHotspotMarkerVisual['intensityTier'] =
        obs.frpMw >= 115 || obs.brightnessKelvin >= 375
          ? 'extreme'
          : obs.frpMw >= 70 || obs.brightnessKelvin >= 352
          ? 'high'
          : obs.frpMw >= 38
          ? 'moderate'
          : 'low';

      const colorHex =
        intensityTier === 'extreme'
          ? '#f43f5e' // Crimson-Rose Core
          : intensityTier === 'high'
          ? '#f97316' // Vivid Thermal Orange
          : intensityTier === 'moderate'
          ? '#f59e0b' // Solar Amber
          : '#eab308'; // Candidate Gold

      // Intensity-based scaling factor from FRP (MW) and Brightness (K)
      const normalizedFrp = Math.min(2.4, Math.max(0.4, obs.frpMw / 55));
      const normalizedTemp = Math.min(
        1.5,
        Math.max(0.75, (obs.brightnessKelvin - 295) / 75)
      );
      const scaleFactor = Number(
        ((normalizedFrp * 0.7 + normalizedTemp * 0.3) * safeMult).toFixed(2)
      );
      const pillarHeight = Number(
        Math.min(0.24, Math.max(0.032, 0.048 * scaleFactor)).toFixed(4)
      );
      const footprintRadius = Number(
        Math.min(0.085, Math.max(0.018, 0.026 * Math.sqrt(scaleFactor))).toFixed(4)
      );

      rawList.push({
        id: obs.id,
        incidentId: inc.id,
        incidentTitle: inc.title,
        sensor: obs.sensor,
        sensorFamily,
        lat: obs.lat,
        lng: obs.lng,
        frpMw: obs.frpMw,
        brightnessKelvin: obs.brightnessKelvin,
        confidencePct: obs.confidencePct,
        timestamp: obs.timestamp,
        orbitPass: obs.orbitPass,
        scaleFactor,
        pillarHeight,
        footprintRadius,
        colorHex,
        intensityTier,
      });
    }
  }

  // Also include global reference NASA FIRMS active pass hotspots (Sierra Basin & Arcadia)
  const globalSupplementary: Omit<
    GlobeHotspotMarkerVisual,
    'scaleFactor' | 'pillarHeight' | 'footprintRadius' | 'colorHex' | 'intensityTier'
  >[] = [
    {
      id: 'FIRMS-SIERRA-V1',
      incidentId: incidents[0]?.id || 'INC-2026-0842',
      incidentTitle: 'Plumas Feather River Canyon Thermal Pass',
      sensor: 'VIIRS_NOAA20',
      sensorFamily: 'VIIRS',
      lat: 39.9921,
      lng: -120.8031,
      frpMw: 132.4,
      brightnessKelvin: 381.5,
      confidencePct: 97,
      timestamp: '2026-10-31T10:18:00Z',
      orbitPass: 'NOAA-20 Ascending #8812',
    },
    {
      id: 'FIRMS-SIERRA-M1',
      incidentId: incidents[0]?.id || 'INC-2026-0842',
      incidentTitle: 'Plumas North Ridge MODIS Swath',
      sensor: 'MODIS_TERRA',
      sensorFamily: 'MODIS',
      lat: 40.145,
      lng: -120.621,
      frpMw: 78.6,
      brightnessKelvin: 356.2,
      confidencePct: 89,
      timestamp: '2026-10-31T10:04:00Z',
      orbitPass: 'Terra Pass #4409',
    },
    {
      id: 'FIRMS-ARCADIA-V1',
      incidentId: incidents[0]?.id || 'INC-2026-0842',
      incidentTitle: 'Mainalo Escarpment VIIRS Anomaly',
      sensor: 'VIIRS_SNPP',
      sensorFamily: 'VIIRS',
      lat: 37.5102,
      lng: 22.3712,
      frpMw: 94.8,
      brightnessKelvin: 364.0,
      confidencePct: 94,
      timestamp: '2026-10-31T10:32:00Z',
      orbitPass: 'S-NPP Pass #1092',
    },
  ];

  for (const sup of globalSupplementary) {
    if (sensorFilter === 'VIIRS_ONLY' && sup.sensorFamily !== 'VIIRS') continue;
    if (sensorFilter === 'MODIS_ONLY' && sup.sensorFamily !== 'MODIS') continue;

    const intensityTier: GlobeHotspotMarkerVisual['intensityTier'] =
      sup.frpMw >= 115 ? 'extreme' : sup.frpMw >= 70 ? 'high' : 'moderate';
    const colorHex =
      intensityTier === 'extreme'
        ? '#f43f5e'
        : intensityTier === 'high'
        ? '#f97316'
        : '#f59e0b';
    const normalizedFrp = Math.min(2.4, Math.max(0.4, sup.frpMw / 55));
    const scaleFactor = Number((normalizedFrp * safeMult).toFixed(2));
    rawList.push({
      ...sup,
      scaleFactor,
      pillarHeight: Number((0.048 * scaleFactor).toFixed(4)),
      footprintRadius: Number((0.026 * Math.sqrt(scaleFactor)).toFixed(4)),
      colorHex,
      intensityTier,
    });
  }

  let viirsCount = 0;
  let modisCount = 0;
  let peakFrpMw = 0;
  let sumKelvin = 0;

  for (const m of rawList) {
    if (m.sensorFamily === 'VIIRS') viirsCount++;
    else modisCount++;
    if (m.frpMw > peakFrpMw) peakFrpMw = m.frpMw;
    sumKelvin += m.brightnessKelvin;
  }

  return {
    markers: rawList,
    totalCount: rawList.length,
    viirsCount,
    modisCount,
    peakFrpMw: Number(peakFrpMw.toFixed(1)),
    meanBrightnessKelvin:
      rawList.length > 0 ? Number((sumKelvin / rawList.length).toFixed(1)) : 0,
  };
}

/**
 * Infers regional sector metadata from a 3D globe pinned (lat, lng) coordinate.
 */
export function inferPinnedSectorContext(
  lat: number,
  lng: number
): PinnedCoordinateDraft {
  const safeLat = Number(lat.toFixed(4));
  const safeLng = Number(lng.toFixed(4));

  // Match closest monitored region
  const distNilgiri = Math.hypot(safeLat - 11.4064, safeLng - 76.6932);
  const distSierra = Math.hypot(safeLat - 39.9921, safeLng - -120.8031);
  const distArcadia = Math.hypot(safeLat - 37.5102, safeLng - 22.3712);

  if (distNilgiri <= distSierra && distNilgiri <= distArcadia) {
    return {
      lat: safeLat,
      lng: safeLng,
      regionId: 'REG-NILGIRI',
      sectorName: 'Nilgiri Biosphere & Western Ghats',
      districtName: 'The Nilgiris District, Tamil Nadu',
      estimatedFrpMw: 96.4,
      severity: 'high',
      customTitle: `Pinned Orbital Anomaly — Western Ghats (${safeLat.toFixed(2)}°N, ${safeLng.toFixed(2)}°E)`,
    };
  }
  if (distSierra <= distArcadia) {
    return {
      lat: safeLat,
      lng: safeLng,
      regionId: 'REG-SIERRA',
      sectorName: 'Sierra Nevada Plumas Basin',
      districtName: 'Plumas National Forest, California',
      estimatedFrpMw: 118.2,
      severity: 'critical',
      customTitle: `Pinned Orbital Anomaly — Sierra Basin (${safeLat.toFixed(2)}°N, ${Math.abs(safeLng).toFixed(2)}°W)`,
    };
  }
  return {
    lat: safeLat,
    lng: safeLng,
    regionId: 'REG-ARCADIA',
    sectorName: 'Peloponnese Arcadia Highlands',
    districtName: 'Arcadia Regional Unit, Peloponnese',
    estimatedFrpMw: 84.5,
    severity: 'elevated',
    customTitle: `Pinned Orbital Anomaly — Arcadia Ridge (${safeLat.toFixed(2)}°N, ${safeLng.toFixed(2)}°E)`,
  };
}

/**
 * Creates a complete IncidentRecord from a 3D globe Click-to-Pin coordinate draft,
 * ready to populate the Incident Intelligence dossier and horizontal timeline.
 */
export function createPinnedIncidentRecord(
  draft: PinnedCoordinateDraft,
  existingCount: number
): IncidentRecord {
  const seq = 860 + existingCount;
  const id = `INC-2026-0${seq}`;
  const lat = Number(draft.lat.toFixed(4));
  const lng = Number(draft.lng.toFixed(4));
  const frp = Number(Math.max(15, draft.estimatedFrpMw).toFixed(1));

  const obs1: SatelliteObservation = {
    id: `OBS-PIN-${seq}-V1`,
    sensor: 'VIIRS_SNPP',
    timestamp: '2026-10-31T10:42:00Z',
    lat,
    lng,
    brightnessKelvin: Number((325 + frp * 0.42).toFixed(1)),
    frpMw: frp,
    confidencePct: 94,
    scanPixelKm: 0.375,
    trackPixelKm: 0.375,
    dayNight: 'D',
    orbitPass: `S-NPP Direct Broadcast #${1100 + existingCount}`,
  };

  const obs2: SatelliteObservation = {
    id: `OBS-PIN-${seq}-M1`,
    sensor: 'MODIS_AQUA',
    timestamp: '2026-10-31T10:58:00Z',
    lat: Number((lat + 0.0032).toFixed(4)),
    lng: Number((lng - 0.0028).toFixed(4)),
    brightnessKelvin: Number((318 + frp * 0.35).toFixed(1)),
    frpMw: Number((frp * 0.84).toFixed(1)),
    confidencePct: 86,
    scanPixelKm: 1.0,
    trackPixelKm: 1.0,
    dayNight: 'D',
    orbitPass: `Aqua Ascending #${4210 + existingCount}`,
  };

  return {
    id,
    title:
      draft.customTitle.trim() ||
      `Pinned Orbital Thermal Anomaly (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
    region: draft.regionId,
    district: draft.districtName,
    status: 'candidate_incident',
    severity: draft.severity,
    coordinates: { lat, lng },
    uncertaintyRadiusMeters: 245,
    firstObserved: '2026-10-31T10:42:00Z',
    latestObserved: '2026-10-31T11:08:00Z',
    modisCount: 1,
    viirsCount: 1,
    harmonizedFrpMw: frp,
    historicalMedianFrpMw: 38.0,
    vegetationDrynessIndex: 84,
    soilMoisturePct: 16,
    windSpeedKmh: 31,
    windDirectionDeg: 68,
    windCompass: 'ENE',
    temperatureC: 30.8,
    humidityPct: 24,
    estimatedAreaHa: Math.round(frp * 0.95),
    estimatedPopulationExposed: 320,
    affectedAssets: [
      `${draft.sectorName} Forest Buffer Corridor`,
      'Regional High-Voltage Distribution Feeder',
    ],
    recommendedStaging: [
      {
        name: `${draft.districtName.split(',')[0]} Forward Staging Pad`,
        lat: Number((lat - 0.015).toFixed(4)),
        lng: Number((lng + 0.012).toFixed(4)),
        clearance: 'Cleared for Type-1 Fire Engine & Mobile LWIR Command',
      },
    ],
    sourceProvenance: [
      '3D Globe Operator Click-to-Pin Coordinate Acquisition',
      'NASA FIRMS VIIRS 375m S-NPP & MODIS 1km Cross-Sensor Match',
      'IMD / Regional Automated Ridge Telemetry',
    ],
    summary: `Operator-pinned coordinate at ${lat.toFixed(4)}°N, ${lng.toFixed(
      4
    )}°E generated a new candidate incident dossier corroborated by VIIRS 375m (${frp} MW FRP) and MODIS Aqua thermal passes.`,
    unverifiedNotes:
      'Pinned via 3D Orbital Command Globe. Awaiting on-ground forest ranger visual verification before escalation to confirmed emergency.',
    authorityStatus: 'Pending District EOC Review',
    observations: [obs1, obs2],
    timeline: [
      {
        id: `TL-PIN-${seq}-1`,
        timestamp: '2026-10-31T10:42:00Z',
        actor: 'NASA VIIRS S-NPP 375m',
        category: 'satellite',
        title: 'Primary 375m Thermal Anomaly Detected at Pinned Coordinate',
        detail: `VIIRS I4 band brightness ${obs1.brightnessKelvin} K (${frp} MW FRP) at ${lat.toFixed(
          4
        )}°, ${lng.toFixed(4)}°.`,
        verification: 'verified',
      },
      {
        id: `TL-PIN-${seq}-2`,
        timestamp: '2026-10-31T11:08:00Z',
        actor: 'Command Operator (3D Globe Pin)',
        category: 'field',
        title: 'Operator Click-to-Pin Incident Record Generated',
        detail: `Incident ${id} instantiated from 3D globe coordinate selection and routed to District Forest Patrol for field verification.`,
        verification: 'corroborated',
      },
    ],
  };
}

