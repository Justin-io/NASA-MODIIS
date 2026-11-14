export type VerificationLevel =
  | 'satellite_thermal_anomaly'
  | 'candidate_incident'
  | 'independently_corroborated'
  | 'field_confirmed'
  | 'authority_confirmed_emergency';

export type RiskSeverity = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export type SensorType = 'MODIS_TERRA' | 'MODIS_AQUA' | 'VIIRS_SNPP' | 'VIIRS_NOAA20' | 'VIIRS_NOAA21';

export interface SatelliteObservation {
  id: string;
  sensor: SensorType;
  timestamp: string;
  lat: number;
  lng: number;
  brightnessKelvin: number;
  frpMw: number; // Fire Radiative Power in MW
  confidencePct: number;
  scanPixelKm: number;
  trackPixelKm: number;
  dayNight: 'D' | 'N';
  orbitPass: string;
}

export interface HarmonizedHotspotCell {
  cellId: string;
  latCenter: number;
  lngCenter: number;
  uncertaintyRadiusMeters: number;
  harmonizedFrpMw: number;
  peakConfidencePct: number;
  contributingSensors: SensorType[];
  observationCount: number;
  firstObserved: string;
  lastObserved: string;
  historicalAnomalyRatio: number; // e.g., 2.4x 10-year median
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  category: 'satellite' | 'weather' | 'news' | 'field' | 'agent' | 'authority';
  title: string;
  detail: string;
  verification: 'verified' | 'corroborated' | 'unverified' | 'simulation';
}

export interface IncidentRecord {
  id: string;
  title: string;
  region: string;
  district: string;
  status: VerificationLevel;
  severity: RiskSeverity;
  coordinates: { lat: number; lng: number };
  uncertaintyRadiusMeters: number;
  firstObserved: string;
  latestObserved: string;
  modisCount: number;
  viirsCount: number;
  harmonizedFrpMw: number;
  historicalMedianFrpMw: number;
  vegetationDrynessIndex: number; // 0-100
  soilMoisturePct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windCompass: string;
  temperatureC: number;
  humidityPct: number;
  estimatedAreaHa: number;
  estimatedPopulationExposed: number;
  affectedAssets: string[];
  recommendedStaging: { name: string; lat: number; lng: number; clearance: string }[];
  sourceProvenance: string[];
  summary: string;
  unverifiedNotes: string;
  authorityStatus: 'Pending District EOC Review' | 'Acknowledged by Forest Dept' | 'Official Emergency Declared' | 'Monitoring Only';
  observations: SatelliteObservation[];
  timeline: TimelineEvent[];
}

export interface WeatherStationSnapshot {
  stationId: string;
  regionName: string;
  lat: number;
  lng: number;
  observedAt: string;
  forecastWindow: string;
  source: string;
  freshnessMinutes: number;
  isSimulated: boolean;
  isAvailable?: boolean;
  status?: 'OPERATIONAL' | 'UNAVAILABLE' | 'DEGRADED';
  errorMessage?: string;
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  windCompass: string;
  rainfallMm24h: number;
  precipProbabilityPct: number;
  soilMoisturePct: number;
  fuelDrynessPct: number;
  lightningStrikes1h: number;
  warningText: string | null;
  hourlyTrend: { hour: string; tempC: number; windKmh: number; humidityPct: number; rainMm: number }[];
}

export type ClaimVerificationStatus =
  | 'verified_official'
  | 'independently_corroborated'
  | 'unverified_claim'
  | 'ai_interpretation';

export interface NewsIntelligenceItem {
  id: string;
  title: string;
  sourceName: string;
  sourceType: 'Official Government Alert' | 'District Emergency Feed' | 'Regional Journalism' | 'Citizen Field Report' | 'ALEX Synthesis';
  credibilityScore: number; // 0-100
  publishedAt: string;
  eventTimestamp: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  relatedIncidentId: string | null;
  verificationStatus: ClaimVerificationStatus;
  duplicateGroupCount: number;
  category: 'Fire Advisory' | 'Road Blockage' | 'Casualty Report' | 'Property Damage' | 'Evacuation Notice' | 'Weather Warning';
  excerpt: string;
  extractedClaims: {
    claimText: string;
    corroboratedBy: string[];
    contradictedBy: string[];
    confidence: 'High' | 'Moderate' | 'Low / Unverified';
  }[];
}

