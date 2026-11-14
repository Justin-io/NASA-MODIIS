import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { decomposeObservingEffort } from '../src/shared/observationDecomposition';
import { globalLedger } from './db/ledger';
import { globalStore } from './db/store';
import { nasaFirmsAdapter } from './adapters/nasaFirms';
import { nasaEonetAdapter } from './adapters/nasaEonet';
import { weatherAdapter } from './adapters/weatherAdapter';
import { newsIntelligenceAdapter } from './adapters/newsAdapter';
import { agentConductor } from './services/agentConductor';
import { telephonyService } from './services/telephonyService';
import { routingService } from './services/routingService';
import { learningService } from './services/learningService';
import { diagnosticsService } from './services/diagnosticsService';
import { orbitalService } from './services/orbitalService';
import { fireCalendarService } from './services/fireCalendarService';
import { dataCatalogueService } from './services/catalogService';
import { communityService } from './services/communityService';
import { accessControlService } from './services/accessControlService';
import {
  authenticateToken,
  requireRole,
  securityHeadersMiddleware,
  traceIdMiddleware,
  normalizeToCanonicalRole,
} from './middleware/auth';
import {
  globalRateLimiter,
  authRateLimiter,
  sensitiveApiLimiter,
} from './middleware/rateLimiter';
import { sanitizedAuditLogger } from './middleware/sanitizedLogger';
import {
  validateAuthTokenInput,
  validateRouteInput,
  validateFieldReportInput,
  validateLiveVoiceInput,
  validateCorridorEvaluationInput,
  validateExportRequest,
} from './middleware/validation';
import { generateSignedToken } from './auth/tokens';
import { harmonizeObservations } from '../src/shared/intelligenceEngine';
import { postgresService } from './db/postgresClient';
import { nifcPerimetersAdapter } from './adapters/nifcPerimeters';
import { copernicusAdapter } from './adapters/copernicusAdapter';
import { liveFuelsAdapter } from './adapters/liveFuelsAdapter';
import { exposureService } from './services/exposureService';
import { hazardAndFleetService } from './services/hazardAndFleetService';
import { groundVerificationService } from './services/groundVerificationService';
import { aiIntelligenceService } from './services/aiIntelligenceService';
import { telegramAlertService } from './services/telegramAlertService';
import { openskyAdapter } from './adapters/openskyAdapter';
import { notionAdapter } from './adapters/notionAdapter';
import { githubAdapter } from './adapters/githubAdapter';
import { geminiLiveService } from './services/geminiLiveService';
import {
  getPerimetersForRegion,
  getSpreadForecastForPerimeter,
  getPerimeterProgression,
  FIRE_PERIMETERS,
} from '../src/shared/firePerimeterData';
import {
  HISTORICAL_REGIONAL_MEDIANS,
  HYPER_REALISTIC_HISTORICAL_ARCHIVE,
  evaluateSeasonalAnomaly,
  loadMockHistoricalArchive,
  unloadMockHistoricalArchive,
} from '../src/shared/fireObservationsData';
import { NILGIRIS_EMPIRICAL_MONTHLY_ARCHIVE } from '../src/shared/empiricalArchiveData';
import {
  INITIAL_RESOURCES,
  INITIAL_CASUALTY_REPORTS,
  INITIAL_AGENCY_TASKS,
  EMERGENCY_ROUTES,
  INITIAL_ADVISORIES,
} from '../src/shared/dataAdapter';

const app = express();
const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3001;

// Production Security Hardening
app.disable('x-powered-by');
app.use(traceIdMiddleware);
app.use(sanitizedAuditLogger);
app.use(securityHeadersMiddleware);
app.use(globalRateLimiter.middleware());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(authenticateToken);

// Secure CORS & Cross-Origin Mutating Request Guard (CSRF Mitigation)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isLocalhost = Boolean(origin && /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin));
  const isConfiguredAppUrl = Boolean(process.env.APP_URL && origin === process.env.APP_URL);
  const isConfiguredPublicUrl = Boolean(process.env.ALEX_PUBLIC_URL && origin === process.env.ALEX_PUBLIC_URL);
  const isAllowedOrigin = !origin || isLocalhost || isConfiguredAppUrl || isConfiguredPublicUrl;

  // Block cross-origin mutating operations from unauthorized external origins
  const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (origin && !isAllowedOrigin && isMutatingMethod) {
    res.status(403).json({
      error: 'FORBIDDEN: Cross-origin mutating requests from unverified origins are rejected.',
      code: 'CSRF_ORIGIN_REJECTED',
      traceId: req.traceId,
    });
    return;
  }

  if (isAllowedOrigin && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Trace-Id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// SSE Client Connections
const sseClients: Response[] = [];

function broadcastSse(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// 1. Health Endpoint
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  const ledgerIntegrity = globalLedger.verifyIntegrity();
  res.json({
    status: 'ONLINE',
    service: 'ALEX Environmental Intelligence Backend',
    version: '2.7.0',
    ledgerIntegrity,
    timestamp: new Date().toISOString(),
  });
});

