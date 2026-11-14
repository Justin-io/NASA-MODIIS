/**
 * Road Network Hazards, Infrastructure Limits & Real-Time Responder Telemetry
 *
 * HYPER-REALISTIC MOCK DATASET — Modeled on State DOT (Department of Transportation)
 * 511 Road Condition Feeds, National Bridge Inventory (NBI) Weight & Clearance Standards,
 * Automated Vehicle Location (AVL) CAD Telemetry, and ICS Resource Tracking (ICS 204/219).
 *
 * NOT real responder locations or real highway closures. For operational visualization
 * and intelligent emergency route recalculation.
 */

export type RoadHazardType =
  | 'CLOSED_ACTIVE_FIRE_CROSSING'
  | 'CLOSED_ZERO_VISIBILITY_SMOKE'
  | 'CLOSED_ROCKFALL_DEBRIS'
  | 'BRIDGE_WEIGHT_RESTRICTION'
  | 'BRIDGE_HEIGHT_CLEARANCE_LIMIT'
  | 'NARROW_TURNING_RADIUS_PINCH'
  | 'UNPAVED_LOGGING_TRACK_4WD_ONLY';

export interface RoadHazardSegment {
  hazardId: string;
  roadName: string;
  highwayCode: string;
  regionId: string;
  hazardType: RoadHazardType;
  severity: 'CRITICAL_IMPASSABLE' | 'RESTRICTED_ACCESS' | 'CAUTION_DEGRADED';
  startCoordinates: { lat: number; lng: number };
  endCoordinates: { lat: number; lng: number };
  maxVehicleWeightTons: number | null; // e.g., 14 tons max
  maxVehicleHeightMeters: number | null; // e.g., 3.6m clearance
  disqualifiedVehicleTypes: string[]; // e.g. ['heavy_water_tanker', 'type_1_engine']
  verifiedBy: string; // e.g. 'State Highway Patrol Unit 4'
  verifiedAtUtc: string;
  estimatedReopenTimeUtc: string | null;
  tacticalDetourRecommendation: string;
}

export type ResponderVehicleClass =
  | 'TYPE_1_STRUCTURAL_ENGINE'
  | 'TYPE_3_WILDLAND_ENGINE'
  | 'TYPE_6_RAPID_ATTACK_BRUSH_TRUCK'
  | 'TACTICAL_WATER_TENDER_HEAVY'
  | 'ALS_PARAMEDIC_AMBULANCE'
  | 'BULLDOZER_TRANSPORT_DOZER'
  | 'INCIDENT_COMMAND_VEHICLE';

export type ApparatusCadState =
  | 'AVAILABLE_IN_STATION'
  | 'STAGED_AT_INCIDENT_BASE'
  | 'EN_ROUTE_TO_ASSIGNMENT'
  | 'ON_SCENE_ACTIVE_SUPPRESSION'
  | 'REFILLING_WATER_SUPPLY'
  | 'OUT_OF_SERVICE_MECHANICAL';

export interface LiveResponderApparatus {
  apparatusId: string;
  callsign: string;
  vehicleClass: ResponderVehicleClass;
  agencyAffiliation: string;
  assignedIncidentId: string | null;
  cadStatus: ApparatusCadState;
  homeStationName: string;
  regionId: string;
  telemetry: {
    lat: number;
    lng: number;
    headingDeg: number;
    speedKmh: number;
    lastPingUtc: string;
  };
  crewCapacity: number;
  crewOnBoard: number;
  waterTankCapacityLiters: number;
  waterRemainingPct: number;
  foamConcentrateLiters: number;
  pumpFlowRateLpm: number; // Liters per minute
  fuelRemainingPct: number;
  radioFrequencyMhz: number;
  isSimulated: true;
}

export interface ConfirmedStagingYard {
  stagingId: string;
  name: string;
  regionId: string;
  coordinates: { lat: number; lng: number };
  yardCapacityApparatus: number;
  currentStationedCount: number;
  hasWaterRefillHydrant: boolean;
  hasFuelDepot: boolean;
  hasHelitackRetardantDipTank: boolean;
  medicalTriageCapability: boolean;
  commandLiaisonOfficer: string;
  accessRoadCondition: 'PAVED_ALL_WEATHER' | 'GRAVEL_COMPACTED' | 'ROUGH_DIRT';
}

