/**
 * Connected Agency CAD Dispatch & Authenticated Ranger Field Verification
 *
 * HYPER-REALISTIC MOCK DATASET — Modeled on Central Computer-Aided Dispatch (CAD)
 * Interagency Feeds (112 / 911 / Forest Command), NWCG ICS-201 Field Initial Attack
 * Size-Up Standards, and Cryptographically Authenticated Ranger Field Observations.
 *
 * NOT real police/fire CAD records or real forest department transmissions.
 * Created for multi-source evidence corroboration and epistemic verification.
 */

export type CadCallPriority =
  | 'PRIORITY_ECHO_IMMINENT_LIFE_THREAT'
  | 'PRIORITY_DELTA_STRUCTURE_THREAT'
  | 'PRIORITY_CHARLIE_WILDLAND_SMOKE_CHECK'
  | 'PRIORITY_BRAVO_ROUTINE_INVESTIGATION';

export type CadDispatchState =
  | 'CALL_RECEIVED'
  | 'CALL_TRIAGED'
  | 'UNITS_DISPATCHED'
  | 'FIRST_UNIT_ON_SCENE'
  | 'INCIDENT_ESCALATED_COMMAND_SET'
  | 'UNDER_CONTROL'
  | 'CLOSED_RESOLVED';

export interface CadDispatchEvent {
  cadEventId: string;
  incidentId: string | null;
  regionId: string;
  dispatchCenter: string;
  callReceivedUtc: string;
  callPriority: CadCallPriority;
  initialCallerType:
    | 'CITIZEN_EMERGENCY_CALL'
    | 'FOREST_RANGER_TACTICAL_RADIO'
    | 'AUTOMATED_OPTICAL_LOOKOUT_TOWER'
    | 'HIGHWAY_PATROL_CRUISER';
  reportedLocationText: string;
  coordinates: { lat: number; lng: number };
  cadStatus: CadDispatchState;
  assignedUnitCallsigns: string[];
  cadLogEntries: {
    timestampUtc: string;
    operatorId: string;
    actionNote: string;
  }[];
  isSimulated: true;
}

export type SmokeColumnCharacteristics =
  | 'WHITE_DIFFUSE_LIGHT_GRASS'
  | 'GREY_PULSING_UNDERSTORY'
  | 'BLACK_DENSE_CROWN_FIRE'
  | 'YELLOW_RESINOUS_EXTREME';

export interface AuthenticatedRangerReport {
  reportId: string;
  incidentId: string;
  regionId: string;
  officerName: string;
  officerBadgeId: string;
  agency: string;
  timestampUtc: string;
  coordinates: { lat: number; lng: number };
  gpsAccuracyMeters: number;
  digitalSignatureSha256: string;
  initialAttackSizeUpIcs201: {
    fireName: string;
    estimatedAreaHectares: number;
    flameLengthMeters: number;
    spreadRateEstimateMMin: number;
    smokeColumn: SmokeColumnCharacteristics;
    fuelInvolved: string;
    topographicPosition: 'VALLEY_BOTTOM' | 'MID_SLOPE' | 'RIDGE_TOP' | 'CHASM_CHUTE';
    structuresImmediatelyThreatened: number;
    groundWindEstimateKmh: number;
    groundWindDirection: string;
    accessRouteConfirmedPassable: boolean;
    waterSourceAvailableNearby: boolean;
    nearbyWaterSourceDetails: string;
    recommendedInitialUnits: string[];
    immediateTacticalAction: string;
  };
  fieldPhotographs: {
    photoId: string;
    azimuthDeg: number;
    focalLengthMm: number;
    caption: string;
    exifTimestampUtc: string;
    thermalChannelKelvin: number | null;
  }[];
  corroborationStatus: 'OFFICIALLY_VERIFIED' | 'CROSS_CORROBORATED' | 'PENDING_SECOND_LOOK';
  isSimulated: true;
}