export interface EvidenceNode {
  id: string;
  label: string;
  type: 'satellite' | 'weather' | 'news' | 'official' | 'field' | 'infrastructure' | 'hypothesis';
  verification: 'verified' | 'corroborated' | 'unverified' | 'hypothesis';
  timestamp: string;
  confidencePct: number;
  summary: string;
  sourceRef: string;
  x: number;
  y: number;
  incidentId: string;
}

export interface EvidenceEdge {
  id: string;
  source: string;
  target: string;
  relation: 'supports' | 'corroborates' | 'contradicts' | 'threatens' | 'derived_from';
  weight: number;
  explanation: string;
}

export type AgentRoleName =
  | 'Watchtower'
  | 'Investigator'
  | 'Skeptic'
  | 'Verifier'
  | 'Impact Assessor'
  | 'Mission Planner'
  | 'Authority Liaison'
  | 'Community Liaison'
  | 'Fleet Manager'
  | 'Mission Scribe';

export interface AgentStatusRecord {
  id: string;
  name: AgentRoleName;
  specialty: string;
  status: 'Active Monitoring' | 'Evaluating Evidence' | 'Awaiting Human Review' | 'Idle / Standby';
  currentTask: string;
  latestOutput: string;
  uncertaintyNote: string | null;
  invalidatedAssumption: string | null;
  recommendedAction: string;
  sourceReferences: string[];
  executionHistory: { timestamp: string; toolUsed: string; summary: string; isRecommendationOnly: boolean }[];
}

export type VehicleCategory = 'ambulance' | 'fire_engine' | 'rescue_vehicle' | 'logistics_vehicle';

export interface RouteOption {
  id: string;
  name: string;
  isPrimary: boolean;
  originName: string;
  destinationName: string;
  vehicleAllowed: VehicleCategory[];
  distanceKm: number;
  baseDurationMin: number;
  trafficAdjustedDurationMin: number;
  confidencePct: number;
  lastUpdated: string;
  hazardProximityKm: number;
  roadRestrictions: string[];
  reportedBlockages: string[];
  recommendationReason: string;
  waypoints: [number, number][];
}

export type DispatchWorkflowState =
  | 'draft'
  | 'awaiting_dispatcher_approval'
  | 'submitted'
  | 'acknowledged'
  | 'assigned'
  | 'en_route'
  | 'on_scene'
  | 'completed';

export interface CasualtyReportRecord {
  id: string;
  incidentId: string;
  reportedAt: string;
  source: string;
  verificationStatus: 'Unverified Field Call' | 'Corroborated by Forest Ranger' | 'Confirmed by Medical Team';
  locationName: string;
  coordinates: { lat: number; lng: number };
  uncertaintyRadiusMeters: number;
  injuredCount: number;
  missingCount: number;
  urgency: 'Immediate (T1)' | 'Urgent (T2)' | 'Delayed (T3)';
  medicalNotes: string;
  requiredResources: string[];
  suggestedHospital: string;
  hospitalDistanceKm: number;
  dispatchState: DispatchWorkflowState;
  dispatcherNotes: string;
  authorizedIntegrationConfirmed: boolean;
}

export interface AgencyTask {
  id: string;
  agency: 'Fire & Rescue' | 'Emergency Medical Services' | 'District Police' | 'Forest Department' | 'District EOC' | 'Authorised Field Team';
  title: string;
  owner: string;
  status: 'Proposed by ALEX' | 'Assigned' | 'In Progress' | 'Completed';
  timestamp: string;
  notes: string;
}