// ============================================================================
// ROAD HAZARDS & RESTRICTIONS (Nilgiri & Sierra Corridors)
// ============================================================================

export const ROAD_HAZARD_SEGMENTS: RoadHazardSegment[] = [
  // 1. Nilgiri - NH-181 Kallatti Hairpin Route (Primary Direct Corridor)
  {
    hazardId: 'HAZ-NIL-001',
    roadName: 'Kallatti Ghat Hairpin Section (NH-181)',
    highwayCode: 'NH-181',
    regionId: 'REG-NILGIRI',
    hazardType: 'CLOSED_ACTIVE_FIRE_CROSSING',
    severity: 'CRITICAL_IMPASSABLE',
    startCoordinates: { lat: 11.4320, lng: 76.7080 },
    endCoordinates: { lat: 11.4550, lng: 76.6850 },
    maxVehicleWeightTons: 0,
    maxVehicleHeightMeters: 0,
    disqualifiedVehicleTypes: [
      'TYPE_1_STRUCTURAL_ENGINE',
      'TYPE_3_WILDLAND_ENGINE',
      'TYPE_6_RAPID_ATTACK_BRUSH_TRUCK',
      'TACTICAL_WATER_TENDER_HEAVY',
      'ALS_PARAMEDIC_AMBULANCE',
      'BULLDOZER_TRANSPORT_DOZER',
    ],
    verifiedBy: 'Nilgiris District Highway Police & Range Forest Patrol',
    verifiedAtUtc: '2026-11-13T09:40:00Z',
    estimatedReopenTimeUtc: '2026-11-13T18:00:00Z',
    tacticalDetourRecommendation: 'Reroute heavy units via Kotagiri Ridge Route ALT-02 (+38 km, +24 min travel time).',
  },
  // 2. Nilgiri - Moyar Gorge Single-Lane Bridge
  {
    hazardId: 'HAZ-NIL-002',
    roadName: 'Moyar River Checkpost Bridge',
    highwayCode: 'MDR-842',
    regionId: 'REG-NILGIRI',
    hazardType: 'BRIDGE_WEIGHT_RESTRICTION',
    severity: 'RESTRICTED_ACCESS',
    startCoordinates: { lat: 11.5640, lng: 76.6430 },
    endCoordinates: { lat: 11.5655, lng: 76.6445 },
    maxVehicleWeightTons: 12.0, // Disqualifies 18-ton heavy tankers
    maxVehicleHeightMeters: 3.8,
    disqualifiedVehicleTypes: ['TACTICAL_WATER_TENDER_HEAVY', 'BULLDOZER_TRANSPORT_DOZER'],
    verifiedBy: 'State PWD Highways Bridge Inspector',
    verifiedAtUtc: '2026-11-12T16:00:00Z',
    estimatedReopenTimeUtc: null, // Permanent structural restriction
    tacticalDetourRecommendation: 'Heavy water tenders must stage on southern river bank and establish hose-lay relay.',
  },
  // 3. Nilgiri - Masinagudi Access Road
  {
    hazardId: 'HAZ-NIL-003',
    roadName: 'Masinagudi–Mavanalla Tea Estate Access Spur',
    highwayCode: 'TE-04',
    regionId: 'REG-NILGIRI',
    hazardType: 'CLOSED_ZERO_VISIBILITY_SMOKE',
    severity: 'RESTRICTED_ACCESS',
    startCoordinates: { lat: 11.5680, lng: 76.6410 },
    endCoordinates: { lat: 11.5790, lng: 76.6380 },
    maxVehicleWeightTons: 25.0,
    maxVehicleHeightMeters: 4.5,
    disqualifiedVehicleTypes: ['ALS_PARAMEDIC_AMBULANCE'], // Ambulances without high-intensity fog lights
    verifiedBy: 'Masinagudi Fire Station Officer',
    verifiedAtUtc: '2026-11-13T10:10:00Z',
    estimatedReopenTimeUtc: '2026-11-13T14:30:00Z',
    tacticalDetourRecommendation: 'Pilot vehicle escort required for priority apparatus.',
  },
  // 4. Sierra Nevada - Bucks Lake Road
  {
    hazardId: 'HAZ-SIE-001',
    roadName: 'Bucks Lake Road (Quincy to Meadow Valley)',
    highwayCode: 'FS-24N33',
    regionId: 'REG-SIERRA',
    hazardType: 'CLOSED_ROCKFALL_DEBRIS',
    severity: 'CRITICAL_IMPASSABLE',
    startCoordinates: { lat: 39.8920, lng: -121.1450 },
    endCoordinates: { lat: 39.9140, lng: -121.0950 },
    maxVehicleWeightTons: 0,
    maxVehicleHeightMeters: 0,
    disqualifiedVehicleTypes: [
      'TYPE_1_STRUCTURAL_ENGINE',
      'TACTICAL_WATER_TENDER_HEAVY',
      'BULLDOZER_TRANSPORT_DOZER',
    ],
    verifiedBy: 'Caltrans District 2 Highway Maintenance',
    verifiedAtUtc: '2026-11-13T08:20:00Z',
    estimatedReopenTimeUtc: '2026-11-13T16:00:00Z',
    tacticalDetourRecommendation: 'Use Spanish Ranch Forest Byway (high-clearance 4WD only).',
  },
];

