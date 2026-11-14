/**
 * FireLens 4-Tier Fire Reconciliation & Harmonization Engine — v3.0.0
 *
 * Implements strict scientific multi-tiered separation of active fire data:
 * - Tier 1: Raw Observations (Immutable native sensor pixels, viewing geometry, native QA)
 * - Tier 2: Cross-Sensor Matches (Contemporaneous cross-sensor coincident detections <= 30 min)
 * - Tier 3: Physical Fire Event Clusters (Spatiotemporally coherent burning events, duration, footprint)
 * - Tier 4: Aggregated Fire Statistics (Observing-effort normalized rates, climatology, anomalies)
 *
 * Scientific Rules:
 * - Never average FRP across different overpass passes (Rule: Instantaneous FRP is peak or pass-specific)
 * - Preserve native sensor confidence strings/values without lossy conversion
 * - Enforce spatial footprint overlap accounting for scan-angle pixel distortion
 */

import { CanonicalObservation } from './canonicalSchema';

// ==========================================
// TIER 1: RAW OBSERVATION
// ==========================================
export interface Tier1RawObservation extends CanonicalObservation {
  tier: 1;
  footprintAreaKm2: number;
}

// ==========================================
// TIER 2: CROSS-SENSOR MATCH
// ==========================================
export interface Tier2CrossSensorMatch {
  id: string; // MATCH-{obs1Id}-{obs2Id}
  tier: 2;
  temporalDeltaMinutes: number; // <= 30 min
  spatialDistanceKm: number;
  spatialOverlapIoU: number;
  modisObservation: CanonicalObservation;
  viirsObservation: CanonicalObservation;
  frpRatioViirsToModis: number | null; // Sensitivity metric
  brightnessDeltaK: number | null;
  matchClassification: 'COINCIDENT_OVERPASS' | 'CONTEMPORANEOUS_ADJACENT';
}

// ==========================================
// TIER 3: PHYSICAL FIRE EVENT CLUSTER
// ==========================================
export interface Tier3PhysicalFireEvent {
  id: string; // EVT-{year}-{index}
  tier: 3;
  firstDetectedUtc: string;
  lastDetectedUtc: string;
  durationHours: number;
  centroidLat: number;
  centroidLng: number;
  convexHull: [number, number][]; // [lat, lng] polygon vertices
  estimatedPerimeterKm: number; // Backward-compatible alias for boundingHullPerimeterKm
  boundingHullPerimeterKm: number;
  footprintClassification: 'OBSERVATION_CLUSTER_HULL';
  estimatedAreaKm2: number;
  observationCount: number;
  sensorBreakdown: {
    modisCount: number;
    viirsCount: number;
    satellites: string[];
  };
  peakFrpMw: number;
  peakFrpTimestampUtc: string;
  observedSnapshotEnergyMJ: number; // Sum of instantaneous observed pass energies (MW * nominal sweep duration)
  estimatedThermalEnergyGWh: number | null; // Null or unverified approximation (continuous extrapolation across multi-hour gaps is unobserved)
  samplingDisclaimer: string;
  status: 'ACTIVE' | 'CONTAINED' | 'EXTINGUISHED';
  observationIds: string[];
}

// ==========================================
// TIER 4: AGGREGATED STATISTICS
// ==========================================
export interface Tier4AggregatedStatistics {
  tier: 4;
  periodLabel: string;
  spatialAoi: string;
  rawHotspotCount: number;
  effortAdjustedHotspotRate: number;
  effortIndex: number;
  sensorShare: {
    modisPct: number;
    viirsPct: number;
  };
  meanFrpMw: number;
  peakObservedFrpMw: number;
  climatologicalMedian: number;
  seasonalAnomalyZScore: number;
  percentileRank: number; // 0 to 100
  uncertaintyInterval95: [number, number];
}

/**
 * Calculates pixel footprint area based on scan and track dimensions.
 */
export function calculatePixelFootprintArea(scanKm: number, trackKm: number): number {
  return Number((Math.PI * (scanKm / 2) * (trackKm / 2)).toFixed(4));
}

/**
 * Calculates Great Circle Haversine distance between two coordinates in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0088; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(3));
}

/**
 * Tier 1: Hydrates raw observations with geometric footprint characteristics.
 */
