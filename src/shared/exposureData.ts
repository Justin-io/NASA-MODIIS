/**
 * Authoritative Exposure Intelligence & Asset Vulnerability
 *
 * HYPER-REALISTIC MOCK DATASET — Modeled on WorldPop 100m Gridded Population,
 * OpenStreetMap (OSM) High-Resolution Building Footprints, Homeland Infrastructure
 * Foundation-Level Data (HIFLD), State Evacuation Management Systems, and
 * IUCN / Global Forest Watch Ecological Sensitivity Layers.
 *
 * Schema & Scientific Standard:
 * - WorldPop 100m constrained population distribution & age/sex demographic structure
 * - OpenStreetMap building tag schema with WUI (Wildland-Urban Interface) hazard attributes
 * - Critical Infrastructure Tiering (FEMA / CISA guidelines)
 * - Standard ICS Evacuation Zone taxonomy (Zonehaven / Genasys style)
 * - IUCN Red List habitat sensitivity & Key Biodiversity Areas (KBA)
 */

export interface PopulationExposureGridCell {
  cellId: string;
  regionId: string;
  centerCoordinates: { lat: number; lng: number };
  cellResolutionMeters: number; // 100m nominal
  totalPopulation: number;
  daytimePopulation: number;
  nighttimePopulation: number;
  vulnerableDemographics: {
    elderlyAbove65Count: number;
    childrenUnder5Count: number;
    mobilityImpairedCount: number;
  };
  householdCount: number;
  wildlandUrbanInterfaceType: 'INTERMIX' | 'INTERFACE' | 'NON_WUI_RURAL' | 'URBAN_CORE';
  historicalEvacuationCompliancePct: number;
}

export interface BuildingFootprintRecord {
  buildingId: string;
  regionId: string;
  osmId: string;
  primaryUse: 'RESIDENTIAL' | 'COMMERCIAL' | 'EDUCATIONAL' | 'HEALTHCARE' | 'AGRICULTURAL' | 'INDUSTRIAL';
  coordinates: { lat: number; lng: number };
  roofConstruction: 'COMBUSTIBLE_WOOD_SHINGLE' | 'ASPHALT_COMPOSITION' | 'CORRUGATED_METAL' | 'CLAY_CONCRETE_TILE';
  defensibleSpaceMeters: number;
  structureVulnerabilityIndex: number; // 0 (hardened) to 100 (extreme firebrand trap)
  occupancyCapacity: number;
  distanceToActivePerimeterKm: number;
  threatLevel: 'DIRECT_FLAME_CONTACT' | 'EXTREME_EMBER_ZONE' | 'WATCH_BUFFER' | 'CLEAR';
}

export type InfrastructureCategory =
  | 'HOSPITAL_TRAUMA_CENTER'
  | 'ELECTRICAL_SUBSTATION'
  | 'POWER_TRANSMISSION_LINE'
  | 'WATER_TREATMENT_RESERVOIR'
  | 'COMMUNICATIONS_TOWER'
  | 'EMERGENCY_EVACUATION_SHELTER'
  | 'HAZMAT_STORAGE_FACILITY';

export interface CriticalInfrastructureAsset {
  assetId: string;
  name: string;
  category: InfrastructureCategory;
  regionId: string;
  coordinates: { lat: number; lng: number };
  elevationM: number;
  backupPowerHours: number;
  capacityMetric: string;
  operationalStatus: 'FULLY_OPERATIONAL' | 'THREATENED_PREPARING' | 'EVACUATING' | 'OFFLINE_DAMAGED';
  fireSuppressionSystem: 'HALON_EXTINGUISH' | 'ROOF_SPRINKLERS' | 'FOAM_DELUGE' | 'MANUAL_HYDRANT_ONLY' | 'NONE';
  distanceToFireFrontKm: number;
  defensibilityNotes: string;
}

export type EvacuationOrderStatus =
  | 'EVACUATION_ORDER_MANDATORY'
  | 'EVACUATION_WARNING_PREPARE'
  | 'SHELTER_IN_PLACE'
  | 'NORMAL_ADVISORY';

