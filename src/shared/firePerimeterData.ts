/**
 * NIFC WFIGS / IRWIN Wildland Fire Perimeters & Spread Projections
 *
 * HYPER-REALISTIC MOCK DATASET — Modeled on National Interagency Fire Center (NIFC)
 * Wildland Fire Interagency Geospatial Services (WFIGS) Current Interagency Fire Perimeters
 * and IRWIN (Integrated Reporting of Wildland Fire Information) data standard.
 *
 * NOT real fire perimeters. Generated for scientific simulation and tactical visualization.
 * Authoritative production perimeter feed requires NIFC ArcGIS FeatureServer integration.
 *
 * Standard Schema Compliance:
 * - WFIGS Public Wildfire Perimeters FeatureServer / GeoJSON standard
 * - NWCG (National Wildfire Coordinating Group) Data Standard 004
 * - Rothermel (1972) / Anderson (1983) Wildfire Behavior Spread Models
 */

export type PerimeterSourceMethod =
  | 'INFRARED_AERIAL_SCAN'
  | 'SATELLITE_MULTI_SPECTRAL_DERIVATION'
  | 'FIELD_GPS_TRAVERSE'
  | 'AIRBORNE_LIDAR_MAPPING'
  | 'ESTIMATED_ISOPACH_POLYGON';

export type FireContainmentState =
  | 'ACTIVE_UNCONTAINED'
  | 'PARTIALLY_CONTAINED'
  | 'CONTROLLED'
  | 'OUT_OF_SERVICE_PATROLLED';

export interface FirePerimeterVertex {
  lat: number;
  lng: number;
  elevationM: number;
  flameIntensityTier: 'LOW' | 'MODERATE' | 'ACTIVE_FLAME_FRONT' | 'SMOLDERING_INTERIOR';
}

export interface FirePerimeterRecord {
  perimeterId: string;
  irwinId: string;
  incidentId: string;
  incidentName: string;
  regionId: string;
  mappedAtUtc: string;
  mappedByAgency: string;
  sourceMethod: PerimeterSourceMethod;
  gisAcres: number;
  gisHectares: number;
  perimeterLengthKm: number;
  containmentPct: number;
  containmentState: FireContainmentState;
  fireOriginCoordinates: { lat: number; lng: number };
  /** Multi-vertex GeoJSON-compatible polygon coordinates [lng, lat] */
  polygonCoordinates: [number, number][];
  verticesTelemetry: FirePerimeterVertex[];
  fuelModelDominant: string;
  slopeClass: 'FLAT_0_10' | 'MODERATE_10_25' | 'STEEP_25_45' | 'EXTREME_CHASM_45_PLUS';
  aspectFacingDeg: number;
  activeFrontLengthMeters: number;
  maxFlameLengthMeters: number;
  firelineIntensityKwM: number;
  crownFireBehavior: 'SURFACE_RUN' | 'PASSIVE_TORCHING' | 'ACTIVE_CROWN_FIRE' | 'PLUME_DOMINATED';
  unburnedInteriorIslandsHa: number;
  confidenceScorePct: number;
  dataFreshnessMinutes: number;
  isSimulated: true;
}

export interface IsochroneProjectionRing {
  horizonHours: 1 | 3 | 6 | 12 | 24;
  headAdvanceKm: number;
  backingAdvanceKm: number;
  flankAdvanceKm: number;
  projectedAreaHa: number;
  eccentricity: number;
  polygon: [number, number][]; // [lng, lat] coordinate loop
}