export interface MultiSourceCorroborationMatrix {
  incidentId: string;
  satelliteObservationCount: number;
  cadCallCount: number;
  rangerReportCount: number;
  weatherStationValidated: boolean;
  overallCorroborationScorePct: number;
  epistemicTier:
    | 'satellite_thermal_anomaly'
    | 'candidate_incident'
    | 'independently_corroborated'
    | 'field_confirmed'
    | 'authority_confirmed_emergency';
  epistemicAuditTrail: {
    timestampUtc: string;
    evidenceModality: string;
    sourceIdentifier: string;
    weightContributionPct: number;
    epistemicImpact: string;
  }[];
}

// ============================================================================
// CAD DISPATCH EVENTS (Nilgiri & Sierra Incidents)
// ============================================================================

export const CAD_DISPATCH_EVENTS: CadDispatchEvent[] = [
  // 1. Nilgiri - Moyar Chasm Fire Call
  {
    cadEventId: 'CAD-2026-NIL-0842',
    incidentId: 'INC-2026-10-31-01',
    regionId: 'REG-NILGIRI',
    dispatchCenter: 'Nilgiris District Emergency Operations Center (EOC 112/101)',
    callReceivedUtc: '2026-11-13T07:14:22Z',
    callPriority: 'PRIORITY_DELTA_STRUCTURE_THREAT',
    initialCallerType: 'FOREST_RANGER_TACTICAL_RADIO',
    reportedLocationText: 'Moyar Chasm northern rim above Kallatti 9th hairpin, heavy smoke rising.',
    coordinates: { lat: 11.4185, lng: 76.7042 },
    cadStatus: 'FIRST_UNIT_ON_SCENE',
    assignedUnitCallsigns: ['Ooty Strike Engine 1', 'Nilgiri Tactical Tender 4', '108 GVK EMS Unit 14'],
    cadLogEntries: [
      {
        timestampUtc: '2026-11-13T07:14:22Z',
        operatorId: 'DISP-OP-44',
        actionNote: 'Call received from Ranger Officer Masinagudi Beat via TAC-1 channel. Active thermal anomaly reported.',
      },
      {
        timestampUtc: '2026-11-13T07:16:05Z',
        operatorId: 'DISP-OP-44',
        actionNote: 'Cross-referenced with NASA VIIRS 375m detection overpass (06:14 UTC). Hotspot confirmed at 48 MW FRP.',
      },
      {
        timestampUtc: '2026-11-13T07:18:40Z',
        operatorId: 'DISP-OP-12',
        actionNote: 'Dispatched Ooty Strike Engine 1 and Kallatti Quick Attack 2 on Code 3 emergency response.',
      },
      {
        timestampUtc: '2026-11-13T07:44:12Z',
        operatorId: 'DISP-OP-12',
        actionNote: 'Unit Ooty Strike Engine 1 arrives on scene. Establishes Moyar Incident Command. Reports rapid brush fire spread.',
      },
    ],
    isSimulated: true,
  },
  // 2. Sierra Nevada - Bucks Lake Call
  {
    cadEventId: 'CAD-2026-SIE-0319',
    incidentId: 'INC-2026-SIE-01',
    regionId: 'REG-SIERRA',
    dispatchCenter: 'Plumas County Sheriff & USFS Interagency Dispatch (Quincy ECC)',
    callReceivedUtc: '2026-11-13T06:50:14Z',
    callPriority: 'PRIORITY_ECHO_IMMINENT_LIFE_THREAT',
    initialCallerType: 'AUTOMATED_OPTICAL_LOOKOUT_TOWER',
    reportedLocationText: 'Bucks Lake Ridge lookout optical camera detected heavy grey smoke column.',
    coordinates: { lat: 39.9921, lng: -120.8031 },
    cadStatus: 'INCIDENT_ESCALATED_COMMAND_SET',
    assignedUnitCallsigns: ['Plumas NF Engine 332', 'CAL FIRE Dozer 2141'],
    cadLogEntries: [
      {
        timestampUtc: '2026-11-13T06:50:14Z',
        operatorId: 'USFS-ECC-08',
        actionNote: 'Automated AI Smoke Detection alert from Spanish Peak Lookout Camera. Plume coordinates verified.',
      },
      {
        timestampUtc: '2026-11-13T06:54:30Z',
        operatorId: 'USFS-ECC-08',
        actionNote: 'Full initial attack wildland box dispatched: USFS Engine 332, CAL FIRE Dozer 2141.',
      },
      {
        timestampUtc: '2026-11-13T07:22:10Z',
        operatorId: 'USFS-ECC-02',
        actionNote: 'Engine 332 on scene. Heavy timber crowning observed. Incident Commander requests Type-2 IMT activation.',
      },
    ],
    isSimulated: true,
  },
];

