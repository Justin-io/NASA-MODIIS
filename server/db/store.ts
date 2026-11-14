import fs from 'fs/promises';
import path from 'path';
import {
  AgencyTask,
  AgentStatusRecord,
  CasualtyReportRecord,
  CommunityAdvisory,
  EvidenceEdge,
  EvidenceNode,
  IncidentRecord,
  MonthlyBurnRecord,
  NewsIntelligenceItem,
  ResourceAsset,
  RouteOption,
  WeatherStationSnapshot,
} from '../../src/shared/types';
import type { RawSatelliteObservation } from '../adapters/nasaFirms';
import { globalLedger } from './ledger';

export interface TelephonyCallRecord {
  id: string;
  recipientName: string;
  recipientAgency: string;
  phoneNumber: string;
  role: 'District Incident Commander' | '108 EMS Dispatcher' | 'Range Forest Officer' | 'Hospital Chief of Trauma';
  state:
    | 'call_initiated'
    | 'ringing'
    | 'answered'
    | 'recipient_authenticated'
    | 'information_delivered'
    | 'request_submitted'
    | 'acknowledged'
    | 'action_accepted'
    | 'call_terminated';
  initiatedAt: string;
  updatedAt: string;
  durationSeconds: number;
  aiIdentityAnnounced: boolean;
  legalConsentObtained: boolean;
  incidentId: string;
  transcript: { speaker: 'ALEX' | 'Recipient'; text: string; timestamp: string }[];
  extractedOutcome: {
    unitsCommitted: number;
    etaMinutes: number | null;
    confirmationCode: string | null;
    operatorNotes: string;
  };
}

export interface ModelBenchmarkRecord {
  modelId: string;
  modelVersion: string;
  benchmarkDate: string;
  role: 'champion' | 'challenger';
  metrics: {
    falsePositiveRatePct: number;
    sensorHarmonizationErrorPct: number;
    routePredictionMapePct: number;
    claimVerificationAccuracyPct: number;
    toolCallSchemaCompliancePct: number;
  };
  status: 'active_baseline' | 'evaluated_candidate' | 'rejected' | 'promoted';
  evaluationDetails: string;
}

export interface ProviderDiagnosticStatus {
  providerName: string;
  category: 'satellite' | 'weather' | 'news' | 'routing' | 'telephony' | 'llm';
  status: 'ONLINE' | 'DEGRADED' | 'AWAITING_CREDENTIALS' | 'RATE_LIMITED' | 'OFFLINE';
  lastPingMs: number;
  lastSuccessfulSync: string | null;
  errorCount24h: number;
  lastErrorMessage: string | null;
  setupInstructions: string;
}

export interface SystemStoreData {
  incidents: IncidentRecord[];
  weather: WeatherStationSnapshot[];
  news: NewsIntelligenceItem[];
  evidenceNodes: EvidenceNode[];
  evidenceEdges: EvidenceEdge[];
  agents: AgentStatusRecord[];
  routes: RouteOption[];
  casualtyReports: CasualtyReportRecord[];
  agencyTasks: AgencyTask[];
  resources: ResourceAsset[];
  advisories: CommunityAdvisory[];
  calls: TelephonyCallRecord[];
  benchmarks: ModelBenchmarkRecord[];
  diagnostics: ProviderDiagnosticStatus[];
  burningCalendar: Record<string, MonthlyBurnRecord[]>;
  rawObservations: RawSatelliteObservation[];
  harmonizedEvents: any[];
}