export interface EvacuationZone {
  zoneId: string;
  zoneName: string;
  regionId: string;
  status: EvacuationOrderStatus;
  designatedOrderTimestampUtc: string | null;
  authorizingOfficial: string;
  boundaryPolygon: [number, number][]; // [lng, lat]
  residentCount: number;
  registeredVehicles: number;
  evacuationProgressPct: number;
  primaryEgressRoute: string;
  secondaryEgressRoute: string;
  designatedShelterName: string;
  designatedShelterLocation: string;
  specialNeedsAssistanceRequired: number;
}

export interface EcologicalSensitivityZone {
  zoneId: string;
  name: string;
  regionId: string;
  protectionStatus: 'IUCN_CAT_IA_STRICT_RESERVE' | 'NATIONAL_PARK_CORE' | 'CRITICAL_TIGER_HABITAT' | 'WILDLIFE_CORRIDOR';
  areaHectares: number;
  boundaryPolygon: [number, number][];
  endangeredSpeciesPresent: string[];
  canopyDensityPct: number;
  soilErosionPostFireRisk: 'EXTREME_DEBRIS_FLOW' | 'HIGH' | 'MODERATE' | 'LOW';
  carbonStockTonnesPerHa: number;
  ecologicalLossNarrative: string;
}

// ============================================================================
// POPULATION EXPOSURE CELLS (Sample 100m Grids for Nilgiri & Sierra)
// ============================================================================

export const POPULATION_EXPOSURE_GRID: PopulationExposureGridCell[] = [
  // Nilgiri - Masinagudi Sector
  {
    cellId: 'WPOP-NIL-001',
    regionId: 'REG-NILGIRI',
    centerCoordinates: { lat: 11.5721, lng: 76.6412 },
    cellResolutionMeters: 100,
    totalPopulation: 142,
    daytimePopulation: 220,
    nighttimePopulation: 142,
    vulnerableDemographics: { elderlyAbove65Count: 24, childrenUnder5Count: 16, mobilityImpairedCount: 6 },
    householdCount: 38,
    wildlandUrbanInterfaceType: 'INTERMIX',
    historicalEvacuationCompliancePct: 78,
  },
  {
    cellId: 'WPOP-NIL-002',
    regionId: 'REG-NILGIRI',
    centerCoordinates: { lat: 11.5645, lng: 76.6498 },
    cellResolutionMeters: 100,
    totalPopulation: 285,
    daytimePopulation: 340,
    nighttimePopulation: 285,
    vulnerableDemographics: { elderlyAbove65Count: 42, childrenUnder5Count: 31, mobilityImpairedCount: 12 },
    householdCount: 72,
    wildlandUrbanInterfaceType: 'INTERFACE',
    historicalEvacuationCompliancePct: 84,
  },
  {
    cellId: 'WPOP-NIL-003',
    regionId: 'REG-NILGIRI',
    centerCoordinates: { lat: 11.4920, lng: 76.7120 },
    cellResolutionMeters: 100,
    totalPopulation: 68,
    daytimePopulation: 45,
    nighttimePopulation: 68,
    vulnerableDemographics: { elderlyAbove65Count: 14, childrenUnder5Count: 8, mobilityImpairedCount: 3 },
    householdCount: 19,
    wildlandUrbanInterfaceType: 'NON_WUI_RURAL',
    historicalEvacuationCompliancePct: 62,
  },
  // Sierra - Bucks Lake & Quincy Basin
  {
    cellId: 'WPOP-SIE-001',
    regionId: 'REG-SIERRA',
    centerCoordinates: { lat: 39.8812, lng: -121.1785 },
    cellResolutionMeters: 100,
    totalPopulation: 95,
    daytimePopulation: 160,
    nighttimePopulation: 95,
    vulnerableDemographics: { elderlyAbove65Count: 28, childrenUnder5Count: 6, mobilityImpairedCount: 4 },
    householdCount: 52,
    wildlandUrbanInterfaceType: 'INTERMIX',
    historicalEvacuationCompliancePct: 88,
  },
  {
    cellId: 'WPOP-SIE-002',
    regionId: 'REG-SIERRA',
    centerCoordinates: { lat: 39.9360, lng: -120.9420 },
    cellResolutionMeters: 100,
    totalPopulation: 420,
    daytimePopulation: 580,
    nighttimePopulation: 420,
    vulnerableDemographics: { elderlyAbove65Count: 82, childrenUnder5Count: 36, mobilityImpairedCount: 18 },
    householdCount: 185,
    wildlandUrbanInterfaceType: 'INTERFACE',
    historicalEvacuationCompliancePct: 92,
  },
];

