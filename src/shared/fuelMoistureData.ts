/**
 * HYPER-REALISTIC MOCK DATA — Fuel Moisture, Vegetation Condition & Soil Moisture
 *
 * Modeled on NFDRS (National Fire Danger Rating System) station data format,
 * RAWS (Remote Automated Weather Stations) FW21 output, NASA SMAP L4 soil moisture,
 * and MODIS/VIIRS NDVI-derived vegetation condition indices.
 *
 * NOT real measurements. For demonstration and UI development only.
 * Real data requires RAWS/MesoWest API, NASA SMAP Earthdata, and MODIS NDVI pipelines.
 *
 * DATA PROVENANCE NOTICE:
 * - Fuel moisture models: Nelson Dead Fuel Moisture Model + Growing Season Index (GSI)
 * - Soil moisture reference: NASA SMAP L4 9km grid product
 * - Vegetation condition: MODIS MOD13Q1 250m 16-day NDVI composite
 * - Station format: NWCG FW21 hourly weather observation standard
 */

// ============================================================================
// TYPES
// ============================================================================

export type FuelTimelagClass = '1hr' | '10hr' | '100hr' | '1000hr';
export type VegetationConditionClass = 'cured' | 'stressed' | 'transitioning' | 'green' | 'lush';
export type DroughtIndex = 'D0_abnormally_dry' | 'D1_moderate' | 'D2_severe' | 'D3_extreme' | 'D4_exceptional' | 'none';

export interface FuelMoistureStation {
  stationId: string;
  stationName: string;
  networkType: 'RAWS' | 'NFDRS_MANUAL' | 'RESEARCH_PLOT' | 'SIMULATED';
  regionId: string;
  coordinates: { lat: number; lng: number };
  elevationMeters: number;
  fuelModelNFDRS: string; // e.g., 'G' (short grass), 'F' (intermediate brush), 'T' (timber)
  slopeClassPct: number;
  aspectDeg: number;
  installedDate: string;
  operationalStatus: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE' | 'SIMULATED';
  dataSource: 'MOCK_NFDRS_MODELED';
  lastObservation: string;
}

export interface FuelMoistureObservation {
  stationId: string;
  regionId: string;
  observedAt: string;
  /** Dead fuel moisture by timelag class (% of oven-dry weight) */
  deadFuelMoisture: {
    oneHourPct: number;    // Fine twigs <6mm: 2-35%, typical fire range 2-8%
    tenHourPct: number;    // 6-25mm diameter: 3-25%
    hundredHourPct: number; // 25-75mm: 5-30%
    thousandHourPct: number; // >75mm: 10-40%, changes very slowly
  };
  /** Live fuel moisture (% of oven-dry weight) */
  liveFuelMoisture: {
    herbaceousPct: number; // Grasses/forbs: 30-300% (30=cured, 300=peak green)
    woodyPct: number;      // Shrub foliage: 60-200% (60=critically dry, 200=spring flush)
  };
  /** Derived NFDRS indices */
  energyReleaseComponent: number; // ERC: 0-120+, fire energy potential
  spreadComponent: number;        // SC: 0-200+, rate of spread potential
  burningIndex: number;           // BI: 0-200+, fire suppression difficulty
  ignitionComponent: number;      // IC: 0-100, probability of firebrand ignition
  /** Vegetation condition from NDVI */
  ndviValue: number;              // -0.1 to 0.9 (0.2=bare, 0.8=dense green)
  vegetationCondition: VegetationConditionClass;
  vegetationAnomalyPct: number;   // vs 20-year mean: -40% to +30%
  /** NASA SMAP-modeled soil moisture */
  soilMoistureSurfacePct: number; // 0-5cm depth: 2-50%
  soilMoistureRootzPct: number;   // 0-100cm depth: 5-45%
  soilMoistureAnomalyPct: number; // vs climatological mean
  /** Drought assessment */
  droughtCategory: DroughtIndex;
  keetchByramDroughtIndex: number; // KBDI: 0-800 (0=saturated, 800=extreme drought)
  /** Atmospheric fire weather */
  hainesIndex: number;             // 2-6 (atmospheric stability + dryness for fire growth)
  fosburyFireWeatherIndex: number; // 0-100 (Canadian FWI analog)
  vaporPressureDeficitKpa: number; // 0-8 kPa
  dataConfidence: 'HIGH' | 'MODERATE' | 'LOW_INTERPOLATED';
  isSimulated: true;
}