export interface ResourceAsset {
  id: string;
  name: string;
  category: 'Fire Engine' | 'Ambulance' | 'Water Tanker' | 'Hospital' | 'Rescue Team' | 'Ground IoT Sensor' | 'Staging Area';
  capability: string;
  operationalStatus: 'Available' | 'Assigned' | 'Maintenance' | 'Standby';
  availabilitySource: 'Live Verified Telemetry' | 'Manual EOC Entry' | 'Estimated / Simulated';
  lastSeen: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  assignedIncidentId: string | null;
}

export interface CommunityAdvisory {
  id: string;
  zoneName: string;
  tier: 'General Preparedness' | 'Possible Nearby Hazard' | 'Official Emergency Instruction';
  attributionAuthority: string;
  languages: string[];
  recipientCount: number;
  deliveredPct: number;
  acknowledgedPct: number;
  messageBody: string;
  status: 'Draft Advisory' | 'Awaiting Authority Approval' | 'Broadcast Active';
  updatedAt: string;
  severity?: 'info' | 'anomaly_notice' | 'preparedness_advisory' | 'official_warning' | 'emergency_declaration';
  affectedAdministrativeDistricts?: string[];
  recommendedActions?: string[];
  consentVerification?: boolean;
}

export interface MonthlyBurnRecord {
  monthIndex: number; // 0-11
  monthName: string;
  modisDetections: number;
  viirsDetections: number;
  harmonizedEvents: number;
  historicalMedianEvents: number;
  meanFrpMw: number;
  coveragePct: number;
  uncertaintyPct: number;
}

export interface SimulationInputParams {
  windSpeedDeltaKmh: number;
  windShiftDeg: number;
  rainfallMmHr: number;
  primaryRoadClosed: boolean;
  additionalCasualties: number;
  waterSupplyDepletedPct: number;
  secondaryIgnitionActive: boolean;
  satellitePassDelayed: boolean;
}

export interface SimulationOutputResult {
  isSimulated: true;
  projectedSpreadRateHaHr: number;
  projected6hAreaHa: number;
  uncertaintyBandPct: number;
  recommendedRouteId: string;
  estimatedTravelTimeMin: number;
  requiredFireEngines: number;
  requiredWaterTankers: number;
  requiredAmbulances: number;
  evacuationTriggerRecommended: boolean;
  rationale: string[];
}

export type TemporalEvidenceModality =
  | 'incident_report'
  | 'satellite_observation'
  | 'sensor_telemetry';

export interface TemporalEvidenceEvent {
  id: string;
  timestampUtc: string;
  minutesFromStart: number; // minutes since 06:00 UTC
  modality: TemporalEvidenceModality;
  title: string;
  sourceUnit: string;
  linkedNodeId: string;
  verification: 'verified' | 'corroborated' | 'unverified';
  confidencePct: number;
  coordinates: { lat: number; lng: number };
  metricLabel: string;
  metricValue: string;
  summary: string;
  telemetrySnapshot?: {
    peakTempC?: number;
    radiativeFluxKwM2?: number;
    pm25UgM3?: number;
    soilMoisturePct?: number;
    canopyHumidityPct?: number;
    frameResolution?: string;
    altitudeM?: number;
  };
}

export interface GeometricIsochroneEllipse {
  horizonHours: 1 | 3 | 6;
  semiMajorKm: number;
  semiMinorKm: number;
  headAdvanceKm: number;
  backingRetreatKm: number;
  flankWidthKm: number;
  projectedAreaHa: number;
  centroidOffsetKm: number;
}

export interface GeometricSpreadProjection {
  isSimulated: true;
  effectiveWindKmh: number;
  effectiveFuelMoisturePct: number;
  relativeHumidityPct: number;
  vaporPressureDeficitKpa: number;
  propagationBearingDeg: number;
  propagationCompass: string;
  lengthToBreadthRatio: number;
  eccentricity: number;
  headFireRateMMin: number;
  headFireSpeedKmh: number;
  flankFireSpeedKmh: number;
  backingFireSpeedKmh: number;
  flameLengthMeters: number;
  firelineIntensityKwM: number;
  crownTransitionRisk: 'Low' | 'Moderate' | 'High' | 'Extreme Crown Torch';
  isochrones: GeometricIsochroneEllipse[];
  threatenedTargets: {
    name: string;
    distanceKm: number;
    bearingDeg: number;
    estimatedArrivalMin: number | null;
    withinCone: boolean;
  }[];
}