// ============================================================================
// OPENSTREETMAP (OSM) BUILDING FOOTPRINTS
// ============================================================================

export const BUILDING_FOOTPRINTS: BuildingFootprintRecord[] = [
  // Masinagudi Buildings
  {
    buildingId: 'BLD-NIL-001',
    regionId: 'REG-NILGIRI',
    osmId: 'way/482910481',
    primaryUse: 'HEALTHCARE',
    coordinates: { lat: 11.5714, lng: 76.6425 },
    roofConstruction: 'CORRUGATED_METAL',
    defensibleSpaceMeters: 18,
    structureVulnerabilityIndex: 32,
    occupancyCapacity: 35,
    distanceToActivePerimeterKm: 3.4,
    threatLevel: 'EXTREME_EMBER_ZONE',
  },
  {
    buildingId: 'BLD-NIL-002',
    regionId: 'REG-NILGIRI',
    osmId: 'way/482910492',
    primaryUse: 'EDUCATIONAL',
    coordinates: { lat: 11.5688, lng: 76.6438 },
    roofConstruction: 'CLAY_CONCRETE_TILE',
    defensibleSpaceMeters: 25,
    structureVulnerabilityIndex: 28,
    occupancyCapacity: 180,
    distanceToActivePerimeterKm: 3.2,
    threatLevel: 'EXTREME_EMBER_ZONE',
  },
  {
    buildingId: 'BLD-NIL-003',
    regionId: 'REG-NILGIRI',
    osmId: 'way/482910515',
    primaryUse: 'RESIDENTIAL',
    coordinates: { lat: 11.4312, lng: 76.7085 },
    roofConstruction: 'COMBUSTIBLE_WOOD_SHINGLE',
    defensibleSpaceMeters: 6,
    structureVulnerabilityIndex: 88,
    occupancyCapacity: 8,
    distanceToActivePerimeterKm: 0.9,
    threatLevel: 'DIRECT_FLAME_CONTACT',
  },
  {
    buildingId: 'BLD-NIL-004',
    regionId: 'REG-NILGIRI',
    osmId: 'way/482910528',
    primaryUse: 'AGRICULTURAL',
    coordinates: { lat: 11.4245, lng: 76.7150 },
    roofConstruction: 'CORRUGATED_METAL',
    defensibleSpaceMeters: 12,
    structureVulnerabilityIndex: 54,
    occupancyCapacity: 12,
    distanceToActivePerimeterKm: 1.2,
    threatLevel: 'DIRECT_FLAME_CONTACT',
  },
  // Sierra Buildings
  {
    buildingId: 'BLD-SIE-001',
    regionId: 'REG-SIERRA',
    osmId: 'way/291840192',
    primaryUse: 'RESIDENTIAL',
    coordinates: { lat: 39.8785, lng: -121.1820 },
    roofConstruction: 'ASPHALT_COMPOSITION',
    defensibleSpaceMeters: 30,
    structureVulnerabilityIndex: 42,
    occupancyCapacity: 6,
    distanceToActivePerimeterKm: 2.1,
    threatLevel: 'EXTREME_EMBER_ZONE',
  },
  {
    buildingId: 'BLD-SIE-002',
    regionId: 'REG-SIERRA',
    osmId: 'way/291840205',
    primaryUse: 'COMMERCIAL',
    coordinates: { lat: 39.9380, lng: -120.9380 },
    roofConstruction: 'CORRUGATED_METAL',
    defensibleSpaceMeters: 45,
    structureVulnerabilityIndex: 22,
    occupancyCapacity: 50,
    distanceToActivePerimeterKm: 6.8,
    threatLevel: 'WATCH_BUFFER',
  },
];