// ============================================================================
// LIVE RESPONDER APPARATUS TELEMETRY
// ============================================================================

export const RESPONDER_APPARATUS_FLEET: LiveResponderApparatus[] = [
  // Nilgiri Fleet
  {
    apparatusId: 'UNIT-NIL-ENG-01',
    callsign: 'Ooty Strike Engine 1',
    vehicleClass: 'TYPE_3_WILDLAND_ENGINE',
    agencyAffiliation: 'Tamil Nadu Fire and Rescue Services (TNFRS)',
    assignedIncidentId: 'INC-2026-10-31-01',
    cadStatus: 'ON_SCENE_ACTIVE_SUPPRESSION',
    homeStationName: 'Udhagamandalam Main Fire Station',
    regionId: 'REG-NILGIRI',
    telemetry: {
      lat: 11.4285,
      lng: 76.7112,
      headingDeg: 245,
      speedKmh: 0,
      lastPingUtc: '2026-11-13T10:48:00Z',
    },
    crewCapacity: 4,
    crewOnBoard: 4,
    waterTankCapacityLiters: 3000,
    waterRemainingPct: 42,
    foamConcentrateLiters: 120,
    pumpFlowRateLpm: 1800,
    fuelRemainingPct: 68,
    radioFrequencyMhz: 156.800,
    isSimulated: true,
  },
  {
    apparatusId: 'UNIT-NIL-TND-01',
    callsign: 'Nilgiri Tactical Tender 4',
    vehicleClass: 'TACTICAL_WATER_TENDER_HEAVY',
    agencyAffiliation: 'TNFRS District Disaster Pool',
    assignedIncidentId: 'INC-2026-10-31-01',
    cadStatus: 'REFILLING_WATER_SUPPLY',
    homeStationName: 'Gudalur Civil Defense Yard',
    regionId: 'REG-NILGIRI',
    telemetry: {
      lat: 11.4820,
      lng: 76.6210, // At Pykara reservoir pump
      headingDeg: 110,
      speedKmh: 0,
      lastPingUtc: '2026-11-13T10:49:30Z',
    },
    crewCapacity: 2,
    crewOnBoard: 2,
    waterTankCapacityLiters: 12000,
    waterRemainingPct: 95,
    foamConcentrateLiters: 0,
    pumpFlowRateLpm: 2400,
    fuelRemainingPct: 84,
    radioFrequencyMhz: 156.800,
    isSimulated: true,
  },
  {
    apparatusId: 'UNIT-NIL-AMB-01',
    callsign: '108 GVK EMS Unit 14',
    vehicleClass: 'ALS_PARAMEDIC_AMBULANCE',
    agencyAffiliation: 'Tamil Nadu 108 Emergency Medical Services',
    assignedIncidentId: 'INC-2026-10-31-01',
    cadStatus: 'STAGED_AT_INCIDENT_BASE',
    homeStationName: 'Masinagudi PHC Standby Yard',
    regionId: 'REG-NILGIRI',
    telemetry: {
      lat: 11.5714,
      lng: 76.6425,
      headingDeg: 0,
      speedKmh: 0,
      lastPingUtc: '2026-11-13T10:47:15Z',
    },
    crewCapacity: 3,
    crewOnBoard: 3,
    waterTankCapacityLiters: 0,
    waterRemainingPct: 0,
    foamConcentrateLiters: 0,
    pumpFlowRateLpm: 0,
    fuelRemainingPct: 79,
    radioFrequencyMhz: 154.280,
    isSimulated: true,
  },
  {
    apparatusId: 'UNIT-NIL-BRUSH-02',
    callsign: 'Forest Department Quick Attack 2',
    vehicleClass: 'TYPE_6_RAPID_ATTACK_BRUSH_TRUCK',
    agencyAffiliation: 'Mudumalai Tiger Reserve Protection Force',
    assignedIncidentId: 'INC-2026-10-31-01',
    cadStatus: 'EN_ROUTE_TO_ASSIGNMENT',
    homeStationName: 'Kallatti Forest Station',
    regionId: 'REG-NILGIRI',
    telemetry: {
      lat: 11.4420,
      lng: 76.6950,
      headingDeg: 135,
      speedKmh: 34,
      lastPingUtc: '2026-11-13T10:49:50Z',
    },
    crewCapacity: 3,
    crewOnBoard: 3,
    waterTankCapacityLiters: 1200,
    waterRemainingPct: 100,
    foamConcentrateLiters: 60,
    pumpFlowRateLpm: 600,
    fuelRemainingPct: 91,
    radioFrequencyMhz: 156.800,
    isSimulated: true,
  },
  // Sierra Fleet
  {
    apparatusId: 'UNIT-SIE-ENG-03',
    callsign: 'Plumas NF Engine 332',
    vehicleClass: 'TYPE_3_WILDLAND_ENGINE',
    agencyAffiliation: 'US Forest Service (USFS)',
    assignedIncidentId: 'INC-2026-SIE-01',
    cadStatus: 'ON_SCENE_ACTIVE_SUPPRESSION',
    homeStationName: 'Quincy Ranger District',
    regionId: 'REG-SIERRA',
    telemetry: {
      lat: 39.9820,
      lng: -120.7850,
      headingDeg: 320,
      speedKmh: 0,
      lastPingUtc: '2026-11-13T10:46:00Z',
    },
    crewCapacity: 5,
    crewOnBoard: 5,
    waterTankCapacityLiters: 2500,
    waterRemainingPct: 58,
    foamConcentrateLiters: 100,
    pumpFlowRateLpm: 1500,
    fuelRemainingPct: 72,
    radioFrequencyMhz: 170.525,
    isSimulated: true,
  },
  {
    apparatusId: 'UNIT-SIE-DOZER-01',
    callsign: 'CAL FIRE Dozer 2141',
    vehicleClass: 'BULLDOZER_TRANSPORT_DOZER',
    agencyAffiliation: 'CAL FIRE Butte Unit',
    assignedIncidentId: 'INC-2026-SIE-01',
    cadStatus: 'EN_ROUTE_TO_ASSIGNMENT',
    homeStationName: 'Oroville Fire Station',
    regionId: 'REG-SIERRA',
    telemetry: {
      lat: 39.7540,
      lng: -121.2850,
      headingDeg: 45,
      speedKmh: 48,
      lastPingUtc: '2026-11-13T10:48:30Z',
    },
    crewCapacity: 2,
    crewOnBoard: 2,
    waterTankCapacityLiters: 0,
    waterRemainingPct: 0,
    foamConcentrateLiters: 0,
    pumpFlowRateLpm: 0,
    fuelRemainingPct: 88,
    radioFrequencyMhz: 151.355,
    isSimulated: true,
  },
];