export interface SeasonalFuelProfile {
  regionId: string;
  season: 'pre_monsoon' | 'monsoon' | 'post_monsoon' | 'winter' | 'spring' | 'summer' | 'autumn' | 'dry_season' | 'wet_season';
  monthRange: string;
  typicalOneHrFmPct: [number, number]; // [min, max]
  typicalLiveHerbPct: [number, number];
  typicalERC: [number, number];
  typicalKBDI: [number, number];
  dominantFuelBed: string;
  fireRiskNarrative: string;
}

// ============================================================================
// FUEL MOISTURE STATION NETWORK (Hyper-realistic for 4 monitored regions)
// ============================================================================

export const FUEL_MOISTURE_STATIONS: FuelMoistureStation[] = [
  // ---- REG-NILGIRI (Western Ghats, India) ----
  {
    stationId: 'RAWS-NIL-001',
    stationName: 'Mudumalai Tiger Reserve AWS',
    networkType: 'RAWS',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.5687, lng: 76.5376 },
    elevationMeters: 940,
    fuelModelNFDRS: 'F',
    slopeClassPct: 28,
    aspectDeg: 195,
    installedDate: '2018-03-15',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-NIL-002',
    stationName: 'Sigur Plateau Grassland Plot',
    networkType: 'RESEARCH_PLOT',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.4812, lng: 76.8345 },
    elevationMeters: 1120,
    fuelModelNFDRS: 'G',
    slopeClassPct: 12,
    aspectDeg: 270,
    installedDate: '2020-01-10',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-NIL-003',
    stationName: 'Masinagudi Valley Forest Beat',
    networkType: 'NFDRS_MANUAL',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.5632, lng: 76.6415 },
    elevationMeters: 680,
    fuelModelNFDRS: 'T',
    slopeClassPct: 35,
    aspectDeg: 145,
    installedDate: '2016-06-20',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-NIL-004',
    stationName: 'Ooty–Kotagiri Ridge Station',
    networkType: 'RAWS',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.4218, lng: 76.8612 },
    elevationMeters: 1890,
    fuelModelNFDRS: 'R',
    slopeClassPct: 42,
    aspectDeg: 310,
    installedDate: '2019-11-05',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  // ---- REG-SIERRA (Sierra Nevada, California) ----
  {
    stationId: 'RAWS-SIE-001',
    stationName: 'Plumas NF Bucks Lake RAWS',
    networkType: 'RAWS',
    regionId: 'REG-SIERRA',
    coordinates: { lat: 39.8721, lng: -121.1843 },
    elevationMeters: 1728,
    fuelModelNFDRS: 'G',
    slopeClassPct: 22,
    aspectDeg: 220,
    installedDate: '2003-05-12',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-SIE-002',
    stationName: 'Quincy Ridge Fire Lookout',
    networkType: 'RAWS',
    regionId: 'REG-SIERRA',
    coordinates: { lat: 39.9412, lng: -120.9231 },
    elevationMeters: 2012,
    fuelModelNFDRS: 'U',
    slopeClassPct: 45,
    aspectDeg: 180,
    installedDate: '2008-07-20',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-SIE-003',
    stationName: 'Indian Falls Canyon Floor',
    networkType: 'RESEARCH_PLOT',
    regionId: 'REG-SIERRA',
    coordinates: { lat: 40.0187, lng: -121.2012 },
    elevationMeters: 1145,
    fuelModelNFDRS: 'F',
    slopeClassPct: 15,
    aspectDeg: 90,
    installedDate: '2015-04-01',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  // ---- REG-ARCADIA (Peloponnese, Greece) ----
  {
    stationId: 'RAWS-ARC-001',
    stationName: 'Mainalo Fir–Oak Transition AWS',
    networkType: 'RAWS',
    regionId: 'REG-ARCADIA',
    coordinates: { lat: 37.5612, lng: 22.2845 },
    elevationMeters: 1150,
    fuelModelNFDRS: 'F',
    slopeClassPct: 30,
    aspectDeg: 210,
    installedDate: '2017-04-15',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-ARC-002',
    stationName: 'Tripoli Phrygana Scrubland',
    networkType: 'NFDRS_MANUAL',
    regionId: 'REG-ARCADIA',
    coordinates: { lat: 37.5102, lng: 22.3712 },
    elevationMeters: 660,
    fuelModelNFDRS: 'B',
    slopeClassPct: 18,
    aspectDeg: 160,
    installedDate: '2019-06-01',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  // ---- REG-PANTANAL (Wetland Basin, Brazil) ----
  {
    stationId: 'RAWS-PAN-001',
    stationName: 'Corumbá Cerrado–Wetland Interface',
    networkType: 'RAWS',
    regionId: 'REG-PANTANAL',
    coordinates: { lat: -17.6245, lng: -56.9312 },
    elevationMeters: 118,
    fuelModelNFDRS: 'L',
    slopeClassPct: 3,
    aspectDeg: 0,
    installedDate: '2014-08-10',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-PAN-002',
    stationName: 'Nhecolândia Grassland AWS',
    networkType: 'RAWS',
    regionId: 'REG-PANTANAL',
    coordinates: { lat: -18.1542, lng: -56.4218 },
    elevationMeters: 92,
    fuelModelNFDRS: 'A',
    slopeClassPct: 1,
    aspectDeg: 0,
    installedDate: '2016-03-22',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
  {
    stationId: 'RAWS-PAN-003',
    stationName: 'Miranda River Gallery Forest',
    networkType: 'RESEARCH_PLOT',
    regionId: 'REG-PANTANAL',
    coordinates: { lat: -17.9415, lng: -57.0218 },
    elevationMeters: 105,
    fuelModelNFDRS: 'E',
    slopeClassPct: 5,
    aspectDeg: 90,
    installedDate: '2018-09-15',
    operationalStatus: 'SIMULATED',
    dataSource: 'MOCK_NFDRS_MODELED',
    lastObservation: '2026-11-13T10:00:00Z',
  },
];

// ============================================================================
// CURRENT FUEL MOISTURE OBSERVATIONS (snapshot for Nov 2026)
// ============================================================================

/** HYPER-REALISTIC MOCK DATA — Modeled on NFDRS/RAWS FW21 output. Not real measurements. */
export const FUEL_MOISTURE_OBSERVATIONS: FuelMoistureObservation[] = [
  // REG-NILGIRI — Post-monsoon transitional dry-down (November)
  {
    stationId: 'RAWS-NIL-001',
    regionId: 'REG-NILGIRI',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 6.2, tenHourPct: 8.4, hundredHourPct: 12.1, thousandHourPct: 18.3 },
    liveFuelMoisture: { herbaceousPct: 82, woodyPct: 105 },
    energyReleaseComponent: 58,
    spreadComponent: 42,
    burningIndex: 67,
    ignitionComponent: 54,
    ndviValue: 0.52,
    vegetationCondition: 'transitioning',
    vegetationAnomalyPct: -8,
    soilMoistureSurfacePct: 18.4,
    soilMoistureRootzPct: 28.6,
    soilMoistureAnomalyPct: -12,
    droughtCategory: 'D0_abnormally_dry',
    keetchByramDroughtIndex: 420,
    hainesIndex: 5,
    fosburyFireWeatherIndex: 62,
    vaporPressureDeficitKpa: 2.8,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-NIL-002',
    regionId: 'REG-NILGIRI',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 5.1, tenHourPct: 7.2, hundredHourPct: 10.8, thousandHourPct: 16.5 },
    liveFuelMoisture: { herbaceousPct: 48, woodyPct: 88 },
    energyReleaseComponent: 72,
    spreadComponent: 68,
    burningIndex: 84,
    ignitionComponent: 68,
    ndviValue: 0.38,
    vegetationCondition: 'stressed',
    vegetationAnomalyPct: -18,
    soilMoistureSurfacePct: 11.2,
    soilMoistureRootzPct: 22.4,
    soilMoistureAnomalyPct: -22,
    droughtCategory: 'D1_moderate',
    keetchByramDroughtIndex: 540,
    hainesIndex: 5,
    fosburyFireWeatherIndex: 74,
    vaporPressureDeficitKpa: 3.4,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-NIL-003',
    regionId: 'REG-NILGIRI',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 7.8, tenHourPct: 9.6, hundredHourPct: 13.5, thousandHourPct: 19.8 },
    liveFuelMoisture: { herbaceousPct: 95, woodyPct: 118 },
    energyReleaseComponent: 45,
    spreadComponent: 32,
    burningIndex: 52,
    ignitionComponent: 42,
    ndviValue: 0.58,
    vegetationCondition: 'transitioning',
    vegetationAnomalyPct: -5,
    soilMoistureSurfacePct: 22.1,
    soilMoistureRootzPct: 32.4,
    soilMoistureAnomalyPct: -6,
    droughtCategory: 'none',
    keetchByramDroughtIndex: 340,
    hainesIndex: 4,
    fosburyFireWeatherIndex: 48,
    vaporPressureDeficitKpa: 2.1,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-NIL-004',
    regionId: 'REG-NILGIRI',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 8.5, tenHourPct: 11.2, hundredHourPct: 15.8, thousandHourPct: 22.1 },
    liveFuelMoisture: { herbaceousPct: 120, woodyPct: 142 },
    energyReleaseComponent: 34,
    spreadComponent: 22,
    burningIndex: 38,
    ignitionComponent: 28,
    ndviValue: 0.65,
    vegetationCondition: 'green',
    vegetationAnomalyPct: 2,
    soilMoistureSurfacePct: 28.5,
    soilMoistureRootzPct: 36.2,
    soilMoistureAnomalyPct: 4,
    droughtCategory: 'none',
    keetchByramDroughtIndex: 220,
    hainesIndex: 3,
    fosburyFireWeatherIndex: 32,
    vaporPressureDeficitKpa: 1.4,
    dataConfidence: 'LOW_INTERPOLATED',
    isSimulated: true,
  },
  // REG-SIERRA — Late autumn, post fire season, early precipitation
  {
    stationId: 'RAWS-SIE-001',
    regionId: 'REG-SIERRA',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 12.4, tenHourPct: 14.8, hundredHourPct: 18.2, thousandHourPct: 22.5 },
    liveFuelMoisture: { herbaceousPct: 35, woodyPct: 78 },
    energyReleaseComponent: 28,
    spreadComponent: 18,
    burningIndex: 24,
    ignitionComponent: 22,
    ndviValue: 0.32,
    vegetationCondition: 'cured',
    vegetationAnomalyPct: -4,
    soilMoistureSurfacePct: 24.8,
    soilMoistureRootzPct: 30.1,
    soilMoistureAnomalyPct: 8,
    droughtCategory: 'none',
    keetchByramDroughtIndex: 180,
    hainesIndex: 3,
    fosburyFireWeatherIndex: 22,
    vaporPressureDeficitKpa: 0.8,
    dataConfidence: 'HIGH',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-SIE-002',
    regionId: 'REG-SIERRA',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 14.2, tenHourPct: 16.5, hundredHourPct: 19.8, thousandHourPct: 24.2 },
    liveFuelMoisture: { herbaceousPct: 32, woodyPct: 72 },
    energyReleaseComponent: 22,
    spreadComponent: 14,
    burningIndex: 18,
    ignitionComponent: 18,
    ndviValue: 0.28,
    vegetationCondition: 'cured',
    vegetationAnomalyPct: -6,
    soilMoistureSurfacePct: 28.4,
    soilMoistureRootzPct: 34.5,
    soilMoistureAnomalyPct: 12,
    droughtCategory: 'none',
    keetchByramDroughtIndex: 140,
    hainesIndex: 2,
    fosburyFireWeatherIndex: 16,
    vaporPressureDeficitKpa: 0.5,
    dataConfidence: 'HIGH',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-SIE-003',
    regionId: 'REG-SIERRA',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 10.8, tenHourPct: 13.2, hundredHourPct: 16.5, thousandHourPct: 21.1 },
    liveFuelMoisture: { herbaceousPct: 42, woodyPct: 85 },
    energyReleaseComponent: 32,
    spreadComponent: 24,
    burningIndex: 30,
    ignitionComponent: 26,
    ndviValue: 0.35,
    vegetationCondition: 'cured',
    vegetationAnomalyPct: -2,
    soilMoistureSurfacePct: 22.1,
    soilMoistureRootzPct: 28.8,
    soilMoistureAnomalyPct: 5,
    droughtCategory: 'none',
    keetchByramDroughtIndex: 200,
    hainesIndex: 3,
    fosburyFireWeatherIndex: 28,
    vaporPressureDeficitKpa: 1.1,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  // REG-ARCADIA — Late autumn Mediterranean, fires winding down
  {
    stationId: 'RAWS-ARC-001',
    regionId: 'REG-ARCADIA',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 9.8, tenHourPct: 12.4, hundredHourPct: 16.2, thousandHourPct: 21.8 },
    liveFuelMoisture: { herbaceousPct: 68, woodyPct: 95 },
    energyReleaseComponent: 38,
    spreadComponent: 28,
    burningIndex: 42,
    ignitionComponent: 35,
    ndviValue: 0.42,
    vegetationCondition: 'transitioning',
    vegetationAnomalyPct: -10,
    soilMoistureSurfacePct: 16.8,
    soilMoistureRootzPct: 24.5,
    soilMoistureAnomalyPct: -8,
    droughtCategory: 'D0_abnormally_dry',
    keetchByramDroughtIndex: 380,
    hainesIndex: 4,
    fosburyFireWeatherIndex: 45,
    vaporPressureDeficitKpa: 2.2,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-ARC-002',
    regionId: 'REG-ARCADIA',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 7.2, tenHourPct: 10.1, hundredHourPct: 14.5, thousandHourPct: 20.2 },
    liveFuelMoisture: { herbaceousPct: 55, woodyPct: 82 },
    energyReleaseComponent: 48,
    spreadComponent: 38,
    burningIndex: 56,
    ignitionComponent: 45,
    ndviValue: 0.36,
    vegetationCondition: 'stressed',
    vegetationAnomalyPct: -15,
    soilMoistureSurfacePct: 12.4,
    soilMoistureRootzPct: 20.1,
    soilMoistureAnomalyPct: -14,
    droughtCategory: 'D1_moderate',
    keetchByramDroughtIndex: 480,
    hainesIndex: 5,
    fosburyFireWeatherIndex: 58,
    vaporPressureDeficitKpa: 2.9,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  // REG-PANTANAL — Peak dry season (August-October fire peak)
  {
    stationId: 'RAWS-PAN-001',
    regionId: 'REG-PANTANAL',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 3.8, tenHourPct: 5.4, hundredHourPct: 8.2, thousandHourPct: 14.5 },
    liveFuelMoisture: { herbaceousPct: 38, woodyPct: 72 },
    energyReleaseComponent: 88,
    spreadComponent: 82,
    burningIndex: 98,
    ignitionComponent: 78,
    ndviValue: 0.28,
    vegetationCondition: 'stressed',
    vegetationAnomalyPct: -25,
    soilMoistureSurfacePct: 6.2,
    soilMoistureRootzPct: 14.8,
    soilMoistureAnomalyPct: -32,
    droughtCategory: 'D2_severe',
    keetchByramDroughtIndex: 680,
    hainesIndex: 6,
    fosburyFireWeatherIndex: 88,
    vaporPressureDeficitKpa: 4.8,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-PAN-002',
    regionId: 'REG-PANTANAL',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 3.2, tenHourPct: 4.8, hundredHourPct: 7.5, thousandHourPct: 13.2 },
    liveFuelMoisture: { herbaceousPct: 32, woodyPct: 65 },
    energyReleaseComponent: 95,
    spreadComponent: 92,
    burningIndex: 108,
    ignitionComponent: 82,
    ndviValue: 0.22,
    vegetationCondition: 'cured',
    vegetationAnomalyPct: -30,
    soilMoistureSurfacePct: 4.1,
    soilMoistureRootzPct: 11.2,
    soilMoistureAnomalyPct: -38,
    droughtCategory: 'D3_extreme',
    keetchByramDroughtIndex: 740,
    hainesIndex: 6,
    fosburyFireWeatherIndex: 94,
    vaporPressureDeficitKpa: 5.6,
    dataConfidence: 'MODERATE',
    isSimulated: true,
  },
  {
    stationId: 'RAWS-PAN-003',
    regionId: 'REG-PANTANAL',
    observedAt: '2026-11-13T10:00:00Z',
    deadFuelMoisture: { oneHourPct: 5.4, tenHourPct: 7.2, hundredHourPct: 10.8, thousandHourPct: 16.8 },
    liveFuelMoisture: { herbaceousPct: 62, woodyPct: 98 },
    energyReleaseComponent: 62,
    spreadComponent: 55,
    burningIndex: 72,
    ignitionComponent: 58,
    ndviValue: 0.45,
    vegetationCondition: 'transitioning',
    vegetationAnomalyPct: -12,
    soilMoistureSurfacePct: 15.8,
    soilMoistureRootzPct: 24.2,
    soilMoistureAnomalyPct: -15,
    droughtCategory: 'D1_moderate',
    keetchByramDroughtIndex: 520,
    hainesIndex: 5,
    fosburyFireWeatherIndex: 68,
    vaporPressureDeficitKpa: 3.2,
    dataConfidence: 'LOW_INTERPOLATED',
    isSimulated: true,
  },
];

