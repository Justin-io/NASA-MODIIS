/**
 * FireLens Canonical Earth Observation Schema — v3.0.0
 * NASA EOSDIS FIRMS & MCD64A1 Research-Grade Data Standard
 *
 * Designed to answer: "Are we observing more burning, or are changes in
 * the satellite observing system influencing what we see?"
 *
 * Strict Data Principles:
 * 1. Zero synthetic defaults: Missing physical properties remain null.
 * 2. Native confidence preservation: Never force categorical VIIRS into fake numeric percentages.
 * 3. Sensor-native geometry: Store scan and track dimensions to compute physical bowtie expansion.
 * 4. Full provenance: Preserve query parameters, source URL/granule, ingest timestamp, and SHA-256 payload checksum.
 */

export type PlatformSatellite =
  | 'Terra'
  | 'Aqua'
  | 'Suomi-NPP'
  | 'NOAA-20'
  | 'NOAA-21'
  | 'Sentinel-2A'
  | 'Sentinel-2B'
  | 'Landsat-8'
  | 'Landsat-9';

export type SensorProductLayer =
  | 'MODIS_1KM'       // MODIS 1.0 km nadir (MOD14 / MYD14 Collection 6.1)
  | 'VIIRS_375M'      // VIIRS I-band 375 m nadir (VNP14IMG / VJ114IMG)
  | 'VIIRS_750M'      // VIIRS M-band 750 m continuity (VNP14)
  | 'MCD64A1_BA';     // MODIS 500 m Monthly Burned Area Collection 6.1 (Independent Outcome)

export type ViirsNativeConfidence = 'low' | 'nominal' | 'high';
export type ModisNativeConfidence = number; // 0–100 integer percentage

export type ViewZenithBin =
  | 'nadir_0_20'      // View zenith angle 0°–20° (minimal distortion)
  | 'mid_20_45'       // View zenith angle 20°–45° (moderate bowtie growth)
  | 'limb_45_65';     // View zenith angle >45° (extreme limb pixel elongation, up to 4.8x)

export type CloudQualityFlag =
  | 'cloud_free'
  | 'probable_cloud'
  | 'cloud_occluded'
  | 'sunglint'
  | 'water_pixel'
  | 'qa_unassessed';

/**
 * Single canonical Earth observation record preserving complete sensor-native fidelity.
 */
export interface CanonicalObservation {
  // Provenance & Identity
  id: string;                                // Deterministic natural key: FIRMS-{sensor}-{sat}-{lat}-{lng}-{acqTime}
  granuleOrSourceUrl: string;                // NASA EOSDIS query URL or Granule ID
  queryParams: Record<string, string | number>; // e.g. { source: 'VIIRS_NOAA20_SP', aoi: '76.2,11.0,77.3,12.0', days: 5 }
  provenanceVersion: string;                 // e.g. 'NASA_FIRMS_COL6.1_V2'
  rawPayloadChecksumSha256: string;          // Hex SHA-256 hash of original CSV line / response
  acquisitionTimestampUtc: string;           // ISO 8601 UTC timestamp of scan pass
  ingestionTimestampUtc: string;             // ISO 8601 UTC timestamp of ALEX ingestion
  localSolarTimeHours: number;               // Approximate Local Solar Time: UTC + lng / 15.0

  // Instrument & Satellite Platform
  satellite: PlatformSatellite;
  sensor: 'MODIS' | 'VIIRS' | 'MSI' | 'OLI';
  productLayer: SensorProductLayer;
  orbitPass: 'Ascending' | 'Descending' | 'Unknown';
  dayNight: 'D' | 'N';

  // Geodetic Location (WGS84)
  latitude: number;                          // 5-decimal precision (~1.1 meter nominal)
  longitude: number;

  // Sensor Viewing Geometry & Bowtie Distortion
  scanKm: number | null;                     // Pixel dimension along scan direction (km)
  trackKm: number | null;                    // Pixel dimension along track direction (km)
  pixelAreaKm2: number;                      // Elliptical footprint area: pi * (scan/2) * (track/2)
  viewZenithBin: ViewZenithBin;              // Nadir vs Mid vs Limb classification
  viewZenithAngleDeg: number | null;         // Calculated viewing zenith angle if derivable from scan/track

  // Physical Measurements (Null-Preserving)
  frpMw: number | null;                      // Fire Radiative Power (MW)
  brightnessKelvin: number | null;           // Primary thermal channel (MODIS Ch 21/22 4µm or VIIRS I4 3.74µm)
  backgroundBrightnessKelvin: number | null; // Background channel (MODIS Ch 31 11µm or VIIRS I5 11.45µm)

  // Confidence (Native Representation)
  modisConfidencePct: ModisNativeConfidence | null;
  viirsConfidenceCategory: ViirsNativeConfidence | null;

  // Quality & Environment
  qaCloudFlag: CloudQualityFlag;
  fireType: number | null;                   // 0: presumed veg fire, 1: active volcano, 2: other static, 3: offshore