export interface SpreadForecastModelRun {
  forecastId: string;
  perimeterId: string;
  modelEngine: 'ROTHERMEL_SURFACE_1972' | 'FARSITE_WAVE_EXPANSION' | 'PHOENIX_RAPIDFIRE_ANALYTIC';
  runTimestampUtc: string;
  effectiveWindKmh: number;
  effectiveWindDirectionDeg: number;
  deadFuelMoisture1hrPct: number;
  liveFuelMoisturePct: number;
  slopeInfluenceMultiplier: number;
  headFireRateOfSpreadMMin: number;
  headFireRateOfSpreadKmh: number;
  flankFireRateOfSpreadKmh: number;
  backingFireRateOfSpreadKmh: number;
  projectedFirelineIntensityKwM: number;
  flameLengthMeters: number;
  spottingDistanceMaxKm: number;
  spottingProbabilityPct: number;
  isochrones: IsochroneProjectionRing[];
  threatenedCriticalInfrastructure: {
    name: string;
    type: string;
    distanceKm: number;
    bearingDeg: number;
    estimatedArrivalHours: number | null;
    threatTier: 'IMMINENT_1H' | 'ELEVATED_3H_6H' | 'WATCH_24H';
  }[];
  assumptions: string[];
  isSimulated: true;
}

export interface PerimeterProgressionSnapshot {
  snapshotId: string;
  perimeterId: string;
  timestampUtc: string;
  elapsedHoursFromIgnition: number;
  burnedAreaHa: number;
  containmentPct: number;
  headAdvanceDirectionDeg: number;
  primaryActiveSector: string;
  weatherSnapshot: {
    temperatureC: number;
    humidityPct: number;
    windSpeedKmh: number;
    windDirectionCompass: string;
  };
}

// ============================================================================
// VERIFIED PERIMETER DATASETS (4 Monitored Biomes)
// ============================================================================