// ============================================================================
// HELPER QUERY FUNCTIONS & DATA AVAILABILITY STATUS
// ============================================================================

export function getStationsForRegion(regionId: string): FuelMoistureStation[] {
  return FUEL_MOISTURE_STATIONS.filter((s) => s.regionId === regionId);
}

export function getLatestFuelMoistureObservation(stationIdOrRegionId: string): FuelMoistureObservation | null {
  const byStation = FUEL_MOISTURE_OBSERVATIONS.find((o) => o.stationId === stationIdOrRegionId);
  if (byStation) return byStation;
  const byRegion = FUEL_MOISTURE_OBSERVATIONS.find((o) => o.regionId === stationIdOrRegionId);
  return byRegion || null;
}

export function getFuelStatusAvailability(regionId: string): {
  isAvailable: boolean;
  stationCount: number;
  status: 'OPERATIONAL' | 'SIMULATED_MOCK' | 'UNAVAILABLE';
  source: string;
  narrative: string;
} {
  const stations = getStationsForRegion(regionId);
  if (stations.length === 0) {
    return {
      isAvailable: false,
      stationCount: 0,
      status: 'UNAVAILABLE',
      source: 'No verified local RAWS / NFDRS station registered for this region',
      narrative: 'Local fuel moisture and in-situ soil moisture measurements remain UNAVAILABLE until authenticated station telemetry is integrated.',
    };
  }

  const profile = SEASONAL_FUEL_PROFILES.find((p) => p.regionId === regionId);
  return {
    isAvailable: true,
    stationCount: stations.length,
    status: 'SIMULATED_MOCK',
    source: 'NFDRS Nelson Model / SMAP L4 In-Situ Simulation',
    narrative: profile ? profile.fireRiskNarrative : 'Simulated NFDRS station network readings available.',
  };
}