export type IncidentHorizontalTimelineCategory =
  | 'satellite_detection'
  | 'field_report'
  | 'sensor_alert';

export interface IncidentHorizontalTimelineItem {
  id: string;
  incidentId: string;
  timestampIso: string;
  timestampLabel: string; // e.g., "06:14 UTC"
  minutesFromDayStart: number;
  horizontalPositionPct: number; // 0 to 100 along horizontal timeline track
  category: IncidentHorizontalTimelineCategory;
  sourceLabel: string;
  title: string;
  detail: string;
  primaryMetric: string;
  secondaryMetric: string;
  confidencePct: number;
  verification: 'verified' | 'corroborated' | 'unverified';
  coordinates: { lat: number; lng: number };
}

export type MapBaseViewMode = 'topographic' | 'satellite' | 'thermal_heatmap';

export interface EarthAtmospherePreset {
  id: 'tsl_classic' | 'solar_flare' | 'cryo_mesosphere';
  label: string;
  dayColorHex: string;
  twilightColorHex: string;
}

export interface TslEarthSolarState {
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
}

export type GlobeHotspotSensorFilter = 'ALL' | 'VIIRS_ONLY' | 'MODIS_ONLY';

export interface GlobeHotspotMarkerVisual {
  id: string;
  incidentId: string;
  incidentTitle: string;
  sensor: SensorType;
  sensorFamily: 'VIIRS' | 'MODIS';
  lat: number;
  lng: number;
  frpMw: number;
  brightnessKelvin: number;
  confidencePct: number;
  timestamp: string;
  orbitPass: string;
  scaleFactor: number;
  pillarHeight: number;
  footprintRadius: number;
  colorHex: string;
  intensityTier: 'extreme' | 'high' | 'moderate' | 'low';
}

export interface PinnedCoordinateDraft {
  lat: number;
  lng: number;
  sectorName: string;
  districtName: string;
  regionId: string;
  estimatedFrpMw: number;
  severity: RiskSeverity;
  customTitle: string;
}

// ==========================================
// ALEX ORBITAL — SATELLITE DYNAMICS & DRIFT
// ==========================================

export type SatelliteMissionId =
  | 'TERRA'
  | 'AQUA'
  | 'SUOMI_NPP'
  | 'NOAA_20'
  | 'NOAA_21'
  | 'SENTINEL_1A'
  | 'SENTINEL_2A'
  | 'SENTINEL_3A'
  | 'HIMAWARI_9'
  | 'GOES_16'
  | 'GOES_19'
  | 'GCOM_C'
  | 'LANDSAT_9';

export interface OrbitalDriftRecord {
  year: number;
  altitudeKm: number;
  mlstHours: number; // e.g., 10.5 = 10:30 AM
  crossingTimeFormatted: string; // e.g. "10:30 AM Descending"
  driftPhase: string;
  samplingBiasFactor: number; // Quantitative multiplier for diurnal fire peak sampling bias
  scientificNotes: string;
}

export interface SatelliteOrbitRecord {
  id: SatelliteMissionId;
  name: string;
  agency: string;
  orbitType: 'sun_synchronous' | 'geostationary' | 'polar_leo';
  altitudeKm: number;
  inclinationDeg: number;
  raanDeg: number;
  eccentricity: number;
  periodMinutes: number;
  repeatCycleDays: number;
  meanLocalEquatorCrossingTime: string;
  sensorPayload: string[];
  primaryInstruments: string;
  operationalStatus: 'operational' | 'orbital_drift_mode' | 'degraded' | 'retired';
  driftHistory: OrbitalDriftRecord[];
  noradId: number;
  tleEpoch: string;
}

export interface ViewingGeometry {
  satelliteId: SatelliteMissionId;
  scanAngleDeg: number;
  offNadirAngleDeg: number;
  viewZenithAngleDeg: number;
  solarZenithAngleDeg: number;
  pixelFootprintKm2: number;
  swathWidthKm: number;
  bowtieExpansionRatio: number;
}