// ============================================================================
// CRITICAL INFRASTRUCTURE ASSETS
// ============================================================================

export const CRITICAL_INFRASTRUCTURE: CriticalInfrastructureAsset[] = [
  // Nilgiri Infrastructure
  {
    assetId: 'INFRA-NIL-001',
    name: 'Moyar Hydroelectric 110kV Transmission Corridor',
    category: 'POWER_TRANSMISSION_LINE',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.4360, lng: 76.7120 },
    elevationM: 1350,
    backupPowerHours: 0,
    capacityMetric: '110 kV Regional Intertie',
    operationalStatus: 'THREATENED_PREPARING',
    fireSuppressionSystem: 'NONE',
    distanceToFireFrontKm: 1.8,
    defensibilityNotes: 'Clearance corridor maintained to 30m width, but steep brush on northern towers poses arc-flash risk.',
  },
  {
    assetId: 'INFRA-NIL-002',
    name: 'Masinagudi Primary Healthcare Centre & Emergency Ward',
    category: 'HOSPITAL_TRAUMA_CENTER',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.5714, lng: 76.6425 },
    elevationM: 710,
    backupPowerHours: 48,
    capacityMetric: '20 Beds / 2 Trauma Resus Stalls',
    operationalStatus: 'FULLY_OPERATIONAL',
    fireSuppressionSystem: 'ROOF_SPRINKLERS',
    distanceToFireFrontKm: 3.4,
    defensibilityNotes: 'Perimeter concrete wall and dual 20,000L rooftop storage tanks with exterior drenching system.',
  },
  {
    assetId: 'INFRA-NIL-003',
    name: 'Kallatti Forest Range VHF Radio Repeater Mast',
    category: 'COMMUNICATIONS_TOWER',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.4480, lng: 76.6850 },
    elevationM: 1980,
    backupPowerHours: 72,
    capacityMetric: 'Primary Emergency Command Radio Net (156.8 MHz)',
    operationalStatus: 'FULLY_OPERATIONAL',
    fireSuppressionSystem: 'HALON_EXTINGUISH',
    distanceToFireFrontKm: 4.1,
    defensibilityNotes: 'Enclosed concrete equipment shelter with solar array and propane standby generator.',
  },
  {
    assetId: 'INFRA-NIL-004',
    name: 'Pykara Glenmorgan Reservoir Pumping Intake',
    category: 'WATER_TREATMENT_RESERVOIR',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.4820, lng: 76.6210 },
    elevationM: 1820,
    backupPowerHours: 36,
    capacityMetric: '14.2 MLD Municipal Feed + Helicopter Dip Pool',
    operationalStatus: 'FULLY_OPERATIONAL',
    fireSuppressionSystem: 'MANUAL_HYDRANT_ONLY',
    distanceToFireFrontKm: 5.8,
    defensibilityNotes: 'Direct reservoir access; unlimited surface water for engine refilling and aerial bucket dips.',
  },
  // Sierra Infrastructure
  {
    assetId: 'INFRA-SIE-001',
    name: 'Plumas District Hospital & Trauma Service',
    category: 'HOSPITAL_TRAUMA_CENTER',
    regionId: 'REG-SIERRA',
    coordinates: { lat: 39.9320, lng: -120.9410 },
    elevationM: 1045,
    backupPowerHours: 96,
    capacityMetric: '25 Acute Care Beds + Emergency Surgery',
    operationalStatus: 'FULLY_OPERATIONAL',
    fireSuppressionSystem: 'ROOF_SPRINKLERS',
    distanceToFireFrontKm: 7.2,
    defensibilityNotes: 'Defensible space landscaped 60m out; dedicated on-site 100k gallon pressurized storage tank.',
  },
  {
    assetId: 'INFRA-SIE-002',
    name: 'Bucks Lake PG&E 60kV Hydro Substation',
    category: 'ELECTRICAL_SUBSTATION',
    regionId: 'REG-SIERRA',
    coordinates: { lat: 39.8740, lng: -121.1810 },
    elevationM: 1540,
    backupPowerHours: 24,
    capacityMetric: '42 MW Generation Feeder',
    operationalStatus: 'THREATENED_PREPARING',
    fireSuppressionSystem: 'FOAM_DELUGE',
    distanceToFireFrontKm: 2.3,
    defensibilityNotes: 'Cleared gravel yard 35m perimeter. Overhead lines vulnerable to smoke ionization trips.',
  },
];