// 2. Full State
app.get('/api/state', (req: Request, res: Response) => {
  const state = globalStore.getState();
  const storedIncidents = globalStore.getIncidents();
  const incidents = storedIncidents && storedIncidents.length > 0
    ? storedIncidents
    : nasaEonetAdapter.getGroundedIncidents();
  res.json({
    ...state,
    incidents,
    resources: state.resources && state.resources.length > 0 ? state.resources : INITIAL_RESOURCES,
    casualtyReports: state.casualtyReports && state.casualtyReports.length > 0 ? state.casualtyReports : INITIAL_CASUALTY_REPORTS,
    agencyTasks: state.agencyTasks && state.agencyTasks.length > 0 ? state.agencyTasks : INITIAL_AGENCY_TASKS,
    routes: state.routes && state.routes.length > 0 ? state.routes : EMERGENCY_ROUTES,
    advisories: state.advisories && state.advisories.length > 0 ? state.advisories : INITIAL_ADVISORIES,
  });
});

// 2b. Resources
app.get('/api/resources', (_req: Request, res: Response) => {
  const state = globalStore.getState();
  const resources = state.resources && state.resources.length > 0 ? state.resources : INITIAL_RESOURCES;
  res.json(resources);
});

// 3. Incidents
app.get('/api/incidents', (req: Request, res: Response) => {
  const stored = globalStore.getIncidents();
  if (stored && stored.length > 0) {
    res.json(stored);
    return;
  }
  const grounded = nasaEonetAdapter.getGroundedIncidents();
  res.json(grounded);
});

app.get('/api/incidents/:id', (req: Request, res: Response) => {
  const inc =
    globalStore.getIncidentById(req.params.id) ||
    nasaEonetAdapter.getGroundedIncidents().find((i) => i.id === req.params.id);
  if (!inc) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json(inc);
});

app.post('/api/incidents', requireRole(['commander']), async (req: Request, res: Response) => {
  try {
    const inc = req.body;
    await globalStore.addIncident(inc);
    broadcastSse('incident_added', inc);
    res.status(201).json(inc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/incidents/:id/status', requireRole(['commander']), async (req: Request, res: Response) => {
  try {
    const { status, actor } = req.body;
    const updated = await globalStore.updateIncidentStatus(req.params.id, status, actor);
    if (!updated) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    broadcastSse('incident_updated', updated);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Live Weather Integration
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    if (!req.query.lat || !req.query.lng) {
      res.status(400).json({ error: 'Query parameters lat and lng are required for weather retrieval.' });
      return;
    }
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'Query parameters lat and lng must be valid numbers.' });
      return;
    }
    const name = (req.query.name as string) || `Regional NWP Station (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
    const id = (req.query.stationId as string) || `AWS-${lat.toFixed(2)}-${lng.toFixed(2)}`;

    const liveWeather = await weatherAdapter.fetchRealWeather(lat, lng, name, id);
    const existing = globalStore.getState().weather;
    const updated = [liveWeather, ...existing.filter((w) => w.stationId !== id)];
    await globalStore.updateWeatherSnapshots(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/weather/all', (_req: Request, res: Response) => {
  res.json(weatherAdapter.getAllMonitoredStations());
});

// 5. Live News & Claims Integration
app.get('/api/news', async (req: Request, res: Response) => {
  try {
    const incidentId = req.query.incidentId as string;
    const liveNews = await newsIntelligenceAdapter.fetchLiveNews(incidentId);
    await globalStore.updateNewsItems(liveNews);
    res.json(liveNews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Agent Execution (Conductor)
app.post('/api/agents/execute', sensitiveApiLimiter.middleware(), requireRole(['commander', 'field', 'operator']), async (req: Request, res: Response) => {
  try {
    const result = await agentConductor.executeAgent(req.body);
    broadcastSse('agent_executed', result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Voice & Telephony Operations
app.get('/api/telephony/status', (req: Request, res: Response) => {
  res.json(telephonyService.getProviderStatus());
});

// Twilio fetches this after an outbound call connects.  Keep the message short,
// identify the automated system, and direct the recipient to the authenticated
// command channel; this endpoint never fabricates acknowledgement or consent.
app.get('/api/telephony/twiml', (req: Request, res: Response) => {
  const call = globalStore.getState().calls.find((item) => item.id === req.query.callId);
  const summary = call?.extractedOutcome.operatorNotes || 'An environmental intelligence briefing is available in the command portal.';
  const escaped = summary.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] || char));
  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">This is ALEX, an automated environmental intelligence system. ${escaped} Please use the authenticated command channel to acknowledge or request action. This call does not dispatch emergency services automatically.</Say></Response>`);
});