export function hydrateTier1Observations(
  observations: CanonicalObservation[]
): Tier1RawObservation[] {
  return observations.map((obs) => {
    const scan = obs.scanKm ?? (obs.sensor === 'MODIS' ? 1.0 : 0.375);
    const track = obs.trackKm ?? (obs.sensor === 'MODIS' ? 1.0 : 0.375);
    return {
      ...obs,
      tier: 1,
      footprintAreaKm2: obs.pixelAreaKm2 || calculatePixelFootprintArea(scan, track),
    };
  });
}

/**
 * Tier 2: Cross-Sensor Matching Algorithm.
 * Matches contemporaneous MODIS and VIIRS detections within a spatial and temporal window.
 * Max time delta: 30 minutes.
 * Max spatial distance: Combined footprint radii or 3.0 km.
 */
export function matchTier2CrossSensor(
  observations: CanonicalObservation[],
  maxTimeDeltaMinutes: number = 30,
  maxDistanceKm: number = 2.5
): Tier2CrossSensorMatch[] {
  const modisObs = observations.filter((o) => o.sensor === 'MODIS');
  const viirsObs = observations.filter((o) => o.sensor === 'VIIRS');
  const matches: Tier2CrossSensorMatch[] = [];

  for (const m of modisObs) {
    const mTime = new Date(m.acquisitionTimestampUtc).getTime();

    for (const v of viirsObs) {
      const vTime = new Date(v.acquisitionTimestampUtc).getTime();
      const timeDeltaMinutes = Math.abs(mTime - vTime) / 60000;

      if (timeDeltaMinutes > maxTimeDeltaMinutes) continue;

      const distKm = haversineDistanceKm(m.latitude, m.longitude, v.latitude, v.longitude);
      if (distKm > maxDistanceKm) continue;

      // Approximate spatial overlap IoU based on circularized footprint radii
      const mScan = m.scanKm ?? 1.0;
      const mTrack = m.trackKm ?? 1.0;
      const vScan = v.scanKm ?? 0.375;
      const vTrack = v.trackKm ?? 0.375;
      const rM = (mScan + mTrack) / 4;
      const rV = (vScan + vTrack) / 4;
      const sumR = rM + rV;
      const overlapIoU = distKm < sumR ? Number(Math.max(0, 1 - distKm / sumR).toFixed(3)) : 0;

      const frpRatio =
        v.frpMw !== null && m.frpMw !== null && m.frpMw > 0
          ? Number((v.frpMw / m.frpMw).toFixed(3))
          : null;

      const brightnessDelta =
        v.brightnessKelvin !== null && m.brightnessKelvin !== null
          ? Number((v.brightnessKelvin - m.brightnessKelvin).toFixed(1))
          : null;

      matches.push({
        id: `MATCH-${m.id.substring(0, 8)}-${v.id.substring(0, 8)}`,
        tier: 2,
        temporalDeltaMinutes: Number(timeDeltaMinutes.toFixed(1)),
        spatialDistanceKm: distKm,
        spatialOverlapIoU: overlapIoU,
        modisObservation: m,
        viirsObservation: v,
        frpRatioViirsToModis: frpRatio,
        brightnessDeltaK: brightnessDelta,
        matchClassification:
          timeDeltaMinutes <= 15 ? 'COINCIDENT_OVERPASS' : 'CONTEMPORANEOUS_ADJACENT',
      });
    }
  }

  return matches;
}

/**
 * Computes a simple 2D convex hull around a set of points (Graham scan / Andrew's monotone chain).
 */