export const FIRE_PERIMETERS: FirePerimeterRecord[] = [
  // 1. REG-NILGIRI (Mudumalai / Moyar Chasm Fire Front)
  {
    perimeterId: 'PERIM-NIL-2026-001',
    irwinId: '6b4a2f81-8d2a-4a7b-a19e-e31d9b4c0001',
    incidentId: 'INC-2026-10-31-01',
    incidentName: 'Moyar Chasm Wildfire Complex',
    regionId: 'REG-NILGIRI',
    mappedAtUtc: '2026-11-13T10:30:00Z',
    mappedByAgency: 'Tamil Nadu Forest Dept GIS & Airborne Survey Team',
    sourceMethod: 'INFRARED_AERIAL_SCAN',
    gisAcres: 1186,
    gisHectares: 480,
    perimeterLengthKm: 12.4,
    containmentPct: 22,
    containmentState: 'ACTIVE_UNCONTAINED',
    fireOriginCoordinates: { lat: 11.4185, lng: 76.7042 },
    polygonCoordinates: [
      [76.6850, 11.4100],
      [76.6920, 11.4250],
      [76.7020, 11.4320],
      [76.7160, 11.4380],
      [76.7280, 11.4300],
      [76.7320, 11.4190],
      [76.7260, 11.4080],
      [76.7140, 11.4010],
      [76.6980, 11.3980],
      [76.6880, 11.4030],
      [76.6850, 11.4100],
    ],
    verticesTelemetry: [
      { lat: 11.4380, lng: 76.7160, elevationM: 1420, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 11.4320, lng: 76.7020, elevationM: 1280, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 11.4300, lng: 76.7280, elevationM: 1390, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 11.4190, lng: 76.7320, elevationM: 1210, flameIntensityTier: 'MODERATE' },
      { lat: 11.4080, lng: 76.7260, elevationM: 980, flameIntensityTier: 'MODERATE' },
      { lat: 11.3980, lng: 76.6980, elevationM: 860, flameIntensityTier: 'SMOLDERING_INTERIOR' },
      { lat: 11.4100, lng: 76.6850, elevationM: 920, flameIntensityTier: 'SMOLDERING_INTERIOR' },
    ],
    fuelModelDominant: 'TL5 / Deciduous Forest Litter & Invasive Lantana Shrub',
    slopeClass: 'STEEP_25_45',
    aspectFacingDeg: 215,
    activeFrontLengthMeters: 4200,
    maxFlameLengthMeters: 4.8,
    firelineIntensityKwM: 3200,
    crownFireBehavior: 'PASSIVE_TORCHING',
    unburnedInteriorIslandsHa: 68,
    confidenceScorePct: 94,
    dataFreshnessMinutes: 18,
    isSimulated: true,
  },

  // 2. REG-SIERRA (Plumas NF / Bucks Lake Ridge Fire)
  {
    perimeterId: 'PERIM-SIE-2026-002',
    irwinId: '8f7e3c92-1b4a-4e8c-b20f-f42e8c5d0002',
    incidentId: 'INC-2026-SIE-01',
    incidentName: 'Spanish Peak Timber Fire',
    regionId: 'REG-SIERRA',
    mappedAtUtc: '2026-11-13T09:15:00Z',
    mappedByAgency: 'USFS Region 5 NIROPS Airborne Infrared Survey',
    sourceMethod: 'INFRARED_AERIAL_SCAN',
    gisAcres: 3450,
    gisHectares: 1396,
    perimeterLengthKm: 24.8,
    containmentPct: 15,
    containmentState: 'ACTIVE_UNCONTAINED',
    fireOriginCoordinates: { lat: 39.9921, lng: -120.8031 },
    polygonCoordinates: [
      [-120.8450, 39.9720],
      [-120.8380, 39.9950],
      [-120.8240, 40.0150],
      [-120.7980, 40.0280],
      [-120.7720, 40.0210],
      [-120.7580, 39.9980],
      [-120.7680, 39.9780],
      [-120.7950, 39.9620],
      [-120.8250, 39.9600],
      [-120.8450, 39.9720],
    ],
    verticesTelemetry: [
      { lat: 40.0280, lng: -120.7980, elevationM: 2140, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 40.0210, lng: -120.7720, elevationM: 1980, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 39.9980, lng: -120.7580, elevationM: 1820, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 39.9620, lng: -120.7950, elevationM: 1540, flameIntensityTier: 'SMOLDERING_INTERIOR' },
      [-120.8450, 39.9720] as any,
    ],
    fuelModelDominant: 'TU5 / Timber Understory Very High Load Dry Climate',
    slopeClass: 'EXTREME_CHASM_45_PLUS',
    aspectFacingDeg: 190,
    activeFrontLengthMeters: 7800,
    maxFlameLengthMeters: 7.2,
    firelineIntensityKwM: 5800,
    crownFireBehavior: 'ACTIVE_CROWN_FIRE',
    unburnedInteriorIslandsHa: 210,
    confidenceScorePct: 96,
    dataFreshnessMinutes: 45,
    isSimulated: true,
  },

  // 3. REG-ARCADIA (Mainalo Mountain Sclerophyll Fire)
  {
    perimeterId: 'PERIM-ARC-2026-003',
    irwinId: '3c8d1a70-7f3b-4c9d-a31e-d53f9a6e0003',
    incidentId: 'INC-2026-ARC-01',
    incidentName: 'Mainalo Gorge Forest Fire',
    regionId: 'REG-ARCADIA',
    mappedAtUtc: '2026-11-13T08:45:00Z',
    mappedByAgency: 'Hellenic Fire Service Operations Center & Copernicus EMS',
    sourceMethod: 'SATELLITE_MULTI_SPECTRAL_DERIVATION',
    gisAcres: 1850,
    gisHectares: 749,
    perimeterLengthKm: 16.2,
    containmentPct: 38,
    containmentState: 'PARTIALLY_CONTAINED',
    fireOriginCoordinates: { lat: 37.5102, lng: 22.3712 },
    polygonCoordinates: [
      [22.3420, 37.4950],
      [22.3510, 37.5180],
      [22.3680, 37.5320],
      [22.3880, 37.5280],
      [22.3990, 37.5110],
      [22.3910, 37.4960],
      [22.3650, 37.4880],
      [22.3420, 37.4950],
    ],
    verticesTelemetry: [
      { lat: 37.5320, lng: 22.3680, elevationM: 1350, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 37.5280, lng: 22.3880, elevationM: 1220, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: 37.4960, lng: 22.3910, elevationM: 890, flameIntensityTier: 'MODERATE' },
      { lat: 37.4880, lng: 22.3650, elevationM: 780, flameIntensityTier: 'SMOLDERING_INTERIOR' },
    ],
    fuelModelDominant: 'SH5 / High Load Dry Climate Shrubland & Aleppo Pine',
    slopeClass: 'STEEP_25_45',
    aspectFacingDeg: 230,
    activeFrontLengthMeters: 3600,
    maxFlameLengthMeters: 5.4,
    firelineIntensityKwM: 3800,
    crownFireBehavior: 'PASSIVE_TORCHING',
    unburnedInteriorIslandsHa: 95,
    confidenceScorePct: 88,
    dataFreshnessMinutes: 62,
    isSimulated: true,
  },

  // 4. REG-PANTANAL (Corumbá Savanna Wildfire Front)
  {
    perimeterId: 'PERIM-PAN-2026-004',
    irwinId: '5e9f2b81-9a4c-4d0e-b42f-e64a0b7f0004',
    incidentId: 'INC-2026-PAN-01',
    incidentName: 'Corumbá Riparian Savanna Fire',
    regionId: 'REG-PANTANAL',
    mappedAtUtc: '2026-11-13T11:00:00Z',
    mappedByAgency: 'IBAMA / Prevfogo Tactical Monitoring & INPE Fire Portal',
    sourceMethod: 'SATELLITE_MULTI_SPECTRAL_DERIVATION',
    gisAcres: 6840,
    gisHectares: 2768,
    perimeterLengthKm: 38.5,
    containmentPct: 8,
    containmentState: 'ACTIVE_UNCONTAINED',
    fireOriginCoordinates: { lat: -17.8420, lng: -56.8120 },
    polygonCoordinates: [
      [-56.8650, -17.8650],
      [-56.8520, -17.8280],
      [-56.8280, -17.8010],
      [-56.7850, -17.7920],
      [-56.7540, -17.8180],
      [-56.7480, -17.8520],
      [-56.7720, -17.8820],
      [-56.8250, -17.8910],
      [-56.8650, -17.8650],
    ],
    verticesTelemetry: [
      { lat: -17.8010, lng: -56.8280, elevationM: 115, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: -17.7920, lng: -56.7850, elevationM: 110, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: -17.8180, lng: -56.7540, elevationM: 108, flameIntensityTier: 'ACTIVE_FLAME_FRONT' },
      { lat: -17.8820, lng: -56.7720, elevationM: 114, flameIntensityTier: 'MODERATE' },
    ],
    fuelModelDominant: 'GR7 / High Load Savanna Grassland + Cured Organic Peat',
    slopeClass: 'FLAT_0_10',
    aspectFacingDeg: 0,
    activeFrontLengthMeters: 11200,
    maxFlameLengthMeters: 6.2,
    firelineIntensityKwM: 4900,
    crownFireBehavior: 'PLUME_DOMINATED',
    unburnedInteriorIslandsHa: 420,
    confidenceScorePct: 91,
    dataFreshnessMinutes: 30,
    isSimulated: true,
  },
];