  // Study Context
  studyAoi: 'REG-NILGIRI' | 'AOI-NILGIRIS-BHAVANI' | 'OTHER';
}

/**
 * Multi-Sensor Harmonized Thermal Cluster Hypothesis.
 * Strictest physical constraint: NEVER merge observations across different overpasses
 * separated by more than the instantaneous overpass window (<= 15 minutes).
 */
export interface HarmonizedPassHypothesis {
  id: string;                                // HYP-{date}-{passId}-{centroidLat}-{centroidLng}
  passTimestampUtc: string;                  // Platform overpass midpoint
  passWindowMinutes: number;                 // <= 15 minutes
  centroidLatitude: number;
  centroidLongitude: number;
  uncertaintySemiMajorKm: number;            // Major axis of spatial uncertainty ellipse
  uncertaintySemiMinorKm: number;            // Minor axis of spatial uncertainty ellipse
  uncertaintyRadiusMeters: number;           // Circularized conservative radius for UI
  contributingObservationCount: number;
  sensorBreakdown: Record<string, {
    count: number;
    frpMw: number | null;
    peakBrightnessK: number | null;
    satellites: PlatformSatellite[];
    nativeConfidence: string;
  }>;
  peakFrpMw: number | null;                  // Peak observed instantaneous FRP in this pass (NEVER averaged across passes)
  primarySensor: 'MODIS' | 'VIIRS';
  primaryProductLayer: SensorProductLayer;
  footprintAreaKm2: number;
  qaPassed: boolean;
}

/**
 * Independent Ground Truth Validation Record from MCD64A1 Burned Area Product.
 */
export interface Mcd64BurnedAreaGroundTruth {
  monthYear: string;                         // '2024-03'
  burnedAreaHectares: number;                // Total burned area detected by MCD64A1 500m reflectance changes
  pixelCount: number;                        // Number of 500m pixels flagged as burned
  uncertaintyHectares: number;
  confidenceScore: number;                   // 0–100 QA score from MCD64A1 QA layer
  isTemporallyHeldOut: boolean;              // Held out for out-of-sample validation (e.g. 2024–2026)
}

/**
 * Observation Effort Decomposition Summary for a Study Period.
 * Answers: "Can we distinguish more burning from better observation?"
 */
export interface ObservationEffortDecomposition {
  studyAoi: string;
  baselinePeriod: string;                    // '2019-2021' (MODIS + Early SNPP)
  currentPeriod: string;                     // '2023-2026' (Full Constellation: Terra + Aqua + SNPP + NOAA-20 + NOAA-21)
  
  // Apparent Observations
  baselineRawHotspots: number;
  currentRawHotspots: number;
  apparentGrowthRatePct: number;             // ((Current - Baseline) / Baseline) * 100

  // Observing Effort Multipliers
  constellationSamplingRatio: number;        // Growth in daily overpass frequency (e.g. 2.1x from NOAA-20/21)
  spatialResolutionSensitivityRatio: number; // Sensitivity boost from 375m vs 1000m pixels (~3.4x in small understory fires)
  cloudValidOpportunityFraction: number;     // Ratio of cloud-free observing opportunities
  terraMlstDriftAdjustmentPct: number;       // Effect of Terra crossing time shifting from 10:30 AM to ~09:00 AM

  // Adjusted True Physical Burning
  observationEffortIndex: number;            // Combined observing effort multiplier E
  adjustedBaselineHotspotRate: number;
  adjustedCurrentHotspotRate: number;
  adjustedTrueGrowthRatePct: number;         // Growth after normalizing for observing effort

  // Causal Attribution & Bootstrap Uncertainty
  attributableToObservingEffortPct: number;   // % of apparent increase caused by satellite changes
  attributableToActualBurningPct: number;     // % of apparent increase representing actual on-ground burning
  bootstrapConfidenceInterval95: {
    effortLowerPct: number;                  // 2.5th percentile (e.g. 64.2%)
    effortUpperPct: number;                  // 97.5th percentile (e.g. 81.8%)
    burningLowerPct: number;
    burningUpperPct: number;
    iterations: number;                      // 1,000 bootstrap resamples
  };

  // Ground Truth Independent Concordance (MCD64A1)
  mcd64a1BurnedAreaTrendPct: number;         // Growth in independent monthly burned area hectares
  rawHotspotMcd64ConcordanceR2: number;      // R^2 between raw counts and burned area (often inflated/distorted)
  adjustedHotspotMcd64ConcordanceR2: number; // R^2 between effort-adjusted rate and burned area (true physical correlation)

  // Statistical & Methodological Transparency
  methodologicalNotes?: string[];
  rateRatioDecomposition?: {
    rawRateRatio: number;
    effortMultiplierRatio: number;
    trueBurningRateRatio: number;
    logAttributableEffortPct: number;
  };
}