// ============================================================================
// CONFIRMED STAGING YARDS & RESOURCE BASES
// ============================================================================

export const CONFIRMED_STAGING_YARDS: ConfirmedStagingYard[] = [
  // Nilgiri Staging
  {
    stagingId: 'STAGE-NIL-01',
    name: 'Masinagudi Multi-Agency Forward Staging Area',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.5695, lng: 76.6415 },
    yardCapacityApparatus: 24,
    currentStationedCount: 8,
    hasWaterRefillHydrant: true,
    hasFuelDepot: true,
    hasHelitackRetardantDipTank: true,
    medicalTriageCapability: true,
    commandLiaisonOfficer: 'Deputy Superintendent of Police / Range Forest Officer',
    accessRoadCondition: 'PAVED_ALL_WEATHER',
  },
  {
    stagingId: 'STAGE-NIL-02',
    name: 'Kallatti Escarpment Helispot & Tactical Dip Pool',
    regionId: 'REG-NILGIRI',
    coordinates: { lat: 11.4580, lng: 76.6780 },
    yardCapacityApparatus: 8,
    currentStationedCount: 3,
    hasWaterRefillHydrant: true,
    hasFuelDepot: false,
    hasHelitackRetardantDipTank: true,
    medicalTriageCapability: false,
    commandLiaisonOfficer: 'Forest Range Officer (Kallatti Beat)',
    accessRoadCondition: 'GRAVEL_COMPACTED',
  },
  // Sierra Staging
  {
    stagingId: 'STAGE-SIE-01',
    name: 'Plumas County Fairgrounds Incident Command Post (ICP)',
    regionId: 'REG-SIERRA',
    coordinates: { lat: 39.9385, lng: -120.9415 },
    yardCapacityApparatus: 60,
    currentStationedCount: 22,
    hasWaterRefillHydrant: true,
    hasFuelDepot: true,
    hasHelitackRetardantDipTank: true,
    medicalTriageCapability: true,
    commandLiaisonOfficer: 'USFS Operations Section Chief Type-2',
    accessRoadCondition: 'PAVED_ALL_WEATHER',
  },
];