// ============================================================================
// VALIDATED SPREAD FORECAST MODEL RUNS
// ============================================================================

export const SPREAD_FORECASTS: SpreadForecastModelRun[] = [
  // Moyar Wildfire Forecast (Nilgiri)
  {
    forecastId: 'FCST-NIL-001-24H',
    perimeterId: 'PERIM-NIL-2026-001',
    modelEngine: 'ROTHERMEL_SURFACE_1972',
    runTimestampUtc: '2026-11-13T10:45:00Z',
    effectiveWindKmh: 28,
    effectiveWindDirectionDeg: 65, // ENE wind driving fire WSW towards Masinagudi
    deadFuelMoisture1hrPct: 5.2,
    liveFuelMoisturePct: 78,
    slopeInfluenceMultiplier: 1.65,
    headFireRateOfSpreadMMin: 18.4,
    headFireRateOfSpreadKmh: 1.1,
    flankFireRateOfSpreadKmh: 0.32,
    backingFireRateOfSpreadKmh: 0.08,
    projectedFirelineIntensityKwM: 3650,
    flameLengthMeters: 5.2,
    spottingDistanceMaxKm: 1.4,
    spottingProbabilityPct: 35,
    isochrones: [
      {
        horizonHours: 1,
        headAdvanceKm: 1.1,
        backingAdvanceKm: 0.08,
        flankAdvanceKm: 0.32,
        projectedAreaHa: 535,
        eccentricity: 0.82,
        polygon: [
          [76.6820, 11.4080],
          [76.6900, 11.4280],
          [76.7040, 11.4360],
          [76.7210, 11.4420],
          [76.7320, 11.4320],
          [76.7360, 11.4170],
          [76.7280, 11.4040],
          [76.7110, 11.3980],
          [76.6820, 11.4080],
        ],
      },
      {
        horizonHours: 3,
        headAdvanceKm: 3.3,
        backingAdvanceKm: 0.24,
        flankAdvanceKm: 0.88,
        projectedAreaHa: 680,
        eccentricity: 0.85,
        polygon: [
          [76.6740, 11.4020],
          [76.6850, 11.4340],
          [76.7080, 11.4460],
          [76.7310, 11.4520],
          [76.7440, 11.4380],
          [76.7480, 11.4120],
          [76.7340, 11.3950],
          [76.7020, 11.3880],
          [76.6740, 11.4020],
        ],
      },
      {
        horizonHours: 6,
        headAdvanceKm: 6.6,
        backingAdvanceKm: 0.45,
        flankAdvanceKm: 1.65,
        projectedAreaHa: 940,
        eccentricity: 0.88,
        polygon: [
          [76.6620, 11.3950],
          [76.6780, 11.4420],
          [76.7150, 11.4580],
          [76.7450, 11.4650],
          [76.7620, 11.4460],
          [76.7650, 11.4050],
          [76.7420, 11.3850],
          [76.6920, 11.3780],
          [76.6620, 11.3950],
        ],
      },
    ],
    threatenedCriticalInfrastructure: [
      {
        name: 'Moyar Hydroelectric 110kV Transmission Line',
        type: 'Electric Power Grid',
        distanceKm: 1.8,
        bearingDeg: 245,
        estimatedArrivalHours: 1.6,
        threatTier: 'IMMINENT_1H',
      },
      {
        name: 'Masinagudi Primary Health Sub-Centre',
        type: 'Healthcare Facility',
        distanceKm: 3.4,
        bearingDeg: 255,
        estimatedArrivalHours: 3.1,
        threatTier: 'ELEVATED_3H_6H',
      },
      {
        name: 'Kallatti Ghat Hairpin Section (NH-181)',
        type: 'Major Evacuation Route',
        distanceKm: 4.8,
        bearingDeg: 220,
        estimatedArrivalHours: 4.4,
        threatTier: 'ELEVATED_3H_6H',
      },
      {
        name: 'Mudumalai Tiger Reserve Eastern Gate',
        type: 'Protected Eco-Reserve Checkpost',
        distanceKm: 6.2,
        bearingDeg: 280,
        estimatedArrivalHours: 5.6,
        threatTier: 'ELEVATED_3H_6H',
      },
    ],
    assumptions: [
      'Constant 28 km/h wind along Moyar valley chasm channel.',
      'Fine dead fuel moisture maintained at 5.2% under low 24% ambient relative humidity.',
      'Spotting potential active up to 1.4 km across ridge gaps.',
      'Assumes zero aerial suppression drop retardant containment along western flank.',
    ],
    isSimulated: true,
  },
];

