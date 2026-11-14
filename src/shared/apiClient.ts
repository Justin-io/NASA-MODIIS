import {
  AgentStatusRecord,
  CasualtyReportRecord,
  IncidentRecord,
  NewsIntelligenceItem,
  ResourceAsset,
  RouteOption,
  WeatherStationSnapshot,
} from './types';
import type { RawSatelliteObservation } from '../../server/adapters/nasaFirms';
import type { NasaEonetWildfire } from '../../server/adapters/nasaEonet';

const API_BASE = '/api';

function protectedRequestHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('alex_access_token') : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function readApiError(response: Response): Promise<Error> {
  let message = `HTTP error ${response.status}`;
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') message = body.error;
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // Keep the status based message when the server returned a non-JSON body.
  }
  return new Error(message);
}

export interface SystemDiagnosticStatus {
  providerName: string;
  category: 'satellite' | 'weather' | 'news' | 'routing' | 'telephony' | 'llm';
  status: 'ONLINE' | 'DEGRADED' | 'AWAITING_CREDENTIALS' | 'RATE_LIMITED' | 'OFFLINE';
  lastPingMs: number;
  lastSuccessfulSync: string | null;
  errorCount24h: number;
  lastErrorMessage: string | null;
  setupInstructions: string;
}

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

export interface LedgerEventRecord {
  id: string;
  sequence: number;
  timestamp: string;
  eventType: string;
  actor: string;
  payload: any;
  prevHash: string;
  hash: string;
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

export class AlexApiClient {
  public async getLiveFirmsObservations(regionId: string): Promise<{ source: string; isLive: boolean; observations: RawSatelliteObservation[]; fetchedAt: string; unavailableProducts: string[] }> {
    const res = await fetch(`${API_BASE}/firms/live?regionId=${encodeURIComponent(regionId)}`);
    if (!res.ok) throw await readApiError(res);
    return res.json();
  }
  public async createLiveVoiceToken(voiceName: string): Promise<{ token: string; model: string; expiresAt: string }> {
    const res = await fetch(`${API_BASE}/voice/live/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceName }),
    });
    if (!res.ok) throw await readApiError(res);
    return res.json();
  }
  public async getRawObservations(): Promise<RawSatelliteObservation[]> {
    const res = await fetch(`${API_BASE}/observations`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getEonetWildfires(): Promise<{ source: string; fetchedAt: string; events: NasaEonetWildfire[] }> {
    const res = await fetch(`${API_BASE}/eonet/wildfires`);
    if (!res.ok) throw await readApiError(res);
    return res.json();
  }
  public async getFullState(): Promise<any> {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getIncidents(): Promise<IncidentRecord[]> {
    const res = await fetch(`${API_BASE}/incidents`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getResources(): Promise<ResourceAsset[]> {
    const res = await fetch(`${API_BASE}/resources`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async updateIncidentStatus(
    id: string,
    status: IncidentRecord['status'],
    actor = 'COMMAND_STAFF'
  ): Promise<IncidentRecord> {
    const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actor }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async fetchLiveWeather(lat: number, lng: number): Promise<WeatherStationSnapshot[]> {
    const res = await fetch(`${API_BASE}/weather?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async fetchLiveNews(incidentId?: string): Promise<NewsIntelligenceItem[]> {
    const url = incidentId ? `${API_BASE}/news?incidentId=${incidentId}` : `${API_BASE}/news`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async executeAgent(params: {
    agentId: string;
    incidentId: string;
    taskOverride?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async initiateTelephonyCall(params: {
    recipientName: string;
    recipientAgency: string;
    phoneNumber: string;
    role: TelephonyCallRecord['role'];
    incidentId: string;
    initialMessage?: string;
  }): Promise<TelephonyCallRecord> {
    const res = await fetch(`${API_BASE}/calls/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async respondToCall(
    callId: string,
    response: {
      actionAccepted: boolean;
      unitsCommitted: number;
      etaMinutes: number | null;
      notes: string;
      confirmationCode: string;
    }
  ): Promise<TelephonyCallRecord> {
    const res = await fetch(`${API_BASE}/calls/${callId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async calculateEmergencyRoute(params: {
    origin: [number, number];
    destination: [number, number];
    originName: string;
    destinationName: string;
    vehicleCategory: any;
  }): Promise<RouteOption> {
    const res = await fetch(`${API_BASE}/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw await readApiError(res);
    return res.json();
  }

  public async getRouteProviderStatus(): Promise<{ provider: string; configured: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/routes/status`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async updateCasualtyDispatch(
    reportId: string,
    nextState: CasualtyReportRecord['dispatchState'],
    authorized: boolean,
    actor = 'EMS_DISPATCH_COORDINATOR'
  ): Promise<CasualtyReportRecord> {
    const res = await fetch(`${API_BASE}/casualty/${reportId}/dispatch`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextState, authorized, actor }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getLedger(limit = 100): Promise<{ events: LedgerEventRecord[]; integrity: any }> {
    const res = await fetch(`${API_BASE}/ledger?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async backtrackDecision(decisionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/ledger/backtrack/${decisionId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getModelBenchmarks(): Promise<ModelBenchmarkRecord[]> {
    const res = await fetch(`${API_BASE}/learning/benchmarks`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async evaluateChallengerModel(params: {
    challengerId: string;
    proposedConfig: Record<string, any>;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/learning/evaluate`, {
      method: 'POST',
      headers: protectedRequestHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async promoteModel(challengerId: string, authorizedBy: string): Promise<any> {
    const res = await fetch(`${API_BASE}/learning/promote`, {
      method: 'POST',
      headers: protectedRequestHeaders(),
      body: JSON.stringify({ challengerId, authorizedBy }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getDiagnostics(): Promise<SystemDiagnosticStatus[]> {
    const res = await fetch(`${API_BASE}/diagnostics`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public getExportUrl(format: 'geojson' | 'csv' | 'kml'): string {
    return `${API_BASE}/export/${format}`;
  }

  // 12. ALEX ORBITAL Client
  public async getSatellites(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/orbital/satellites`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getSatellite(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/orbital/satellites/${id}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getViewingGeometry(satelliteId: string, scanAngleDeg: number): Promise<any> {
    const res = await fetch(`${API_BASE}/orbital/geometry?satelliteId=${satelliteId}&scanAngleDeg=${scanAngleDeg}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getTerraDrift(year = 2026): Promise<any> {
    const res = await fetch(`${API_BASE}/orbital/terra-drift?year=${year}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getObservationOpportunities(regionId = 'REG-NILGIRI'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/orbital/opportunities?regionId=${regionId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 13. ALEX FIRE Calendar Client
  public async getBurningCalendar(regionId = 'REG-NILGIRI'): Promise<any> {
    const res = await fetch(`${API_BASE}/fire/calendar?regionId=${regionId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public getBurningCalendarCsvUrl(regionId = 'REG-NILGIRI'): string {
    return `${API_BASE}/fire/calendar/csv?regionId=${regionId}`;
  }

  public getBurningCalendarGeoJsonUrl(regionId = 'REG-NILGIRI'): string {
    return `${API_BASE}/fire/calendar/geojson?regionId=${regionId}`;
  }

  // 14. ALEX Catalogue Client
  public async getCatalogueSources(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/catalogue`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 15. Community Client
  public async getFieldReports(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/community/reports`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async submitFieldReport(report: any): Promise<any> {
    const res = await fetch(`${API_BASE}/community/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getSafetyBulletins(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/community/bulletins`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async publishSafetyBulletin(bulletin: any): Promise<any> {
    const res = await fetch(`${API_BASE}/community/bulletins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bulletin),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 16. Access Control Client
  public async getUserRoles(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/access/roles`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 17. NIFC Wildland Fire Perimeters & Spread Client
  public async getFirePerimeters(live = false, regionId = 'REG-NILGIRI'): Promise<any> {
    const url = live ? `${API_BASE}/perimeters?live=true` : `${API_BASE}/perimeters?regionId=${regionId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getFirePerimeter(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/perimeters/${id}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getPerimeterSpread(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/perimeters/${id}/spread`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getPerimeterProgression(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/perimeters/${id}/progression`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 18. Weather & Fuels Client
  public async getFuelStations(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/fuels/stations`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getFuelObservations(regionId = 'REG-NILGIRI'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/fuels/observations?regionId=${regionId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getLiveFuelEstimate(lat: number, lng: number): Promise<any> {
    const res = await fetch(`${API_BASE}/fuels/live-estimate?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 19. Exposure & Vulnerability Client
  public async getExposureDemographics(regionId = 'REG-NILGIRI'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/exposure/demographics?regionId=${regionId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getExposureBuildings(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/exposure/buildings?regionId=${regionId}` : `${API_BASE}/exposure/buildings`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getExposureInfrastructure(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/exposure/infrastructure?regionId=${regionId}` : `${API_BASE}/exposure/infrastructure`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getExposureEvacuationZones(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/exposure/evacuation-zones?regionId=${regionId}` : `${API_BASE}/exposure/evacuation-zones`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getExposureSummary(regionId = 'REG-NILGIRI'): Promise<any> {
    const res = await fetch(`${API_BASE}/exposure/summary?regionId=${regionId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 20. Road Hazards & Fleet Client
  public async getRoadHazards(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/hazards/roads?regionId=${regionId}` : `${API_BASE}/hazards/roads`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getBridgeRestrictions(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/hazards/bridges?regionId=${regionId}` : `${API_BASE}/hazards/bridges`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async evaluateCorridorClearance(params: {
    hazardIds: string[];
    bridgeIds: string[];
    vehicleCategory: any;
    grossWeightTons: number;
    heightMeters: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/hazards/evaluate-corridor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getFleetTelemetries(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/fleet/apparatus?regionId=${regionId}` : `${API_BASE}/fleet/apparatus`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getStagingFacilities(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/fleet/staging?regionId=${regionId}` : `${API_BASE}/fleet/staging`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 21. Ground Verification & CAD Client
  public async getCadDispatches(regionId?: string): Promise<any[]> {
    const url = regionId ? `${API_BASE}/cad/dispatches?regionId=${regionId}` : `${API_BASE}/cad/dispatches`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getRangerReports(incidentId?: string): Promise<any[]> {
    const url = incidentId ? `${API_BASE}/ranger/reports?incidentId=${incidentId}` : `${API_BASE}/ranger/reports`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getCorroborationMatrix(incidentId?: string): Promise<any[]> {
    const url = incidentId ? `${API_BASE}/corroboration/matrix?incidentId=${incidentId}` : `${API_BASE}/corroboration/matrix`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getGroundVerificationPackage(incidentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/ground-verification/${incidentId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 22. NASA FIRMS Climatology Client
  public async getHistoricalMedians(regionId = 'REG-NILGIRI'): Promise<any> {
    const res = await fetch(`${API_BASE}/firms/archive/medians?regionId=${regionId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async getHistoricalAnomaly(regionId = 'REG-NILGIRI', month = 3, hotspots = 120): Promise<any> {
    const res = await fetch(`${API_BASE}/firms/archive/anomaly?regionId=${regionId}&month=${month}&hotspots=${hotspots}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async loadHistoricalArchive(): Promise<any> {
    const res = await fetch(`${API_BASE}/firms/archive/load-baseline`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  public async unloadHistoricalArchive(): Promise<any> {
    const res = await fetch(`${API_BASE}/firms/archive/unload-baseline`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  // 23. Gemini 3.8 Live Voice Command API
  public async executeLiveVoiceTurn(
    input: string,
    voiceName: string = 'Aoede',
    incidentId?: string
  ): Promise<{
    transcript: string;
    audioDataUri: string;
    durationSeconds: number;
    sampleRate: number;
    model: string;
    voiceName: string;
    toolsExecuted: string[];
    timestamp: string;
  }> {
    const res = await fetch(`${API_BASE}/voice/live/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, voiceName, incidentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return res.json();
  }

  public async getLiveVoiceStatus(): Promise<{
    configured: boolean;
    model: string;
    activeEndpoint: string;
    sampleRateHz: number;
    supportedVoices: string[];
    toolCapabilities: string[];
  }> {
    const res = await fetch(`${API_BASE}/voice/live/status`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }
}

export const apiClient = new AlexApiClient();