export interface ObservationOpportunity {
  id: string;
  satelliteId: SatelliteMissionId;
  satelliteName: string;
  targetRegionId: string;
  scheduledPassUtc: string;
  passType: 'ascending' | 'descending';
  maxElevationDeg: number;
  viewZenithDeg: number;
  clearSkyProbabilityPct: number;
  qualityStatus: 'OPTIMAL' | 'CLOUD_OBSCURED' | 'DEGRADED_GEOMETRY' | 'SUB_OPTIMAL';
}

// ==========================================
// ALEX FIRE — BURNING-ACTIVITY CALENDAR
// ==========================================

export interface MonthlyBurningActivityRecord {
  year: number;
  month: number; // 1-12
  monthLabel: string;
  modisHotspots: number;
  viirsHotspots: number;
  harmonizedHotspots: number;
  meanFrpMw: number;
  historicalMedianHotspots: number;
  anomalyScorePct: number; // e.g. +34% or -12% vs 2000-2025 baseline
  observationCoveragePct: number;
  dataConfidence: 'HIGH' | 'MODERATE' | 'LOW_OBSERVATION_DENSITY';
  isHistoricalBaseline: boolean;
}

export interface AnnualBurningSummary {
  year: number;
  totalHotspots: number;
  totalFrpMw: number;
  peakMonth: string;
  medianComparisonPct: number;
  anomalyClassification: 'extreme_fire_season' | 'above_average' | 'normal' | 'below_average';
}

// ==========================================
// ALEX CATALOGUE — 18+ EARTH OBSERVATION SOURCES
// ==========================================

export interface DataSourceCatalogueRecord {
  id: string;
  name: string;
  agency: string;
  sensorFamily: string;
  category: 'active_fire' | 'optical' | 'radar_sar' | 'burned_area' | 'meteorology' | 'ground_field';
  productCode: string;
  spatialResolution: string;
  temporalResolution: string;
  latency: string;
  geographicCoverage: string;
  licensing: string;
  authRequirements: string;
  status: 'OPERATIONAL' | 'DEMONSTRATION' | 'REQUIRES_API_KEY' | 'STALE' | 'NOT_CONNECTED';
  lastIngestionUtc: string | null;
  apiDocUrl: string;
}

// ==========================================
// ALEX COMMUNITY — INBOUND REPORTS & ADVISORIES
// ==========================================

export interface CommunityFieldReport {
  id: string;
  timestamp: string;
  reporterName: string;
  reporterRole: 'Forest Ranger' | 'Local Farmer' | 'EOC Spotter' | 'Resident' | 'Highway Patrol';
  coordinates: { lat: number; lng: number };
  nearestLandmark: string;
  hazardType: 'smoke_column' | 'active_understory_fire' | 'crown_fire' | 'blocked_corridor' | 'distressed_wildlife';
  description: string;
  verifiedByAuthority: boolean;
  verifiedByAgency: string | null;
  status: 'submitted' | 'triaged' | 'corroborated' | 'dismissed';
  evidenceAttachments: string[];
}

export interface CommunitySafetyBulletin {
  id: string;
  publishedAt: string;
  severity: 'info' | 'anomaly_notice' | 'preparedness_advisory' | 'official_warning' | 'emergency_declaration';
  title: string;
  message: string;
  affectedAdministrativeDistricts: string[];
  recommendedActions: string[];
  officialSource: string;
  consentVerification: boolean;
}

// ==========================================
// ALEX GOVERNANCE — ROLE-BASED ACCESS CONTROL
// ==========================================

export type UserRole =
  | 'admin'
  | 'scientist'
  | 'analyst'
  | 'commander'
  | 'operator'
  | 'field'
  | 'community';

export interface UserRoleProfile {
  role: UserRole;
  title: string;
  description: string;
  clearanceLevel: number; // 0 to 4
  permittedWorkspaces: string[];
  canApproveDispatch: boolean;
  canInitiateTelephony: boolean;
  canPublishAdvisories: boolean;
  canManageAPIKeys: boolean;
}