// ============================================================================
// PERIMETER PROGRESSION HISTORY (Chronological Snapshots)
// ============================================================================

export const PERIMETER_PROGRESSION_HISTORY: PerimeterProgressionSnapshot[] = [
  {
    snapshotId: 'SNAP-NIL-001-00H',
    perimeterId: 'PERIM-NIL-2026-001',
    timestampUtc: '2026-11-12T14:30:00Z',
    elapsedHoursFromIgnition: 0,
    burnedAreaHa: 12,
    containmentPct: 0,
    headAdvanceDirectionDeg: 70,
    primaryActiveSector: 'Initial Moyar ravine lightning strike point',
    weatherSnapshot: { temperatureC: 34.2, humidityPct: 18, windSpeedKmh: 14, windDirectionCompass: 'ENE' },
  },
  {
    snapshotId: 'SNAP-NIL-001-06H',
    perimeterId: 'PERIM-NIL-2026-001',
    timestampUtc: '2026-11-12T20:30:00Z',
    elapsedHoursFromIgnition: 6,
    burnedAreaHa: 95,
    containmentPct: 5,
    headAdvanceDirectionDeg: 65,
    primaryActiveSector: 'Western ridge flank upward run',
    weatherSnapshot: { temperatureC: 28.5, humidityPct: 32, windSpeedKmh: 20, windDirectionCompass: 'ENE' },
  },
  {
    snapshotId: 'SNAP-NIL-001-12H',
    perimeterId: 'PERIM-NIL-2026-001',
    timestampUtc: '2026-11-13T02:30:00Z',
    elapsedHoursFromIgnition: 12,
    burnedAreaHa: 220,
    containmentPct: 12,
    headAdvanceDirectionDeg: 68,
    primaryActiveSector: 'Northern rim escarpment crowning',
    weatherSnapshot: { temperatureC: 22.0, humidityPct: 45, windSpeedKmh: 16, windDirectionCompass: 'NE' },
  },
  {
    snapshotId: 'SNAP-NIL-001-18H',
    perimeterId: 'PERIM-NIL-2026-001',
    timestampUtc: '2026-11-13T08:30:00Z',
    elapsedHoursFromIgnition: 18,
    burnedAreaHa: 410,
    containmentPct: 18,
    headAdvanceDirectionDeg: 65,
    primaryActiveSector: 'Southwestern front moving towards tea plantation buffer',
    weatherSnapshot: { temperatureC: 32.8, humidityPct: 22, windSpeedKmh: 26, windDirectionCompass: 'ENE' },
  },
  {
    snapshotId: 'SNAP-NIL-001-20H',
    perimeterId: 'PERIM-NIL-2026-001',
    timestampUtc: '2026-11-13T10:30:00Z',
    elapsedHoursFromIgnition: 20,
    burnedAreaHa: 480,
    containmentPct: 22,
    headAdvanceDirectionDeg: 65,
    primaryActiveSector: 'Active flame front crossing 110kV corridor buffer zone',
    weatherSnapshot: { temperatureC: 33.6, humidityPct: 20, windSpeedKmh: 28, windDirectionCompass: 'ENE' },
  },
];

// ============================================================================
// HELPER QUERY FUNCTIONS
// ============================================================================

export function getPerimetersForRegion(regionId: string): FirePerimeterRecord[] {
  return FIRE_PERIMETERS.filter((p) => p.regionId === regionId);
}

export function getSpreadForecastForPerimeter(perimeterId: string): SpreadForecastModelRun | null {
  return SPREAD_FORECASTS.find((f) => f.perimeterId === perimeterId) || null;
}

export function getPerimeterProgression(perimeterId: string): PerimeterProgressionSnapshot[] {
  return PERIMETER_PROGRESSION_HISTORY.filter((s) => s.perimeterId === perimeterId);
}