// ============================================================================
// EVACUATION ZONES (ICS Tactical Polygons)
// ============================================================================

export const EVACUATION_ZONES: EvacuationZone[] = [
  // Zone Nilgiri-01: Moyar Chasm Rim & Eastern Masinagudi
  {
    zoneId: 'EVAC-ZONE-NIL-01',
    zoneName: 'Moyar Chasm Upper Rim & Kallatti Hairpins',
    regionId: 'REG-NILGIRI',
    status: 'EVACUATION_ORDER_MANDATORY',
    designatedOrderTimestampUtc: '2026-11-13T09:00:00Z',
    authorizingOfficial: 'District Collector & Executive Magistrate, Nilgiris District',
    boundaryPolygon: [
      [76.6780, 11.4020],
      [76.7150, 11.4480],
      [76.7450, 11.4350],
      [76.7320, 11.3980],
      [76.6780, 11.4020],
    ],
    residentCount: 380,
    registeredVehicles: 85,
    evacuationProgressPct: 74,
    primaryEgressRoute: 'Ooty–Kallatti Road (NH-181) Southbound Ascent',
    secondaryEgressRoute: 'Kotagiri Ridge Forest Road (Bypass Route ALT-02)',
    designatedShelterName: 'St. Joseph Higher Secondary School Evacuation Center',
    designatedShelterLocation: 'Coonoor, Nilgiris (lat 11.3530, lng 76.7950)',
    specialNeedsAssistanceRequired: 14,
  },
  // Zone Nilgiri-02: Masinagudi Village Core & Mudumalai Boundary
  {
    zoneId: 'EVAC-ZONE-NIL-02',
    zoneName: 'Masinagudi Settlement & Theppakadu Buffer',
    regionId: 'REG-NILGIRI',
    status: 'EVACUATION_WARNING_PREPARE',
    designatedOrderTimestampUtc: '2026-11-13T10:15:00Z',
    authorizingOfficial: 'Sub-Divisional Magistrate, Gudalur',
    boundaryPolygon: [
      [76.6250, 11.5520],
      [76.6680, 11.5850],
      [76.6850, 11.5620],
      [76.6420, 11.5350],
      [76.6250, 11.5520],
    ],
    residentCount: 1450,
    registeredVehicles: 310,
    evacuationProgressPct: 28,
    primaryEgressRoute: 'Masinagudi–Theppakadu Highway towards Bandipur (NH-766)',
    secondaryEgressRoute: 'Mavanalla–Gudalur Corridor',
    designatedShelterName: 'Gudalur Government Arts College Gymnasium',
    designatedShelterLocation: 'Gudalur, Nilgiris (lat 11.5080, lng 76.4950)',
    specialNeedsAssistanceRequired: 38,
  },
  // Sierra Nevada Evacuation Zone
  {
    zoneId: 'EVAC-ZONE-SIE-01',
    zoneName: 'Bucks Lake Recreation Basin & Meadow Valley Rim',
    regionId: 'REG-SIERRA',
    status: 'EVACUATION_ORDER_MANDATORY',
    designatedOrderTimestampUtc: '2026-11-13T08:00:00Z',
    authorizingOfficial: 'Plumas County Sheriff & Emergency Management Director',
    boundaryPolygon: [
      [-121.2200, 39.8550],
      [-121.1450, 39.9250],
      [-121.1100, 39.8950],
      [-121.1850, 39.8250],
      [-121.2200, 39.8550],
    ],
    residentCount: 420,
    registeredVehicles: 280,
    evacuationProgressPct: 86,
    primaryEgressRoute: 'Bucks Lake Road Eastbound to Quincy',
    secondaryEgressRoute: 'Oroville–Quincy Highway Westbound (Pass Controlled)',
    designatedShelterName: 'Plumas County Fairgrounds Main Pavilion',
    designatedShelterLocation: 'Quincy, CA (lat 39.9380, lng -120.9420)',
    specialNeedsAssistanceRequired: 12,
  },
];