export const SEASONAL_FUEL_PROFILES: SeasonalFuelProfile[] = [
  // Nilgiri
  {
    regionId: 'REG-NILGIRI', season: 'pre_monsoon', monthRange: 'Feb–May',
    typicalOneHrFmPct: [3, 8], typicalLiveHerbPct: [35, 80], typicalERC: [55, 95], typicalKBDI: [400, 700],
    dominantFuelBed: 'Deciduous dry teak litter + lantana understory',
    fireRiskNarrative: 'Peak fire season. Northeast monsoon residual moisture exhausted. Lantana camara invasion creates continuous surface fuel beds. Foehn-type dry winds descend Moyar gorge amplifying ROS.',
  },
  {
    regionId: 'REG-NILGIRI', season: 'monsoon', monthRange: 'Jun–Sep',
    typicalOneHrFmPct: [18, 35], typicalLiveHerbPct: [180, 300], typicalERC: [5, 20], typicalKBDI: [50, 200],
    dominantFuelBed: 'Saturated herbaceous flush + wet canopy drip',
    fireRiskNarrative: 'Southwest monsoon delivers 1200-2800mm. Fire activity near zero. Landslide risk replaces fire risk on steep slopes.',
  },
  {
    regionId: 'REG-NILGIRI', season: 'post_monsoon', monthRange: 'Oct–Jan',
    typicalOneHrFmPct: [6, 14], typicalLiveHerbPct: [60, 140], typicalERC: [25, 60], typicalKBDI: [180, 450],
    dominantFuelBed: 'Drying grassland + semi-deciduous leaf fall onset',
    fireRiskNarrative: 'Transitional drying. Northeast monsoon brings intermittent rain but fuels begin curing. Prescribed burns by tribal communities (kurumba) traditional practice.',
  },
  // Sierra
  {
    regionId: 'REG-SIERRA', season: 'summer', monthRange: 'Jun–Sep',
    typicalOneHrFmPct: [2, 6], typicalLiveHerbPct: [30, 65], typicalERC: [65, 120], typicalKBDI: [500, 800],
    dominantFuelBed: 'Mixed conifer needle litter + manzanita/ceanothus shrub',
    fireRiskNarrative: 'Peak fire season. Sierra Barrier Jet and Mono wind events drive rapid fire runs. Bark beetle mortality (2012-2021 drought legacy) creates heavy dead fuel loading.',
  },
  {
    regionId: 'REG-SIERRA', season: 'autumn', monthRange: 'Oct–Nov',
    typicalOneHrFmPct: [8, 16], typicalLiveHerbPct: [30, 50], typicalERC: [30, 65], typicalKBDI: [200, 500],
    dominantFuelBed: 'Cured annual grasses + dry conifer litter under early snowpack',
    fireRiskNarrative: 'Fire season winding down. Occasional late-season Diablo/offshore wind events can produce critical fire weather. First atmospheric river precipitation begins fuel recovery.',
  },
  {
    regionId: 'REG-SIERRA', season: 'winter', monthRange: 'Dec–Mar',
    typicalOneHrFmPct: [20, 35], typicalLiveHerbPct: [30, 40], typicalERC: [5, 18], typicalKBDI: [20, 150],
    dominantFuelBed: 'Snow-covered ground, dormant canopy',
    fireRiskNarrative: 'Snow cover 50-300cm suppresses fire. Structure fire risk only. Fuel moisture recovery to saturation.',
  },
  {
    regionId: 'REG-SIERRA', season: 'spring', monthRange: 'Apr–May',
    typicalOneHrFmPct: [10, 20], typicalLiveHerbPct: [120, 250], typicalERC: [15, 40], typicalKBDI: [100, 300],
    dominantFuelBed: 'Green-up herbaceous layer + residual fine dead fuels',
    fireRiskNarrative: 'Snowmelt and green-up. Low fire risk. Prescribed fire window for forest management.',
  },
  // Arcadia
  {
    regionId: 'REG-ARCADIA', season: 'summer', monthRange: 'Jun–Sep',
    typicalOneHrFmPct: [3, 7], typicalLiveHerbPct: [40, 75], typicalERC: [60, 110], typicalKBDI: [500, 780],
    dominantFuelBed: 'Mediterranean sclerophyll (Quercus coccifera, Pinus halepensis litter, Cistus, Erica)',
    fireRiskNarrative: 'Peak Mediterranean fire season. Etesian meltemi winds create extreme fire weather. Essential oil content in shrubs increases flammability. 2007 and 2021 catastrophic fires as analogs.',
  },
  {
    regionId: 'REG-ARCADIA', season: 'winter', monthRange: 'Nov–Mar',
    typicalOneHrFmPct: [14, 28], typicalLiveHerbPct: [100, 180], typicalERC: [8, 25], typicalKBDI: [50, 250],
    dominantFuelBed: 'Green maquis + rain-saturated litter',
    fireRiskNarrative: 'Mediterranean winter rains. Fire risk very low. Flood and erosion risk on burned slopes from previous seasons.',
  },
  // Pantanal
  {
    regionId: 'REG-PANTANAL', season: 'dry_season', monthRange: 'May–Oct',
    typicalOneHrFmPct: [2, 6], typicalLiveHerbPct: [28, 60], typicalERC: [75, 120], typicalKBDI: [600, 800],
    dominantFuelBed: 'Cured savanna grass (Andropogon, Axonopus) + dried wetland vegetation',
    fireRiskNarrative: 'Critical fire season. Water table drops 2-4m exposing dry organic soils. 2020 burned 26% of biome. Cattle ranching fire escape and lightning ignition. Extreme fire behavior in dried floodplain vegetation.',
  },
  {
    regionId: 'REG-PANTANAL', season: 'wet_season', monthRange: 'Nov–Apr',
    typicalOneHrFmPct: [18, 35], typicalLiveHerbPct: [180, 300], typicalERC: [5, 20], typicalKBDI: [30, 200],
    dominantFuelBed: 'Inundated grassland + aquatic macrophytes',
    fireRiskNarrative: 'Pantanal flooding cycle. 60-80% of area inundated. Near-zero fire risk except on elevated cordilheiras.',
  },
];