// ============================================================================
// AUTHENTICATED RANGER FIELD SIZE-UP REPORTS (ICS-201)
// ============================================================================

export const AUTHENTICATED_RANGER_REPORTS: AuthenticatedRangerReport[] = [
  // 1. Ranger Report - Masinagudi / Moyar (Nilgiri)
  {
    reportId: 'RPT-NIL-2026-001',
    incidentId: 'INC-2026-10-31-01',
    regionId: 'REG-NILGIRI',
    officerName: 'K. R. Vasanth',
    officerBadgeId: 'TNFD-RO-4182',
    agency: 'Tamil Nadu Forest Department / Mudumalai Tiger Reserve',
    timestampUtc: '2026-11-13T08:15:00Z',
    coordinates: { lat: 11.4215, lng: 76.7028 },
    gpsAccuracyMeters: 3.2,
    digitalSignatureSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    initialAttackSizeUpIcs201: {
      fireName: 'Moyar Chasm Wildfire',
      estimatedAreaHectares: 480,
      flameLengthMeters: 4.8,
      spreadRateEstimateMMin: 18.0,
      smokeColumn: 'GREY_PULSING_UNDERSTORY',
      fuelInvolved: 'Dry teak litter, elephant grass, and dense invasive Lantana camara thickets',
      topographicPosition: 'MID_SLOPE',
      structuresImmediatelyThreatened: 4,
      groundWindEstimateKmh: 28,
      groundWindDirection: 'ENE (Gusting up Moyar gorge chasm)',
      accessRouteConfirmedPassable: false, // NH-181 blocked by flame crossing
      waterSourceAvailableNearby: true,
      nearbyWaterSourceDetails: 'Pykara Glenmorgan canal intake pipe located 2.4 km west with 4-inch valve coupling.',
      recommendedInitialUnits: ['2x Type-3 Wildland Engines', '1x 12,000L Water Tender', 'Hand Crew for Fireline Scratch'],
      immediateTacticalAction: 'Initiate flanking line burnout along southern tea estate perimeter road to defend estate workers quarters.',
    },
    fieldPhotographs: [
      {
        photoId: 'PHOTO-NIL-001A',
        azimuthDeg: 245,
        focalLengthMm: 50,
        caption: 'Ground perspective of Moyar chasm eastern flank showing torching in lantana understory.',
        exifTimestampUtc: '2026-11-13T08:12:15Z',
        thermalChannelKelvin: 840,
      },
      {
        photoId: 'PHOTO-NIL-001B',
        azimuthDeg: 190,
        focalLengthMm: 35,
        caption: 'Road cut along NH-181 showing fallen burning pine log blocking both lanes.',
        exifTimestampUtc: '2026-11-13T08:14:30Z',
        thermalChannelKelvin: 620,
      },
    ],
    corroborationStatus: 'OFFICIALLY_VERIFIED',
    isSimulated: true,
  },
  // 2. Ranger Report - Sierra Nevada (Quincy District)
  {
    reportId: 'RPT-SIE-2026-002',
    incidentId: 'INC-2026-SIE-01',
    regionId: 'REG-SIERRA',
    officerName: 'Sarah J. Miller',
    officerBadgeId: 'USFS-DIV-891',
    agency: 'US Forest Service / Plumas National Forest',
    timestampUtc: '2026-11-13T07:45:00Z',
    coordinates: { lat: 39.9880, lng: -120.7950 },
    gpsAccuracyMeters: 2.8,
    digitalSignatureSha256: '8f434346648f6b96df89dda901c5176b10e6d83961dd3c1ac88b59b2dc327aa4',
    initialAttackSizeUpIcs201: {
      fireName: 'Spanish Peak Timber Fire',
      estimatedAreaHectares: 1390,
      flameLengthMeters: 7.5,
      spreadRateEstimateMMin: 32.0,
      smokeColumn: 'BLACK_DENSE_CROWN_FIRE',
      fuelInvolved: 'Mature ponderosa pine / white fir timber with heavy drought-killed down logs',
      topographicPosition: 'RIDGE_TOP',
      structuresImmediatelyThreatened: 12,
      groundWindEstimateKmh: 35,
      groundWindDirection: 'NE (Down-canyon diurnal wind acceleration)',
      accessRouteConfirmedPassable: true,
      waterSourceAvailableNearby: true,
      nearbyWaterSourceDetails: 'Bucks Lake marina boat launch hydrants and lake intake dip pool.',
      recommendedInitialUnits: ['5x Type-3 Engines', '2x Heavy Dozers', '2x Heavy Air Tankers for Ridge Retardant Drop'],
      immediateTacticalAction: 'Establish anchor point at Bucks Lake Dam crest and prep structure defense on eastern cabins.',
    },
    fieldPhotographs: [
      {
        photoId: 'PHOTO-SIE-001A',
        azimuthDeg: 310,
        focalLengthMm: 70,
        caption: 'Active crown torching along Spanish Peak ridge saddle.',
        exifTimestampUtc: '2026-11-13T07:43:00Z',
        thermalChannelKelvin: 1150,
      },
    ],
    corroborationStatus: 'OFFICIALLY_VERIFIED',
    isSimulated: true,
  },
];