// ============================================================================
// HELPER QUERY FUNCTIONS
// ============================================================================

export function getRoadHazardsForRegion(regionId: string): RoadHazardSegment[] {
  return ROAD_HAZARD_SEGMENTS.filter((h) => h.regionId === regionId);
}

export function getFleetForRegion(regionId: string): LiveResponderApparatus[] {
  return RESPONDER_APPARATUS_FLEET.filter((u) => u.regionId === regionId);
}

export function getStagingYardsForRegion(regionId: string): ConfirmedStagingYard[] {
  return CONFIRMED_STAGING_YARDS.filter((s) => s.regionId === regionId);
}

/**
 * Checks whether an emergency vehicle profile can traverse a route with given road hazards.
 */
export function evaluateRouteClearance(
  vehicleClass: ResponderVehicleClass,
  vehicleWeightTons: number,
  vehicleHeightMeters: number,
  routeHazardIds: string[]
): {
  isTraversable: boolean;
  blockingHazards: RoadHazardSegment[];
  clearanceReason: string;
} {
  const hazards = ROAD_HAZARD_SEGMENTS.filter((h) => routeHazardIds.includes(h.hazardId));
  const blocking: RoadHazardSegment[] = [];

  for (const h of hazards) {
    if (h.severity === 'CRITICAL_IMPASSABLE') {
      blocking.push(h);
      continue;
    }
    if (h.maxVehicleWeightTons !== null && vehicleWeightTons > h.maxVehicleWeightTons) {
      blocking.push(h);
      continue;
    }
    if (h.maxVehicleHeightMeters !== null && vehicleHeightMeters > h.maxVehicleHeightMeters) {
      blocking.push(h);
      continue;
    }
    if (h.disqualifiedVehicleTypes.includes(vehicleClass)) {
      blocking.push(h);
    }
  }

  return {
    isTraversable: blocking.length === 0,
    blockingHazards: blocking,
    clearanceReason:
      blocking.length === 0
        ? 'Route fully cleared for apparatus profile.'
        : `Blocked by ${blocking.length} road hazard(s): ${blocking.map((b) => b.hazardType).join(', ')}.`,
  };
}