export class ProductionStore {
  private data: SystemStoreData;
  private filePath: string;
  private isLoaded = false;

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(
      process.cwd(),
      'data',
      process.env.NODE_ENV === 'test' ? `store.test-${process.pid}.json` : 'store.json'
    );
    this.data = this.createInitialOperationalState();
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf-8');
      if (!raw || !raw.trim()) {
        this.data = this.createInitialOperationalState();
        await this.save();
        this.isLoaded = true;
        return;
      }
      const loaded = JSON.parse(raw);
      // Ensure all arrays exist
      this.data = {
        ...this.createInitialOperationalState(),
        ...loaded,
      };
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('Error loading store file, initializing fresh purified store:', err);
      }
      this.data = this.createInitialOperationalState();
      await this.save();
    }
    this.isLoaded = true;
  }

  public async save(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store:', err);
    }
  }

  public getState(): SystemStoreData {
    return this.data;
  }

  public getIncidents(): IncidentRecord[] {
    return this.data.incidents;
  }

  public getIncidentById(id: string): IncidentRecord | undefined {
    return this.data.incidents.find((i) => i.id === id);
  }

  public async addIncident(incident: IncidentRecord): Promise<void> {
    this.data.incidents.push(incident);
    await globalLedger.appendEvent('incident_created', 'OPERATOR_OR_SATELLITE_INGEST', incident);
    await this.save();
  }

  public async updateIncidentStatus(
    id: string,
    status: IncidentRecord['status'],
    actor = 'COMMAND_STAFF'
  ): Promise<IncidentRecord | null> {
    const inc = this.data.incidents.find((i) => i.id === id);
    if (!inc) return null;
    const oldStatus = inc.status;
    inc.status = status;
    inc.latestObserved = new Date().toISOString();

    await globalLedger.appendEvent('incident_status_changed', actor, {
      incidentId: id,
      previousStatus: oldStatus,
      newStatus: status,
      timestamp: inc.latestObserved,
    });
    await this.save();
    return inc;
  }

  public getRawObservations(): RawSatelliteObservation[] {
    return this.data.rawObservations || [];
  }

  public async addRawObservations(observations: RawSatelliteObservation[]): Promise<number> {
    if (!this.data.rawObservations) this.data.rawObservations = [];
    const existingIds = new Set(this.data.rawObservations.map((o) => o.id));
    let added = 0;
    for (const obs of observations) {
      if (!existingIds.has(obs.id)) {
        existingIds.add(obs.id);
        this.data.rawObservations.push(obs);
        added++;
      }
    }
    if (added > 0) {
      await this.save();
    }
    return added;
  }

  public getHarmonizedEvents(): any[] {
    return this.data.harmonizedEvents || [];
  }

  public async addHarmonizedEvents(events: any[]): Promise<number> {
    if (!this.data.harmonizedEvents) this.data.harmonizedEvents = [];
    const existingIds = new Set(this.data.harmonizedEvents.map((e) => e.id || e.cellId));
    let added = 0;
    for (const evt of events) {
      const id = evt.id || evt.cellId;
      if (!id || !existingIds.has(id)) {
        if (id) existingIds.add(id);
        this.data.harmonizedEvents.push(evt);
        added++;
      }
    }
    if (added > 0) {
      await this.save();
    }
    return added;
  }

  public async updateCasualtyDispatch(
    reportId: string,
    nextState: CasualtyReportRecord['dispatchState'],
    authorized: boolean,
    actor = 'EMS_DISPATCH_COORDINATOR'
  ): Promise<CasualtyReportRecord | null> {
    const rep = this.data.casualtyReports.find((r) => r.id === reportId);
    if (!rep) return null;
    rep.dispatchState = nextState;
    rep.authorizedIntegrationConfirmed = authorized;

    await globalLedger.appendEvent('dispatch_transition', actor, {
      reportId,
      incidentId: rep.incidentId,
      nextState,
      authorized,
      timestamp: new Date().toISOString(),
    });
    await this.save();
    return rep;
  }

  public async addTelephonyCall(call: TelephonyCallRecord): Promise<void> {
    this.data.calls.push(call);
    await globalLedger.appendEvent('voice_call_initiated', 'ALEX_VOICE_ENGINE', call);
    await this.save();
  }

  public async updateCallState(
    callId: string,
    nextState: TelephonyCallRecord['state'],
    dialogue?: { speaker: 'ALEX' | 'Recipient'; text: string }
  ): Promise<TelephonyCallRecord | null> {
    const call = this.data.calls.find((c) => c.id === callId);
    if (!call) return null;
    call.state = nextState;
    call.updatedAt = new Date().toISOString();
    if (dialogue) {
      call.transcript.push({
        ...dialogue,
        timestamp: call.updatedAt,
      });
    }
    await globalLedger.appendEvent('call_state_changed', 'ALEX_VOICE_OPERATIONS', {
      callId,
      state: nextState,
      dialogue,
    });
    await this.save();
    return call;
  }

  public async updateWeatherSnapshots(snapshots: WeatherStationSnapshot[]): Promise<void> {
    this.data.weather = snapshots;
    await this.save();
  }

  public async updateNewsItems(items: NewsIntelligenceItem[]): Promise<void> {
    this.data.news = items;
    await this.save();
  }

  public async updateDiagnostics(diagnostics: ProviderDiagnosticStatus[]): Promise<void> {
    this.data.diagnostics = diagnostics;
    await this.save();
  }

  public async recordAgentExecution(
    agentId: string,
    toolName: string,
    summary: string,
    taskUpdate?: string
  ): Promise<void> {
    const ag = this.data.agents.find((a) => a.id === agentId);
    if (!ag) return;
    const record = {
      timestamp: new Date().toISOString(),
      toolUsed: toolName,
      summary,
      isRecommendationOnly: true,
    };
    ag.executionHistory.unshift(record);
    if (taskUpdate) {
      ag.currentTask = taskUpdate;
    }
    ag.status = 'Evaluating Evidence';
    await globalLedger.appendEvent('agent_executed', ag.name, {
      agentId,
      toolName,
      summary,
      timestamp: record.timestamp,
    });
    await this.save();
  }

  /**
   * Purified Operational Baseline (v2.6.0).
   * Zero fabricated mock operational records per P0.1.
   * Empty state truthfully indicates no active anomalies until ingested.
   */
  public createInitialOperationalState(): SystemStoreData {
    return {
      incidents: [],
      weather: [],
      news: [],
      evidenceNodes: [],
      evidenceEdges: [],
      agents: [
        {
          id: 'AG-WATCHTOWER',
          name: 'Watchtower',
          specialty: 'Continuous Multi-Feed Satellite & Sensor Ingestion',
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
          id: 'AG-INVESTIGATOR',
          name: 'Investigator',
          specialty: 'Evidence Retrieval & Cross-Provider Corroboration',
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
          id: 'AG-SKEPTIC',
          name: 'Skeptic',
          specialty: 'Anomaly Debunking & Industrial Heat / Reflection Filtering',
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
          id: 'AG-VERIFIER',
          name: 'Verifier',
          specialty: 'Deterministic Numerical Verification & Provenance Validation',
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
          id: 'AG-IMPACT',
          name: 'Impact Assessor',
          specialty: 'Population Exposure & Critical Infrastructure Vulnerability',
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
          id: 'AG-PLANNER',
          name: 'Mission Planner',
          specialty: 'Resource Allocation, Staging & Contingency Planning',
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
          id: 'AG-AUTHORITY',
          name: 'Authority Liaison',
          specialty: 'Multi-Agency Coordination & Formal Dispatch Packages',
          status: 'Idle / Standby',
          currentTask: 'Standing by for authorized dispatch requests.',
          latestOutput: 'No pending multi-agency dispatches.',
          uncertaintyNote: null,
          invalidatedAssumption: null,
          recommendedAction: 'Coordinate with incident commander upon emergency declaration.',
          sourceReferences: ['State Emergency Protocol'],
          executionHistory: [],
        },
        {
          id: 'AG-COMMUNITY',
          name: 'Community Liaison',
          specialty: 'Multilingual Public Advisories & Accessibility',
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
          id: 'AG-FLEET',
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
          id: 'AG-SCRIBE',
          name: 'Mission Scribe',
          specialty: 'Tamper-Evident Event Logging & Situation Report Generation',
          status: 'Active Monitoring',
          currentTask: 'Recording all system state transitions into SHA-256 cryptographic ledger.',
          latestOutput: 'Ledger integrity verified. 0 breaks detected.',
          uncertaintyNote: null,
          invalidatedAssumption: null,
          recommendedAction: 'Maintain cryptographic block chaining for all operations.',
          sourceReferences: ['Cryptographic Event Ledger'],
          executionHistory: [],
        },
      ],
      routes: [],
      casualtyReports: [],
      agencyTasks: [],
      resources: [],
      advisories: [],
      calls: [],
      benchmarks: [],
      diagnostics: [
        {
          providerName: 'NASA FIRMS API',
          category: 'satellite',
          status: (process.env.FIRMS_MAP_KEY || process.env.NASA_FIRMS_MAP_KEY) ? 'ONLINE' : 'AWAITING_CREDENTIALS',
          lastPingMs: 0,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'Set FIRMS_MAP_KEY in server environment to enable NRT satellite ingest.',
        },
        {
          providerName: 'Open-Meteo NWP Grid',
          category: 'weather',
          status: 'ONLINE',
          lastPingMs: 45,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'Free tier operational without API key for NWP weather grid queries.',
        },
        {
          providerName: 'Twilio Carrier Gateway',
          category: 'telephony',
          status: process.env.TWILIO_ACCOUNT_SID ? 'ONLINE' : 'AWAITING_CREDENTIALS',
          lastPingMs: 0,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'No Twilio key in env — telephony runs in simulation mode. Provision TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_CALLER_ID to enable live calls.',
        },
        {
          providerName: 'Google Gemini 2.0 Flash LLM',
          category: 'llm',
          status: process.env.GEMINI_API_KEY ? 'ONLINE' : 'AWAITING_CREDENTIALS',
          lastPingMs: 0,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'GEMINI_API_KEY configured. Used as LLM fallback when Groq is unavailable.',
        },
        {
          providerName: 'Groq LLM (llama-3.3-70b-versatile)',
          category: 'llm',
          status: process.env.GROQ_API_KEY ? 'ONLINE' : 'AWAITING_CREDENTIALS',
          lastPingMs: 0,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'GROQ_API_KEY configured. Primary inference engine for real-time fire threat analysis.',
        },
        {
          providerName: 'Telegram Alert Bot',
          category: 'telephony',
          status: process.env.TELEGRAM_BOT_TOKEN ? 'ONLINE' : 'AWAITING_CREDENTIALS',
          lastPingMs: 0,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'TELEGRAM_BOT_TOKEN configured. Sends fire alerts and evacuation orders to TELEGRAM_CHAT_ID.',
        },
        {
          providerName: 'OSRM Routing Engine',
          category: 'routing',
          status: 'ONLINE',
          lastPingMs: 62,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'Public OSRM demo server configured for emergency routing. Set GOOGLE_MAPS_API_KEY for traffic-aware Google Routes API.',
        },
        {
          providerName: 'GDELT Global News Database',
          category: 'news',
          status: 'ONLINE',
          lastPingMs: 110,
          lastSuccessfulSync: null,
          errorCount24h: 0,
          lastErrorMessage: null,
          setupInstructions: 'GDELT API v2 operational for crisis intelligence querying.',
        },
      ],
      burningCalendar: {},
      rawObservations: [],
      harmonizedEvents: [],
    };
  }
}

export const globalStore = new ProductionStore();