app.post('/api/calls/initiate', sensitiveApiLimiter.middleware(), requireRole(['commander']), async (req: Request, res: Response) => {
  try {
    const call = await telephonyService.initiateCall(req.body);
    broadcastSse('call_initiated', call);
    res.status(201).json(call);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calls/:id/respond', sensitiveApiLimiter.middleware(), requireRole(['commander', 'field', 'operator']), async (req: Request, res: Response) => {
  try {
    const call = await telephonyService.submitRecipientResponse(req.params.id, req.body);
    if (!call) {
      res.status(404).json({ error: 'Call record not found' });
      return;
    }
    broadcastSse('call_updated', call);
    res.json(call);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Emergency Routing
app.post('/api/routes/calculate', sensitiveApiLimiter.middleware(), validateRouteInput, async (req: Request, res: Response) => {
  try {
    const { origin, destination, originName, destinationName, vehicleCategory } = req.body || {};
    const validPair = (pair: unknown) => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite);
    if (!validPair(origin) || !validPair(destination)) {
      res.status(400).json({ error: 'Origin and destination must each be [latitude, longitude] numeric pairs.' });
      return;
    }
    if (typeof originName !== 'string' || typeof destinationName !== 'string' || typeof vehicleCategory !== 'string') {
      res.status(400).json({ error: 'originName, destinationName, and vehicleCategory are required.' });
      return;
    }
    const route = await routingService.calculateRoute(req.body);
    res.json(route);
  } catch (err: any) {
    const status = /invalid .*coordinates|no valid routes/i.test(err.message) ? 400 : 503;
    res.status(status).json({ error: err.message || 'Route calculation unavailable.' });
  }
});

app.get('/api/routes/status', (_req: Request, res: Response) => {
  res.json(routingService.getProviderStatus());
});

// 9. Casualty Dispatch Workflow
app.patch('/api/casualty/:id/dispatch', requireRole(['commander', 'field', 'operator']), async (req: Request, res: Response) => {
  try {
    const { nextState, authorized, actor } = req.body;
    const updated = await globalStore.updateCasualtyDispatch(req.params.id, nextState, authorized, actor);
    if (!updated) {
      res.status(404).json({ error: 'Casualty report not found' });
      return;
    }
    broadcastSse('casualty_updated', updated);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Cryptographic Ledger & Backtracking
app.get('/api/ledger', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  res.json({
    events: globalLedger.getEvents(limit),
    integrity: globalLedger.verifyIntegrity(),
  });
});

app.get('/api/ledger/verify', (req: Request, res: Response) => {
  res.json(globalLedger.verifyIntegrity());
});

app.get('/api/ledger/backtrack/:decisionId', (req: Request, res: Response) => {
  const result = globalLedger.backtrackDecision(req.params.decisionId);
  res.json(result);
});

// 11. Self-Learning & Benchmarks
app.get('/api/learning/benchmarks', (req: Request, res: Response) => {
  res.json(globalStore.getState().benchmarks);
});

app.post('/api/learning/evaluate', requireRole(['commander', 'system_administrator']), async (req: Request, res: Response) => {
  try {
    const { challengerId, proposedConfig } = req.body;
    const result = await learningService.evaluateChallengerModel(challengerId, proposedConfig);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/learning/promote', requireRole(['commander']), async (req: Request, res: Response) => {
  try {
    const { challengerId, authorizedBy } = req.body;
    const result = await learningService.promoteModelCandidate(challengerId, authorizedBy);
    if (!result) {
      res.status(404).json({ error: 'Candidate model not found' });
      return;
    }
    broadcastSse('model_promoted', result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. System Diagnostics
app.get('/api/diagnostics', async (req: Request, res: Response) => {
  try {
    const diags = await diagnosticsService.runFullDiagnostics();
    res.json(diags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Server-Sent Events (SSE) Live Feed
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// 14. Real File Exports (Zero-Mock Generation)
app.get('/api/export/:format', validateExportRequest, (req: Request, res: Response) => {
  const { format } = req.params;
  const store = globalStore.getState();
  const primaryIncident = store.incidents[0];

  if (!primaryIncident) {
    res.status(404).json({
      error: 'Export unavailable: No active incident records are currently loaded.',
      code: 'NO_ACTIVE_INCIDENT',
    });
    return;
  }

  if (format === 'geojson') {
    const geojson = {
      type: 'FeatureCollection',
      metadata: {
        system: 'ALEX — Autonomous Live Environmental eXpert',
        exportedAt: new Date().toISOString(),
        incidentId: primaryIncident.id,
      },
      features: [
        {
          type: 'Feature',
          properties: {
            title: primaryIncident.title,
            severity: primaryIncident.severity,
            status: primaryIncident.status,
            harmonizedFrpMw: primaryIncident.harmonizedFrpMw,
            areaHa: primaryIncident.estimatedAreaHa,
            populationExposed: primaryIncident.estimatedPopulationExposed,
          },
          geometry: {
            type: 'Point',
            coordinates: [primaryIncident.coordinates.lng, primaryIncident.coordinates.lat],
          },
        },
        ...primaryIncident.observations.map((obs) => ({
          type: 'Feature',
          properties: {
            observationId: obs.id,
            sensor: obs.sensor,
            frpMw: obs.frpMw,
            brightnessK: obs.brightnessKelvin,
            confidencePct: obs.confidencePct,
            timestamp: obs.timestamp,
          },
          geometry: {
            type: 'Point',
            coordinates: [obs.lng, obs.lat],
          },
        })),
      ],
    };

    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader('Content-Disposition', `attachment; filename="ALEX_${primaryIncident.id}.geojson"`);
    res.send(JSON.stringify(geojson, null, 2));
    return;
  }

  if (format === 'csv') {
    const headers = 'observation_id,sensor,timestamp,latitude,longitude,brightness_k,frp_mw,confidence_pct\n';
    const rows = primaryIncident.observations
      .map(
        (o) =>
          `"${o.id}","${o.sensor}","${o.timestamp}",${o.lat},${o.lng},${o.brightnessKelvin},${o.frpMw},${o.confidencePct}`
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ALEX_MODIS_VIIRS_${primaryIncident.id}.csv"`);
    res.send(headers + rows);
    return;
  }

  if (format === 'kml') {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${primaryIncident.title}</name>
    <description>ALEX Harmonized NASA MODIS/VIIRS Hotspot Intelligence</description>
    <Placemark>
      <name>${primaryIncident.title}</name>
      <description>Harmonized FRP: ${primaryIncident.harmonizedFrpMw} MW</description>
      <Point>
        <coordinates>${primaryIncident.coordinates.lng},${primaryIncident.coordinates.lat},0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', `attachment; filename="ALEX_${primaryIncident.id}.kml"`);
    res.send(kml);
    return;
  }

  res.status(400).json({ error: `Unsupported export format: ${format}. Supported: geojson, csv, kml` });
});

// 12. ALEX ORBITAL Subsystem Endpoints
app.get('/api/orbital/satellites', (req: Request, res: Response) => {
  res.json(orbitalService.getAllSatellites());
});

app.get('/api/orbital/tles', (_req: Request, res: Response) => {
  res.json({
    source: 'CelesTrak NORAD Ephemeris Service',
    fetchedAt: new Date().toISOString(),
    satellites: orbitalService.getLiveTleCatalog(),
  });
});

app.post('/api/orbital/tles/sync', requireRole(['commander', 'incident_commander', 'system_administrator']), async (_req: Request, res: Response) => {
  const success = await orbitalService.syncLiveTlesFromCelesTrak();
  res.json({
    success,
    satellites: orbitalService.getLiveTleCatalog(),
  });
});

app.get('/api/orbital/satellites/:id', (req: Request, res: Response) => {
  const sat = orbitalService.getSatelliteById(req.params.id as any);
  if (!sat) {
    res.status(404).json({ error: 'Satellite not found' });
    return;
  }
  res.json(sat);
});

app.get('/api/orbital/geometry', (req: Request, res: Response) => {
  const satId = (req.query.satelliteId as any) || 'TERRA';
  const scanAngle = parseFloat((req.query.scanAngleDeg as string) || '0');
  const geom = orbitalService.computeViewingGeometry(satId, scanAngle);
  res.json(geom);
});

app.get('/api/orbital/terra-drift', (req: Request, res: Response) => {
  const year = parseInt((req.query.year as string) || '2026', 10);
  const drift = orbitalService.evaluateTerraDriftImpact(year);
  res.json(drift);
});

app.get('/api/orbital/opportunities', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  const opps = orbitalService.getObservationOpportunities(regionId);
  res.json(opps);
});

// 13. ALEX FIRE — Burning Activity Calendar Endpoints
app.get('/api/fire/calendar', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  const records = regionId === 'REG-NILGIRI'
    ? NILGIRIS_EMPIRICAL_MONTHLY_ARCHIVE
    : HYPER_REALISTIC_HISTORICAL_ARCHIVE.filter((r) => r.regionId === regionId);
  const calendar = fireCalendarService.getRegionalBurningCalendar(regionId, records);
  res.json(calendar);
});

app.get('/api/fire/calendar/csv', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  const records = regionId === 'REG-NILGIRI'
    ? NILGIRIS_EMPIRICAL_MONTHLY_ARCHIVE
    : HYPER_REALISTIC_HISTORICAL_ARCHIVE.filter((r) => r.regionId === regionId);
  const csv = fireCalendarService.generateCalendarCsv(regionId, records);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="ALEX_Fire_Calendar_${regionId}.csv"`);
  res.send(csv);
});

app.get('/api/fire/calendar/geojson', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  const records = regionId === 'REG-NILGIRI'
    ? NILGIRIS_EMPIRICAL_MONTHLY_ARCHIVE
    : HYPER_REALISTIC_HISTORICAL_ARCHIVE.filter((r) => r.regionId === regionId);
  const geojson = fireCalendarService.generateCalendarGeoJson(regionId, undefined, undefined, records);
  res.setHeader('Content-Type', 'application/geo+json');
  res.setHeader('Content-Disposition', `attachment; filename="ALEX_Fire_Calendar_${regionId}.geojson"`);
  res.send(geojson);
});

// 14. Data & Resource Catalogue Endpoints
app.get('/api/catalogue', (req: Request, res: Response) => {
  res.json(dataCatalogueService.getAllSources());
});

app.get('/api/catalogue/:id', (req: Request, res: Response) => {
  const src = dataCatalogueService.getSourceById(req.params.id);
  if (!src) {
    res.status(404).json({ error: 'Data source not found' });
    return;
  }
  res.json(src);
});

// 15. Community & Field Reporting Endpoints
app.get('/api/community/reports', (req: Request, res: Response) => {
  res.json(communityService.getFieldReports());
});

app.post('/api/community/reports', validateFieldReportInput, async (req: Request, res: Response) => {
  try {
    const report = await communityService.submitFieldReport(req.body);
    broadcastSse('field_report_submitted', report);
    res.status(201).json(report);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/community/bulletins', (req: Request, res: Response) => {
  res.json(communityService.getSafetyBulletins());
});

app.post('/api/community/bulletins', requireRole(['commander']), async (req: Request, res: Response) => {
  try {
    const bulletin = await communityService.publishSafetyBulletin(req.body);
    broadcastSse('safety_bulletin_published', bulletin);
    res.status(201).json(bulletin);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 16. NASA FIRMS Integration Endpoints
app.get('/api/firms/status', (req: Request, res: Response) => {
  res.json(nasaFirmsAdapter.getStatus());
});

// Live, source-native satellite pull for map/dashboard clients. This is read-only;
// it does not silently write observations into the incident ledger.
app.get('/api/firms/live', async (req: Request, res: Response) => {
  const regions: Record<string, [number, number, number, number]> = {
    'REG-NILGIRI': [76.0, 11.0, 77.5, 12.5], 'REG-SIERRA': [-121.0, 36.0, -118.0, 39.0],
    'REG-ARCADIA': [-8.5, 37.0, -6.0, 42.0], 'REG-PANTANAL': [-58.5, -21.0, -54.0, -16.0],
  };
  const regionId = String(req.query.regionId || 'REG-NILGIRI');
  const areaBbox = regions[regionId];
  if (!areaBbox) { res.status(400).json({ error: 'Unsupported satellite region.' }); return; }
  const sensors = ['VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'VIIRS_SNPP_NRT', 'MODIS_NRT'] as const;
  const results = await Promise.allSettled(sensors.map((sensor) => nasaFirmsAdapter.fetchObservations({ sensor, days: 1, areaBbox })));
  const observations = results.flatMap((result) => result.status === 'fulfilled' ? result.value.observations : []);
  const notices = results.map((result, index) => result.status === 'fulfilled' ? null : `${sensors[index]}: ${result.reason?.message || 'unavailable'}`).filter(Boolean);
  res.json({ source: 'NASA FIRMS NRT', regionId, fetchedAt: new Date().toISOString(), isLive: results.some((r) => r.status === 'fulfilled' && r.value.isLive), observations, productCount: sensors.length, unavailableProducts: notices });
});

app.post('/api/firms/ingest', sensitiveApiLimiter.middleware(), requireRole(['incident_commander', 'system_administrator', 'commander']), async (req: Request, res: Response) => {
  try {
    const { country, sensor, days, areaBbox } = req.body;
    const result = await nasaFirmsAdapter.fetchObservations({
      country,
      sensor,
      days,
      areaBbox,
    });

    if (result.isLive && result.observations.length > 0) {
      // 1. Store raw observations independently with full sensor provenance (P2.1)
      await globalStore.addRawObservations(result.observations);

      // 2. Ledger recording
      await globalLedger.appendEvent('observation_ingested', req.user?.userId || 'COMMANDER', {
        count: result.observations.length,
        sensor,
        queryType: result.queryType,
        sourceProvenance: 'NASA FIRMS API',
        timestamp: new Date().toISOString(),
      });

      broadcastSse('firms_ingested', {
        count: result.observations.length,
        sensor,
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function getDatasetPath(filename: string): string {
  const p = path.resolve(process.cwd(), 'dataset', filename);
  if (fs.existsSync(p)) return p;
  return path.resolve(process.cwd(), 'data', filename);
}

// 17. Raw Observations & Provenance
app.get('/api/observations', (req: Request, res: Response) => {
  const stored = globalStore.getRawObservations();
  if (stored && stored.length > 0) {
    res.json(stored);
    return;
  }
  const jsonPath = getDatasetPath('firelens_nilgiris_2019_2026.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const canonical = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : canonical.length;
      const mapped = canonical.slice(0, limit).map((o: any) => ({
        id: o.id,
        sourceProvider: 'NASA_FIRMS',
        sourceProductId: o.productLayer,
        productLayer: o.productLayer,
        satellite: o.satellite,
        sensor: o.sensor,
        acquisitionTimestampUtc: o.acquisitionTimestampUtc,
        ingestionTimestampUtc: o.ingestionTimestampUtc,
        lat: o.latitude,
        lng: o.longitude,
        frpMw: o.frpMw,
        brightnessKelvin: o.brightnessKelvin,
        brightness2Kelvin: o.backgroundBrightnessKelvin,
        scanKm: o.scanKm,
        trackKm: o.trackKm,
        modisConfidencePct: o.modisConfidencePct,
        viirsConfidenceCategory: o.viirsConfidenceCategory,
        dayNight: o.dayNight,
      }));
      res.json(mapped);
      return;
    } catch {
      // fallback to empty array
    }
  }
  res.json([]);
});

// FireLens Canonical Earth Observation & Decomposition Endpoints
app.get('/api/firelens/observations', (req: Request, res: Response) => {
  try {
    const jsonPath = getDatasetPath('firelens_nilgiris_2019_2026.json');
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'FireLens dataset not yet compiled.' });
      return;
    }
    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let filtered = rawData;
    if (req.query.year) {
      const yr = parseInt(req.query.year as string, 10);
      filtered = filtered.filter((o: any) => new Date(o.acquisitionTimestampUtc).getUTCFullYear() === yr);
    }
    if (req.query.sensor) {
      filtered = filtered.filter((o: any) => o.sensor === req.query.sensor);
    }
    if (req.query.dayNight) {
      filtered = filtered.filter((o: any) => o.dayNight === req.query.dayNight);
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : filtered.length;
    res.json({
      totalCount: rawData.length,
      returnedCount: Math.min(filtered.length, limit),
      observations: filtered.slice(0, limit),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/firelens/decomposition', (_req: Request, res: Response) => {
  try {
    const jsonPath = getDatasetPath('firelens_nilgiris_2019_2026.json');
    const mcdPath = getDatasetPath('firelens_validation_mcd64a1.json');
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'FireLens dataset not found.' });
      return;
    }
    const obs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const mcd = fs.existsSync(mcdPath) ? JSON.parse(fs.readFileSync(mcdPath, 'utf8')) : [];
    const result = decomposeObservingEffort(obs, mcd);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/firelens/validation', (_req: Request, res: Response) => {
  try {
    const mcdPath = getDatasetPath('firelens_validation_mcd64a1.json');
    if (!fs.existsSync(mcdPath)) {
      res.status(404).json({ error: 'Validation dataset not found.' });
      return;
    }
    res.json(JSON.parse(fs.readFileSync(mcdPath, 'utf8')));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/firelens/export/csv', (_req: Request, res: Response) => {
  const csvPath = getDatasetPath('firelens_nilgiris_2019_2026.csv');
  if (fs.existsSync(csvPath)) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="firelens_nilgiris_2019_2026.csv"');
    fs.createReadStream(csvPath).pipe(res);
  } else {
    res.status(404).json({ error: 'CSV release file not found' });
  }
});

app.get('/api/firelens/export/geojson', (req: Request, res: Response) => {
  try {
    const jsonPath = getDatasetPath('firelens_nilgiris_2019_2026.json');
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'FireLens dataset not found.' });
      return;
    }
    const obs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 3000;
    const slice = obs.slice(0, limit);
    const features = slice.map((o: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [o.longitude, o.latitude],
      },
      properties: {
        id: o.id,
        satellite: o.satellite,
        sensor: o.sensor,
        acquisitionTimestampUtc: o.acquisitionTimestampUtc,
        frpMw: o.frpMw,
        brightnessKelvin: o.brightnessKelvin,
        scanKm: o.scanKm,
        trackKm: o.trackKm,
        pixelAreaKm2: o.pixelAreaKm2,
        viewZenithBin: o.viewZenithBin,
        modisConfidencePct: o.modisConfidencePct,
        viirsConfidenceCategory: o.viirsConfidenceCategory,
        dayNight: o.dayNight,
        rawPayloadChecksumSha256: o.rawPayloadChecksumSha256,
      },
    }));
    res.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        aoi: 'Nilgiris Biosphere Reserve (11.0N-12.0N, 76.2E-77.3E)',
        count: features.length,
        totalDatasetRecords: obs.length,
        citation: 'NASA EOSDIS FIRMS MODIS Collection 6.1 & VIIRS C2',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// NASA EONET is a public, live event feed. It complements FIRMS detections but
// is never converted into a thermal observation or an authority confirmation.
app.get('/api/eonet/wildfires', async (_req: Request, res: Response) => {
  try {
    res.json({ source: 'NASA EONET v3', fetchedAt: new Date().toISOString(), events: await nasaEonetAdapter.getOpenWildfires() });
  } catch (err: any) {
    res.status(503).json({ error: `NASA EONET unavailable: ${err.message}` });
  }
});

// 18. Database & Persistence Status (PostgreSQL/PostGIS)
app.get('/api/database/status', (req: Request, res: Response) => {
  res.json(postgresService.getStatus());
});

// 19. Cryptographic Token Issue (Authentication Endpoint)
// SEC-01 FIX: Self-service tokens are capped to public_viewer.
// Elevated roles (field_responder, incident_commander, system_administrator) require
// server-side ALEX_OPERATOR_SECRET to prevent unauthenticated privilege escalation.
app.post('/api/auth/token', authRateLimiter.middleware(), validateAuthTokenInput, (req: Request, res: Response) => {
  const { username, role, agency, operatorSecret } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  const requestedRole = normalizeToCanonicalRole(role || 'public_viewer');

  // Elevated roles require the server-side operator secret
  const elevatedRoles: string[] = ['field_responder', 'incident_commander', 'system_administrator'];
  if (elevatedRoles.includes(requestedRole)) {
    const serverOperatorSecret = process.env.ALEX_OPERATOR_SECRET;
    if (!serverOperatorSecret) {
      res.status(503).json({
        error: 'Elevated role issuance is unavailable: ALEX_OPERATOR_SECRET not configured on server.',
        code: 'OPERATOR_SECRET_NOT_CONFIGURED',
      });
      return;
    }
    if (!operatorSecret || operatorSecret !== serverOperatorSecret) {
      res.status(401).json({
        error: 'Elevated role requires valid ALEX_OPERATOR_SECRET credential.',
        code: 'INVALID_OPERATOR_CREDENTIAL',
      });
      return;
    }
  }

  // Only issue public_viewer by self-service, or elevated role after credential verification
  let token: string;
  try {
    token = generateSignedToken({
      userId: `USR-${username.toUpperCase()}`,
      username,
      role: requestedRole,
      agency: agency || 'Environmental Operations',
      expiresInSeconds: 86400,
    });
  } catch (err: any) {
    res.status(503).json({
      error: 'Token issuance failed: server signing secret not configured.',
      code: 'SECRET_NOT_CONFIGURED',
    });
    return;
  }

  res.json({
    token,
    tokenType: 'Bearer',
    expiresIn: 86400,
    role: requestedRole,
    username,
    agency: agency || 'Environmental Operations',
  });
});

// 20. Role-Based Access Control Endpoints
app.get('/api/access/roles', (req: Request, res: Response) => {
  res.json(accessControlService.getAllRoles());
});

// 21. NIFC Wildland Fire Perimeters & Spread Projections
app.get('/api/perimeters', async (req: Request, res: Response) => {
  try {
    const isLiveRequested = req.query.live === 'true';
    if (isLiveRequested) {
      const minAcres = req.query.minAcres ? parseInt(req.query.minAcres as string, 10) : 100;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const liveData = await nifcPerimetersAdapter.fetchLivePerimeters({ minAcres, limit });
      res.json(liveData);
      return;
    }
    const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
    const perimeters = getPerimetersForRegion(regionId);
    res.json({
      isLive: false,
      sourceProvider: 'CALIBRATED_BENCHMARK_PERIMETERS',
      regionId,
      count: perimeters.length,
      perimeters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/perimeters/:id', (req: Request, res: Response) => {
  const perim = FIRE_PERIMETERS.find((p) => p.perimeterId === req.params.id);
  if (!perim) {
    res.status(404).json({ error: 'Perimeter not found' });
    return;
  }
  res.json(perim);
});

app.get('/api/perimeters/:id/spread', (req: Request, res: Response) => {
  const forecast = getSpreadForecastForPerimeter(req.params.id);
  if (!forecast) {
    res.status(404).json({ error: 'Spread forecast not found for this perimeter' });
    return;
  }
  res.json(forecast);
});

app.get('/api/perimeters/:id/progression', (req: Request, res: Response) => {
  const progression = getPerimeterProgression(req.params.id);
  res.json(progression);
});

// 22. Weather & Fuel Moisture Endpoints
app.get('/api/fuels/stations', (_req: Request, res: Response) => {
  res.json(liveFuelsAdapter.getAllStations());
});

app.get('/api/fuels/observations', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  res.json(liveFuelsAdapter.getObservationsForRegion(regionId));
});

app.get('/api/fuels/live-estimate', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 11.4185;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : 76.7042;
    const stationId = (req.query.stationId as string) || 'LIVE-STATION';
    const stationName = (req.query.stationName as string) || 'Live Gridded Sensor Node';

    const result = await liveFuelsAdapter.fetchLiveFuelMoisture(lat, lng, stationId, stationName);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 23. Demographic & Infrastructure Exposure Endpoints
app.get('/api/exposure/demographics', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  res.json(exposureService.getDemographics(regionId));
});

app.get('/api/exposure/buildings', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(exposureService.getBuildings(regionId));
});

app.get('/api/exposure/infrastructure', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(exposureService.getCriticalInfrastructure(regionId));
});

app.get('/api/exposure/evacuation-zones', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(exposureService.getEvacuationZones(regionId));
});

app.get('/api/exposure/summary', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  res.json(exposureService.getRegionalSummary(regionId));
});

// 24. Road Hazards & Responder Fleet Telemetry
app.get('/api/hazards/roads', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(hazardAndFleetService.getRoadHazards(regionId));
});

app.get('/api/hazards/bridges', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(hazardAndFleetService.getBridgeRestrictions(regionId));
});

app.post('/api/hazards/evaluate-corridor', validateCorridorEvaluationInput, (req: Request, res: Response) => {
  try {
    const { hazardIds, vehicleClass, vehicleWeightTons, vehicleHeightMeters } = req.body;
    const result = hazardAndFleetService.evaluateCorridor({
      hazardIds: Array.isArray(hazardIds) ? hazardIds : [],
      vehicleClass,
      vehicleWeightTons: Number(vehicleWeightTons ?? 18),
      vehicleHeightMeters: Number(vehicleHeightMeters ?? 3.4),
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/fleet/apparatus', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(hazardAndFleetService.getFleetTelemetry(regionId));
});

app.get('/api/fleet/staging', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(hazardAndFleetService.getStagingFacilities(regionId));
});

// 25. Ground Verification & CAD Dispatch (112/911)
app.get('/api/cad/dispatches', (req: Request, res: Response) => {
  const regionId = req.query.regionId as string | undefined;
  res.json(groundVerificationService.getCadDispatches(regionId));
});

app.get('/api/ranger/reports', (req: Request, res: Response) => {
  const incidentId = req.query.incidentId as string | undefined;
  res.json(groundVerificationService.getRangerReports(incidentId));
});

app.get('/api/corroboration/matrix', (req: Request, res: Response) => {
  const incidentId = req.query.incidentId as string | undefined;
  res.json(groundVerificationService.getCorroboration(incidentId));
});

app.get('/api/ground-verification/:incidentId', (req: Request, res: Response) => {
  res.json(groundVerificationService.getVerificationPackage(req.params.incidentId));
});

// 26. NASA FIRMS Historical Climatology & Ingestion
app.get('/api/firms/archive/medians', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  const medians = HISTORICAL_REGIONAL_MEDIANS[regionId] || null;
  res.json({ regionId, baselinePeriod: '2000-2025', medians });
});

app.get('/api/firms/archive/anomaly', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  const month = parseInt((req.query.month as string) || '3', 10);
  const observedHotspots = parseInt((req.query.hotspots as string) || '120', 10);

  const evaluation = evaluateSeasonalAnomaly(regionId, month, observedHotspots);
  res.json({ regionId, month, observedHotspots, evaluation });
});

app.post('/api/firms/archive/load-baseline', requireRole(['commander', 'system_administrator']), (_req: Request, res: Response) => {
  const records = loadMockHistoricalArchive();
  res.json({
    status: 'LOADED',
    message: 'Hyper-realistic 25-year NASA FIRMS historical archive loaded into operational baseline.',
    recordCount: records.length,
  });
});

app.post('/api/firms/archive/unload-baseline', requireRole(['commander', 'system_administrator']), (_req: Request, res: Response) => {
  unloadMockHistoricalArchive();
  res.json({
    status: 'UNLOADED',
    message: 'Operational historical observations cleared per Rule P0.1 clean baseline.',
    recordCount: 0,
  });
});

// 27. Copernicus Sentinel Imagery Endpoints
app.post('/api/satellite/sentinel/search', async (req: Request, res: Response) => {
  try {
    const scenes = await copernicusAdapter.searchScenes(req.body);
    res.json({ isLive: true, count: scenes.length, scenes, fetchedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/satellite/vegetation-index', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 11.4185;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : 76.7042;
    const result = await copernicusAdapter.estimateVegetationIndex(lat, lng);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/satellite/copernicus/status', (_req: Request, res: Response) => {
  res.json(copernicusAdapter.getStatus());
});

// 27. AI Intelligence Engine
app.post('/api/ai/analyze-threat', sensitiveApiLimiter.middleware(), requireRole(['commander', 'field', 'operator']), async (req: Request, res: Response) => {
  try { res.json(await aiIntelligenceService.analyzeFireThreat(req.body)); } catch(e:any){res.status(500).json({error:e.message});}
});
app.post('/api/ai/evacuation-brief', sensitiveApiLimiter.middleware(), requireRole(['commander']), async (req: Request, res: Response) => {
  try { res.json(await aiIntelligenceService.generateEvacuationBrief(req.body)); } catch(e:any){res.status(500).json({error:e.message});}
});
app.post('/api/ai/intelligence-report', sensitiveApiLimiter.middleware(), requireRole(['commander', 'system_administrator']), async (req: Request, res: Response) => {
  try { res.json(await aiIntelligenceService.synthesizeIntelligenceReport(req.body)); } catch(e:any){res.status(500).json({error:e.message});}
});
app.get('/api/ai/status', (_req: Request, res: Response) => { res.json(aiIntelligenceService.getProviderStatus()); });

// 28. Telegram Alerts
app.post('/api/alerts/telegram/fire', requireRole(['commander']), async (req: Request, res: Response) => { try { res.json(await telegramAlertService.sendFireAlert(req.body)); } catch(e:any){res.status(500).json({error:e.message});} });
app.post('/api/alerts/telegram/evacuation', requireRole(['commander']), async (req: Request, res: Response) => { try { res.json(await telegramAlertService.sendEvacuationOrder(req.body)); } catch(e:any){res.status(500).json({error:e.message});} });
app.post('/api/alerts/telegram/system', requireRole(['commander', 'system_administrator']), async (req: Request, res: Response) => { try { res.json(await telegramAlertService.sendSystemAlert(req.body.message, req.body.level || 'INFO')); } catch(e:any){res.status(500).json({error:e.message});} });
app.get('/api/alerts/telegram/status', (_req: Request, res: Response) => { res.json(telegramAlertService.getStatus()); });

// 29. OpenSky Aerial Responders
app.get('/api/aircraft/bbox', async (req: Request, res: Response) => { try { const {latMin,lngMin,latMax,lngMax} = req.query; res.json(await openskyAdapter.fetchAircraftInBbox({latMin:+latMin!,lngMin:+lngMin!,latMax:+latMax!,lngMax:+lngMax!})); } catch(e:any){res.status(500).json({error:e.message});} });
app.get('/api/aircraft/responders', async (req: Request, res: Response) => { try { res.json(await openskyAdapter.getAerialResponders((req.query.regionId as string)||'REG-NILGIRI')); } catch(e:any){res.status(500).json({error:e.message});} });
app.get('/api/aircraft/status', (_req: Request, res: Response) => { res.json(openskyAdapter.getStatus()); });

// 30. Multimodal Transportation Corridors (Road, Rail & Waterway)
app.get('/api/hazards/multimodal', (req: Request, res: Response) => {
  const regionId = (req.query.regionId as string) || 'REG-NILGIRI';
  res.json(hazardAndFleetService.getMultimodalCorridors(regionId));
});

// 31. Notion Incident Intelligence Logging
app.post('/api/notion/log-incident', requireRole(['commander', 'incident_commander']), async (req: Request, res: Response) => {
  try {
    const result = await notionAdapter.logIncidentBriefing(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/notion/pages', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    res.json(await notionAdapter.getRecentPages(limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/notion/status', (_req: Request, res: Response) => {
  res.json(notionAdapter.getStatus());
});

// 32. GitHub Sovereign Audit & Operational Repos
app.get('/api/github/status', async (_req: Request, res: Response) => {
  try {
    res.json(await githubAdapter.getStatus());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/github/repos', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    res.json(await githubAdapter.getRepositories(limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 33. Gemini 3.8 Live Voice Command Engine
app.post('/api/voice/live/turn', sensitiveApiLimiter.middleware(), validateLiveVoiceInput, async (req: Request, res: Response) => {
  try {
    const { input, voiceName, incidentId } = req.body;
    const result = await geminiLiveService.executeVoiceTurn({ input, voiceName, incidentId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/voice/live/token', async (req: Request, res: Response) => {
  try {
    const supportedVoices = ['Aoede', 'Puck', 'Charon', 'Fenrir', 'Kore'];
    const voiceName = supportedVoices.includes(req.body?.voiceName) ? req.body.voiceName : 'Aoede';
    res.json(await geminiLiveService.createBrowserLiveToken(voiceName));
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'Gemini Live session could not be provisioned.' });
  }
});

app.get('/api/voice/live/status', (_req: Request, res: Response) => {
  res.json(geminiLiveService.getStatus());
});

// Centralized Zero-Trust Error Boundary Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const traceId = req.traceId || 'unknown';
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const sanitizedMessage = process.env.NODE_ENV === 'production'
    ? (status < 500 ? (err.message || 'Client request rejected.') : 'Internal server error occurred.')
    : (err.message || 'Internal server error');

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error Boundary][${traceId}]`, sanitizedMessage);
  }

  res.status(status).json({
    error: sanitizedMessage,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    traceId,
  });
});

// Start Server
export async function startServer() {
  await globalLedger.init();
  await globalStore.init();

  if (process.env.DATABASE_URL) {
    try {
      await postgresService.initAndMigrate();
    } catch (err: any) {
      console.warn('[PostgreSQL] Initialization notice:', err.message);
    }
  }

  return new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`FireLens Science Backend running on http://0.0.0.0:${PORT}`);
      resolve(app);
    });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start ALEX backend server:', err);
  });
}
