import {
  AgentStatusRecord,
  AgencyTask,
  CasualtyReportRecord,
  CommunityAdvisory,
  EvidenceEdge,
  EvidenceNode,
  IncidentRecord,
  MonthlyBurnRecord,
  NewsIntelligenceItem,
  ResourceAsset,
  RouteOption,
  TemporalEvidenceEvent,
  WeatherStationSnapshot,
} from './types';

export interface MonitoredRegion {
  id: string;
  name: string;
  country: string;
  center: { lat: number; lng: number };
  zoom: number;
  biome: string;
  activePassWindow: string;
}

export const MONITORED_REGIONS: MonitoredRegion[] = [
  {
    id: 'REG-NILGIRI',
    name: 'Nilgiri Biosphere & Western Ghats',
    country: 'India',
    center: { lat: 11.4064, lng: 76.6932 },
    zoom: 11,
    biome: 'Montane Tropical & Dry Deciduous Interface',
    activePassWindow: 'VIIRS Suomi-NPP / NOAA-20 / NOAA-21 · MODIS Terra/Aqua',
  },
  {
    id: 'REG-SIERRA',
    name: 'Sierra Nevada Plumas Basin',
    country: 'United States',
    center: { lat: 39.9921, lng: 120.8031 },
    zoom: 10,
    biome: 'Mixed Conifer & Chaparral Escarpment',
    activePassWindow: 'VIIRS NOAA-20 Pass · GOES-18 Mesoscale',
  },
  {
    id: 'REG-ARCADIA',
    name: 'Peloponnese Arcadia Highlands',
    country: 'Greece',
    center: { lat: 37.5102, lng: 22.3712 },
    zoom: 10,
    biome: 'Mediterranean Sclerophyllous Woodland',
    activePassWindow: 'MODIS Terra/Aqua · Meteosat Third Generation',
  },
  {
    id: 'REG-PANTANAL',
    name: 'Pantanal Wetland Basin',
    country: 'Brazil',
    center: { lat: -17.842, lng: -56.812 },
    zoom: 9,
    biome: 'Neotropical Wetland & Riparian Savanna',
    activePassWindow: 'MODIS Terra/Aqua · VIIRS SNPP/NOAA-20',
  },
];

/**
 * PRODUCTION ZERO-FABRICATION INITIAL STATE (P0.1).
 * All operational arrays initialize empty. Genuine records populate exclusively via:
 * 1. NASA FIRMS NRT live satellite ingestion (MODIS/VIIRS)
 * 2. Authenticated ground telemetry & field ranger reports
 * 3. Open-Meteo validated meteorological surface grid
 * Fixture datasets reside strictly in test/fixtures/ and must never pollute production.
 */
export const INITIAL_INCIDENTS: IncidentRecord[] = [];
export const WEATHER_SNAPSHOTS: WeatherStationSnapshot[] = [];
export const NEWS_FEED_ITEMS: NewsIntelligenceItem[] = [];
export const EVIDENCE_GRAPH_NODES: EvidenceNode[] = [];
export const EVIDENCE_GRAPH_EDGES: EvidenceEdge[] = [];
export const EMERGENCY_ROUTES: RouteOption[] = [];
export const INITIAL_CASUALTY_REPORTS: CasualtyReportRecord[] = [];
export const INITIAL_AGENCY_TASKS: AgencyTask[] = [];
export const INITIAL_RESOURCES: ResourceAsset[] = [];
export const INITIAL_ADVISORIES: CommunityAdvisory[] = [];
export const BURNING_CALENDAR_DATA: Record<string, MonthlyBurnRecord[]> = {};
export const TEMPORAL_EVIDENCE_EVENTS: TemporalEvidenceEvent[] = [];

/**
 * Autonomous Reasoning Agents.
 * Standard operational profiles initialized in neutral standby state.
 */