// ============================================================================
// MULTI-SOURCE CORROBORATION MATRICES
// ============================================================================

export const CORROBORATION_MATRICES: MultiSourceCorroborationMatrix[] = [
  {
    incidentId: 'INC-2026-10-31-01',
    satelliteObservationCount: 8, // MODIS + VIIRS
    cadCallCount: 1,
    rangerReportCount: 1,
    weatherStationValidated: true, // RAWS station confirmed 28 km/h wind & 5% 1hr fuel moisture
    overallCorroborationScorePct: 98,
    epistemicTier: 'authority_confirmed_emergency',
    epistemicAuditTrail: [
      {
        timestampUtc: '2026-11-13T06:14:00Z',
        evidenceModality: 'SATELLITE_ORBITAL_PASS',
        sourceIdentifier: 'VIIRS_NOAA20_375M',
        weightContributionPct: 35,
        epistemicImpact: 'Initial radiometric thermal anomaly detected (384K brightness, 48.2 MW FRP).',
      },
      {
        timestampUtc: '2026-11-13T07:14:22Z',
        evidenceModality: 'CAD_DISPATCH_CALL',
        sourceIdentifier: 'CAD-2026-NIL-0842',
        weightContributionPct: 20,
        epistemicImpact: '112/101 Dispatch call logged by Range Forest Officer. Incident promoted to Candidate Incident.',
      },
      {
        timestampUtc: '2026-11-13T07:30:00Z',
        evidenceModality: 'WEATHER_SURFACE_RAWS',
        sourceIdentifier: 'RAWS-NIL-001',
        weightContributionPct: 15,
        epistemicImpact: 'Local station network confirms critical 5.2% fuel moisture and 28 km/h valley winds.',
      },
      {
        timestampUtc: '2026-11-13T08:15:00Z',
        evidenceModality: 'FIELD_RANGER_ICS201',
        sourceIdentifier: 'RPT-NIL-2026-001',
        weightContributionPct: 30,
        epistemicImpact: 'Cryptographically signed ICS-201 field size-up with ground photos received. Status escalated to Field Confirmed.',
      },
    ],
  },
];

// ============================================================================
// HELPER QUERY FUNCTIONS
// ============================================================================

export function getCadEventsForRegion(regionId: string): CadDispatchEvent[] {
  return CAD_DISPATCH_EVENTS.filter((e) => e.regionId === regionId);
}

export function getRangerReportsForIncident(incidentId: string): AuthenticatedRangerReport[] {
  return AUTHENTICATED_RANGER_REPORTS.filter((r) => r.incidentId === incidentId);
}

export function getCorroborationMatrix(incidentId: string): MultiSourceCorroborationMatrix | null {
  return CORROBORATION_MATRICES.find((m) => m.incidentId === incidentId) || null;
}