// ============================================================================
// ECOLOGICAL SENSITIVITY LAYERS
// ============================================================================

export const ECOLOGICAL_SENSITIVITY_ZONES: EcologicalSensitivityZone[] = [
  // Nilgiri Biosphere Core
  {
    zoneId: 'ECO-NIL-001',
    name: 'Mudumalai Tiger Reserve Core Zone & Moyar Canyon',
    regionId: 'REG-NILGIRI',
    protectionStatus: 'CRITICAL_TIGER_HABITAT',
    areaHectares: 32100,
    boundaryPolygon: [
      [76.5120, 11.5210],
      [76.7450, 11.5950],
      [76.7820, 11.4520],
      [76.5850, 11.3980],
      [76.5120, 11.5210],
    ],
    endangeredSpeciesPresent: [
      'Panthera tigris (Bengal Tiger - IUCN Endangered)',
      'Elephas maximus (Asian Elephant - IUCN Endangered)',
      'Nilgiritragus hylocrius (Nilgiri Tahr - IUCN Endangered)',
      'Gyps bengalensis (White-rumped Vulture - IUCN Critically Endangered)',
    ],
    canopyDensityPct: 78,
    soilErosionPostFireRisk: 'EXTREME_DEBRIS_FLOW',
    carbonStockTonnesPerHa: 185,
    ecologicalLossNarrative: 'Montane shola-grassland mosaic and dry deciduous transition harboring dense Asian elephant migratory corridors. Intense crown fires trigger irreversible bamboo (Bambusa bambos) dieback and invasive weed colonisation.',
  },
  // Sierra Mixed Conifer Reserve
  {
    zoneId: 'ECO-SIE-001',
    name: 'Spanish Peak Roadless Area & California Spotted Owl PAC',
    regionId: 'REG-SIERRA',
    protectionStatus: 'NATIONAL_PARK_CORE',
    areaHectares: 18400,
    boundaryPolygon: [
      [-120.8850, 39.9520],
      [-120.7250, 40.0450],
      [-120.6950, 39.9850],
      [-120.8250, 39.9120],
      [-120.8850, 39.9520],
    ],
    endangeredSpeciesPresent: [
      'Strix occidentalis occidentalis (California Spotted Owl - Protected)',
      'Pekania pennanti (Pacific Fisher - IUCN Vulnerable)',
      'Oncorhynchus mykiss gairdnerii (Steelhead Trout Spawning Waters)',
    ],
    canopyDensityPct: 82,
    soilErosionPostFireRisk: 'HIGH',
    carbonStockTonnesPerHa: 245,
    ecologicalLossNarrative: 'Old-growth sugar pine (Pinus lambertiana) and white fir (Abies concolor) stands. High-severity burn patches destroy critical owl nesting canopies that take >150 years to regenerate.',
  },
];

// ============================================================================
// HELPER QUERY FUNCTIONS
// ============================================================================

export function getPopulationCellsForRegion(regionId: string): PopulationExposureGridCell[] {
  return POPULATION_EXPOSURE_GRID.filter((c) => c.regionId === regionId);
}

export function getCriticalInfrastructureForRegion(regionId: string): CriticalInfrastructureAsset[] {
  return CRITICAL_INFRASTRUCTURE.filter((i) => i.regionId === regionId);
}

export function getEvacuationZonesForRegion(regionId: string): EvacuationZone[] {
  return EVACUATION_ZONES.filter((z) => z.regionId === regionId);
}

export function getEcologicalZonesForRegion(regionId: string): EcologicalSensitivityZone[] {
  return ECOLOGICAL_SENSITIVITY_ZONES.filter((e) => e.regionId === regionId);
}

export function getBuildingFootprintsForRegion(regionId: string): BuildingFootprintRecord[] {
  return BUILDING_FOOTPRINTS.filter((b) => b.regionId === regionId);
}