export const ADAPTIVE_AGENTS: AgentStatusRecord[] = [
  {
    id: 'AG-01',
    name: 'Watchtower',
    specialty: 'Continuous Orbital & Sensor Ingestion',
    status: 'Idle / Standby',
    currentTask: 'System standby. Awaiting NASA FIRMS or sensor feed trigger.',
    latestOutput: 'System nominal. Awaiting satellite pass ingestion.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Execute NASA FIRMS ingestion when satellite pass occurs.',
    sourceReferences: ['NASA FIRMS API', 'Open-Meteo AWS Grid'],
    executionHistory: [],
  },
  {
    id: 'AG-02',
    name: 'Investigator',
    specialty: 'Multi-Source Claim & Field Extraction',
    status: 'Idle / Standby',
    currentTask: 'Standing by for candidate incident evidence.',
    latestOutput: 'No active incident investigations.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Await incident creation trigger.',
    sourceReferences: ['District Police CAD', 'Forest Radio Log'],
    executionHistory: [],
  },
  {
    id: 'AG-03',
    name: 'Skeptic',
    specialty: 'Hypothesis Challenge & False-Positive Filtering',
    status: 'Idle / Standby',
    currentTask: 'Standing by for false-positive evaluation.',
    latestOutput: 'No anomalies queued for debunking.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Filter industrial or solar glint anomalies when detected.',
    sourceReferences: ['Industrial Heat Inventory', 'Topographic Shading'],
    executionHistory: [],
  },
  {
    id: 'AG-04',
    name: 'Verifier',
    specialty: 'Provenance & Epistemic Calibration',
    status: 'Idle / Standby',
    currentTask: 'Standing by for mathematical & coordinate validation.',
    latestOutput: 'Numerical verification engine idle.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Verify incoming observation spatial bounds and scan angle geometry.',
    sourceReferences: ['MODIS Calibration Table Collection 6.1', 'VIIRS Calibration'],
    executionHistory: [],
  },
  {
    id: 'AG-05',
    name: 'Impact Assessor',
    specialty: 'Infrastructure, Population & Ecological Exposure Modelling',
    status: 'Idle / Standby',
    currentTask: 'Standing by for active fire footprint overlay.',
    latestOutput: 'No active exposure perimeters.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Compute exposure once fire front coordinates are established.',
    sourceReferences: ['Census Settlement Grid', 'OSM Infrastructure Layer'],
    executionHistory: [],
  },
  {
    id: 'AG-06',
    name: 'Mission Planner',
    specialty: 'Resource Allocation & Staging Optimization',
    status: 'Idle / Standby',
    currentTask: 'Standing by for incident action planning.',
    latestOutput: 'No active incidents requiring IAP generation.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Generate staging plan when incident is confirmed.',
    sourceReferences: ['District Resource Inventory', 'ICS Form 201'],
    executionHistory: [],
  },
  {
    id: 'AG-07',
    name: 'Authority Liaison',
    specialty: 'Inter-Agency Protocol & Handoff Preparation',
    status: 'Idle / Standby',
    currentTask: 'Standing by for authorized dispatch requests.',
    latestOutput: 'No pending multi-agency dispatches.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Coordinate with incident commander upon emergency declaration.',
    sourceReferences: ['NDMA Incident Command Standard'],
    executionHistory: [],
  },
  {
    id: 'AG-08',
    name: 'Community Liaison',
    specialty: 'Multilingual Public Warning & Accessible Guidance',
    status: 'Idle / Standby',
    currentTask: 'Standing by for verified advisory distribution.',
    latestOutput: 'No public safety advisories issued.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Draft community alerts upon authority authorization.',
    sourceReferences: ['District Public Information Guidelines'],
    executionHistory: [],
  },
  {
    id: 'AG-09',
    name: 'Fleet Manager',
    specialty: 'Surface Fleet, Staging Yards & Ground Logistics Coordination',
    status: 'Idle / Standby',
    currentTask: 'Tracking apparatus availability in sector.',
    latestOutput: 'Fleet inventory registered and awaiting dispatch orders.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Monitor response corridors when units deploy.',
    sourceReferences: ['Highway Telematics Grid'],
    executionHistory: [],
  },
  {
    id: 'AG-10',
    name: 'Mission Scribe',
    specialty: 'Cryptographic Audit, Reproducibility & Ledger Integrity',
    status: 'Active Monitoring',
    currentTask: 'Recording all system state transitions into SHA-256 cryptographic ledger.',
    latestOutput: 'Ledger integrity verified. 0 breaks detected.',
    uncertaintyNote: null,
    invalidatedAssumption: null,
    recommendedAction: 'Maintain cryptographic block chaining for all operations.',
    sourceReferences: ['Cryptographic Event Ledger'],
    executionHistory: [],
  },
];