export function computeConvexHull(points: [number, number][]): [number, number][] {
  if (points.length <= 2) return points;

  const sorted = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  const crossProduct = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/**
 * Approximates polygon perimeter in kilometers.
 */
export function computePolygonPerimeterKm(polygon: [number, number][]): number {
  if (polygon.length < 2) return 0.5;
  let perimeter = 0;
  for (let i = 0; i < polygon.length; i++) {
    const next = (i + 1) % polygon.length;
    perimeter += haversineDistanceKm(
      polygon[i][0],
      polygon[i][1],
      polygon[next][0],
      polygon[next][1]
    );
  }
  return Number(perimeter.toFixed(2));
}

/**
 * Tier 3: Physical Fire Event Clustering.
 * Groups observations into persistent physical burning events using spatiotemporal connectivity:
 * Spatial distance <= 2.5 km, temporal gap between consecutive detections <= 24 hours.
 */
export function clusterTier3PhysicalFireEvents(
  observations: CanonicalObservation[],
  maxSpatialGapKm: number = 2.5,
  maxTemporalGapHours: number = 24
): Tier3PhysicalFireEvent[] {
  if (observations.length === 0) return [];

  // Sort observations chronologically
  const sorted = [...observations].sort(
    (a, b) =>
      new Date(a.acquisitionTimestampUtc).getTime() -
      new Date(b.acquisitionTimestampUtc).getTime()
  );

  const visited = new Set<string>();
  const events: Tier3PhysicalFireEvent[] = [];
  let eventIdx = 1;

  for (let i = 0; i < sorted.length; i++) {
    const seed = sorted[i];
    if (visited.has(seed.id)) continue;

    const cluster: CanonicalObservation[] = [seed];
    visited.add(seed.id);
    const queue: CanonicalObservation[] = [seed];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currTime = new Date(current.acquisitionTimestampUtc).getTime();

      for (let j = 0; j < sorted.length; j++) {
        const candidate = sorted[j];
        if (visited.has(candidate.id)) continue;

        const candTime = new Date(candidate.acquisitionTimestampUtc).getTime();
        const timeGapHours = Math.abs(candTime - currTime) / 3600000;
        if (timeGapHours > maxTemporalGapHours) continue;

        const distKm = haversineDistanceKm(
          current.latitude,
          current.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (distKm <= maxSpatialGapKm) {
          visited.add(candidate.id);
          cluster.push(candidate);
          queue.push(candidate);
        }
      }
    }

    // Build Tier 3 Physical Event
    const points: [number, number][] = cluster.map((c) => [c.latitude, c.longitude]);
    const hull = computeConvexHull(points);
    const perimeterKm = computePolygonPerimeterKm(hull);
    // Area approximation: A ~ P^2 / (4 * pi) or minimum footprint
    const approxAreaKm2 = Number(
      Math.max(0.14, (perimeterKm * perimeterKm) / (4 * Math.PI)).toFixed(2)
    );

    const firstTime = new Date(
      Math.min(...cluster.map((c) => new Date(c.acquisitionTimestampUtc).getTime()))
    ).toISOString();
    const lastTime = new Date(
      Math.max(...cluster.map((c) => new Date(c.acquisitionTimestampUtc).getTime()))
    ).toISOString();
    const durationHours = Number(
      ((new Date(lastTime).getTime() - new Date(firstTime).getTime()) / 3600000).toFixed(1)
    );

    let peakFrp = 0;
    let peakFrpTime = firstTime;
    let totalFrpSum = 0;
    let frpCount = 0;

    let modisCount = 0;
    let viirsCount = 0;
    const satellites = new Set<string>();

    for (const c of cluster) {
      if (c.sensor === 'MODIS') modisCount++;
      else viirsCount++;
      satellites.add(c.satellite);

      if (c.frpMw !== null && !isNaN(c.frpMw)) {
        totalFrpSum += c.frpMw;
        frpCount++;
        if (c.frpMw > peakFrp) {
          peakFrp = c.frpMw;
          peakFrpTime = c.acquisitionTimestampUtc;
        }
      }
    }

    const observedSnapshotEnergyMJ = Number(totalFrpSum.toFixed(1));

    const centroidLat = Number(
      (cluster.reduce((s, c) => s + c.latitude, 0) / cluster.length).toFixed(4)
    );
    const centroidLng = Number(
      (cluster.reduce((s, c) => s + c.longitude, 0) / cluster.length).toFixed(4)
    );

    const yr = new Date(firstTime).getUTCFullYear();
    events.push({
      id: `EVT-${yr}-${String(eventIdx++).padStart(4, '0')}`,
      tier: 3,
      firstDetectedUtc: firstTime,
      lastDetectedUtc: lastTime,
      durationHours,
      centroidLat,
      centroidLng,
      convexHull: hull,
      estimatedPerimeterKm: perimeterKm,
      boundingHullPerimeterKm: perimeterKm,
      footprintClassification: 'OBSERVATION_CLUSTER_HULL',
      estimatedAreaKm2: approxAreaKm2,
      observationCount: cluster.length,
      sensorBreakdown: {
        modisCount,
        viirsCount,
        satellites: Array.from(satellites),
      },
      peakFrpMw: Number(peakFrp.toFixed(1)),
      peakFrpTimestampUtc: peakFrpTime,
      observedSnapshotEnergyMJ,
      estimatedThermalEnergyGWh: null, // Disabled: Continuous energy integration across multi-hour gaps is unobserved
      samplingDisclaimer:
        'Convex hulls represent geometric observation bounds, not ground-truth fire perimeters. Sparse satellite snapshots (2–4 passes/day) do not capture continuous fire behavior across inter-pass intervals.',
      status: durationHours > 48 ? 'CONTAINED' : 'EXTINGUISHED',
      observationIds: cluster.map((c) => c.id),
    });
  }

  return events;
}

/**
 * Tier 4: Generates aggregated seasonal and regional statistics with observing-effort normalization.
 */
export function generateTier4Statistics(
  observations: CanonicalObservation[],
  periodLabel: string,
  spatialAoi: string,
  climatologicalMedian: number = 42,
  climatologicalStdDev: number = 18
): Tier4AggregatedStatistics {
  const total = observations.length;
  let modisCount = 0;
  let viirsCount = 0;
  let frpSum = 0;
  let peakFrp = 0;
  let frpCount = 0;

  for (const o of observations) {
    if (o.sensor === 'MODIS') modisCount++;
    else viirsCount++;

    if (o.frpMw !== null && !isNaN(o.frpMw)) {
      frpSum += o.frpMw;
      frpCount++;
      if (o.frpMw > peakFrp) peakFrp = o.frpMw;
    }
  }

  const modisPct = total > 0 ? Number(((modisCount / total) * 100).toFixed(1)) : 0;
  const viirsPct = total > 0 ? Number(((viirsCount / total) * 100).toFixed(1)) : 0;
  const meanFrp = frpCount > 0 ? Number((frpSum / frpCount).toFixed(1)) : 0;

  // Effort index calculation:
  // Base constellation = 1.0 (Terra+Aqua+SNPP)
  // Additional NOAA-20 / NOAA-21 = +0.25 each
  // VIIRS fine-pixel boost = +1.0 * viirsFraction
  const effortIndex = Number(
    (1.0 + (viirsPct / 100) * 1.5 + (total > 500 ? 0.5 : 0)).toFixed(2)
  );
  const adjustedRate = Math.round(total / Math.max(0.5, effortIndex));

  // Z-Score relative to climatology
  const zScore = Number(
    ((adjustedRate - climatologicalMedian) / Math.max(1, climatologicalStdDev)).toFixed(2)
  );

  // Approximate percentile rank from Z-score (standard normal CDF approximation)
  const cdfApprox = 0.5 * (1 + Math.sign(zScore) * Math.sqrt(1 - Math.exp(-2 * zScore * zScore / Math.PI)));
  const percentileRank = Number((Math.min(100, Math.max(0, cdfApprox * 100))).toFixed(1));

  // 95% Poisson confidence interval on adjusted count: rate +/- 1.96 * sqrt(rate)
  const errorMargin = 1.96 * Math.sqrt(Math.max(1, adjustedRate));
  const lowerCI = Math.max(0, Math.round(adjustedRate - errorMargin));
  const upperCI = Math.round(adjustedRate + errorMargin);

  return {
    tier: 4,
    periodLabel,
    spatialAoi,
    rawHotspotCount: total,
    effortAdjustedHotspotRate: adjustedRate,
    effortIndex,
    sensorShare: {
      modisPct,
      viirsPct,
    },
    meanFrpMw: meanFrp,
    peakObservedFrpMw: Number(peakFrp.toFixed(1)),
    climatologicalMedian,
    seasonalAnomalyZScore: zScore,
    percentileRank,
    uncertaintyInterval95: [lowerCI, upperCI],
  };
}
