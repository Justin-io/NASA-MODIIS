# Backend Services, Engine Controllers & Remote Adapters

This document provides a function-by-function reference for all 16 backend application services and 10 external sensor adapters in the `server/` directory.

---

## 1. Core Services (`server/services/`)

### 1.1 `OrbitalIntelligenceService` (`orbitalService.ts`)
Propagates Earth observation satellite orbits using SGP4 and calculates viewing geometries.

- **`getAllSatellites(): SatelliteOrbitRecord[]`**  
  Returns the complete inventory of tracked satellite missions (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21, Sentinel-3A, Himawari-9, GOES-19).
- **`getSatelliteById(id: SatelliteMissionId): SatelliteOrbitRecord | undefined`**  
  Finds registered satellite metadata by mission identifier.
- **`computeViewingGeometry(satelliteId: SatelliteMissionId, scanAngleDeg: number): ViewingGeometry`**  
  Calculates off-nadir spatial expansion. Computes view zenith angle, ground track pixel length ($\text{trackKm}$), cross-track pixel width ($\text{scanKm}$), and projected ground area ($A_{\text{pixel}}$) accounting for Earth curvature.
- **`propagateSatelliteState(satelliteId: SatelliteMissionId, targetDate: Date): PropagatedOrbitalState`**  
  Executes SGP4 orbital propagation using live NORAD two-line elements from CelesTrak. For geostationary systems (Himawari-9, GOES-19), uses fixed sub-satellite geodetic coordinates ($35,786\text{ km}$ altitude). Returns geodetic latitude, longitude, altitude, and epoch.
- **`evaluateTerraDriftImpact(targetYear: number): TerraDriftEvaluation`**  
  Computes the nodal precession and Mean Local Solar Time (MLST) drift for NASA Terra from 2000 to 2026. Returns crossing hour delta and diurnal thermal suppression factor.
- **`getObservationOpportunities(regionId: string, targetLat: number, targetLng: number): ObservationOpportunity[]`**  
  Calculates upcoming line-of-sight satellite passes over an AOI based on swath width, orbital period, and crossing geometry. Returns scheduled pass UTC, maximum elevation angle, view zenith, and clear sky probability.

---

### 1.2 `AiIntelligenceService` (`aiIntelligenceService.ts`)
Multi-model LLM orchestration engine with automatic failover across Groq, Google Gemini, and OpenRouter.

- **`generateIncidentBriefing(incident: IncidentRecord, weather?: WeatherStationSnapshot, context?: string): Promise<AiBriefingResult>`**  
  Constructs a structured prompt detailing thermal anomaly coordinates, FRP, wind speed, fuel dryness, and evacuation corridors. Rotates across 4 Groq API keys (`llama-3.3-70b-versatile`); automatically fails over to Gemini 2.0 Flash (`gemini-2.0-flash`) and OpenRouter on rate limit (HTTP 429).
- **`assessThreatSeverity(incident: IncidentRecord): Promise<RiskSeverity>`**  
  Extracts multi-modal threat vectors and classifies risk into `low`, `moderate`, `elevated`, `high`, or `critical`.
- **`getProviderStatus(): AiProviderStatusReport`**  
  Returns live operational health, quota headroom, and ping latencies for all configured AI providers.

---

### 1.3 `GeminiLiveVoiceService` (`geminiLiveService.ts`)
Bidirectional WebSocket streaming service enabling real-time, low-latency 24 kHz voice command with Gemini 3.8 Live API.

- **`handleWebSocketConnection(ws: WebSocket, req: IncomingMessage): void`**  
  Initializes client WebSocket session. Connects to `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`. Configures system instructions, function-calling tool declarations, and 24 kHz 16-bit linear PCM audio input/output pipes.
- **`handleVoiceFunctionCall(name: string, args: Record<string, any>): Promise<any>`**  
  Executes voice-invoked tools dispatched by the model:
  - `queryActiveIncidents(severity?: string)`: Queries in-memory incident store.
  - `triggerRothermelSimulation(windSpeedDeltaKmh, slopeDegrees, fuelMoisturePct)`: Runs Rothermel spread engine.
  - `dispatchEvacuationAlert(zoneId, corridorId)`: Dispatches emergency evacuation alert.
  - `adjustMapViewport(lat, lng, zoom)`: Broadcasts real-time viewport update to client UI.

---

### 1.4 `FireCalendarService` (`fireCalendarService.ts`)
Calculates multi-year climatological burning activity baselines and empirical medians.

- **`getRegionalBurningCalendar(regionId: string, records?: RegionalHistoricalFireRecord[])`**  
  Aggregates monthly active fire records. Returns monthly detection counts, MODIS vs. VIIRS breakdown, mean FRP, observation coverage percentage, and 25-year climatological medians.
- **`generateCalendarCsv(regionId: string, records?: RegionalHistoricalFireRecord[]): string`**  
  Formats burning activity records into an RFC 4180 compliant CSV stream with metadata headers and scientific provenance notes.
- **`generateCalendarGeoJson(regionId: string, latCenter: number, lngCenter: number, records?: RegionalHistoricalFireRecord[]): string`**  
  Generates an RFC 7946 GeoJSON `FeatureCollection` mapping monthly centroid coordinates with active fire properties.

---

### 1.5 `AccessControlService` (`accessControlService.ts`)
Role-Based Access Control (RBAC) and HMAC-SHA256 token verification.

- **`getAvailableRoles(): RoleDefinition[]`**  
  Lists supported user profiles: `public_viewer`, `field_ranger`, `gis_analyst`, `incident_commander`, `system_admin`.
- **`getRoleProfile(role: UserRole): RoleProfile`**  
  Returns permitted workspace routes, action permissions (`canConfirmEmergency`, `canDeployResources`, `canSignModelPromotion`), and clearance tier.
- **`canAccessWorkspace(role: UserRole, workspaceId: string): boolean`**  
  Evaluates workspace navigation permissions.
- **`isAuthorized(userRole: UserRole, requiredRole: UserRole): boolean`**  
  Hierarchical role clearance verification.

---

### 1.6 `ExposureService` (`exposureService.ts`)
Aggregates demographic populations, structural assets, and evacuation zones.

- **`getRegionalSummary(regionId: string): RegionalExposureSummary`**  
  Returns total resident population, vulnerable demographic count (elderly/infants), structure counts, critical infrastructure assets, and active evacuation zones.
- **`getDemographics(regionId: string): GriddedDemographicCell[]`**  
  Returns 100m gridded WorldPop population density cells.
- **`getBuildings(regionId: string): BuildingAssetRecord[]`**  
  Returns OpenStreetMap building footprints with structural vulnerability indices, roof material ratings, and defensible space buffer distances.
- **`getCriticalInfrastructure(regionId: string): CriticalInfrastructureAsset[]`**  
  Returns hospitals, electrical substations, water treatment facilities, and cellular relay towers.
- **`getEvacuationZones(regionId: string): EvacuationZoneRecord[]`**  
  Returns Zonehaven/Genasys compliant emergency evacuation polygons and designated evacuation corridors.

---

### 1.7 `HazardAndFleetService` (`hazardAndFleetService.ts`)
Evaluates vehicle weight, height, and axle constraints against mountain road hazards.

- **`getRoadHazards(regionId: string): RoadHazardRecord[]`**  
  Returns active road hazards (landslides, fallen timber, flash floods, flame front encroaching).
- **`getBridgeRestrictions(regionId: string): BridgeRestrictionRecord[]`**  
  Returns structural bridge load ratings (gross vehicle weight tons) and vertical clearance limits.
- **`getFleetApparatus(regionId: string): LiveResponderApparatus[]`**  
  Returns tracked emergency fleet units (Type 1 Structural Engines, Type 3 Tactical Wildland Engines, Type 6 Rapid Attack Trucks, Tactical Water Tenders, Bulldozers).
- **`evaluateCorridor(request: CorridorEvaluationRequest): CorridorEvaluationResult`**  
  Simulates vehicle traversal across a designated road corridor. Verifies vehicle weight against bridge capacity and height against overpass clearances; identifies impassable bottlenecks and suggests bypass routes.

---

### 1.8 `GroundVerificationService` (`groundVerificationService.ts`)
Manages authenticated field observations, CAD events, and epistemic corroboration.

- **`getCadDispatches(regionId: string): CadDispatchEvent[]`**  
  Returns emergency 112/911 Computer Aided Dispatch incidents.
- **`getRangerReports(regionId: string): AuthenticatedRangerReport[]`**  
  Returns ICS-201 field ranger assessments containing observer identity, GPS coordinates, fuel conditions, and SHA-256 digital signatures.
- **`getVerificationPackage(incidentId: string): VerificationPackage`**  
  Assembles the multi-modal evidence matrix (satellite detection + CAD log + ranger report + weather alert) required for authority confirmation.

---

### 1.9 `LearningService` (`learningService.ts`)
Manages human-in-the-loop ML model evaluation, drift detection, and promotion.

- **`getBenchmarks(): MachineLearningBenchmark[]`**  
  Returns evaluation metrics (precision, recall, F1, RMSE, inference latency) for candidate vision and tabular spread models.
- **`submitModelProposal(proposal: ModelProposal): ModelProposalRecord`**  
  Submits a retrained candidate model for commander review.
- **`promoteModel(proposalId: string, commanderAuthToken: string): PromotionResult`**  
  Validates commander digital signature and atomically switches operational inference weights.

---

### 1.10 `DiagnosticsService` (`diagnosticsService.ts`)
Automated diagnostic health probes.

- **`runSystemDiagnostics(): Promise<DiagnosticProviderHealth[]>`**  
  Executes parallel health pings across 15 external providers (NASA FIRMS, Open-Meteo, CelesTrak, Copernicus, OpenSky, Notion, GitHub, Telegram, Twilio, PostgreSQL). Emits ping latencies, operational statuses, and remediation steps.

---

### 1.11 `TelegramAlertService` (`telegramAlertService.ts`)
Automated emergency broadcast bot.

- **`sendEmergencyAlert(incident: IncidentRecord, routeName: string, zoneId: string): Promise<boolean>`**  
  Formats and posts urgent emergency dispatches with HTML coordinates, FRP, and evacuation corridors to configured Telegram channels.
- **`getStatus(): TelegramServiceStatus`**  
  Returns bot connection state and dispatch count.

---

### 1.12 `TelephonyService` (`telephonyService.ts`)
Carrier telephony gateway.

- **`triggerVoiceDispatch(incidentId: string, targetPhone: string): Promise<TelephonyCallResult>`**  
  Initiates automated voice dispatch. Enforces mandatory AI identity disclosure ("This is ALEX, an automated environmental AI system...").
- **`generateTwimlResponse(callId: string): string`**  
  Generates XML TwiML instructions for voice synthesis and touch-tone acknowledgment.
- **`getStatus(): TelephonyServiceStatus`**  
  Returns carrier configuration state and call logs.

---

## 2. Remote Adapters (`server/adapters/`)

### 2.1 `NasaFirmsAdapter` (`nasaFirms.ts`)
Ingests raw active fire observations from NASA EOSDIS FIRMS.

- **`fetchNearRealTimeFirms(regionId: string, days: number = 1): Promise<RawFirmsResult>`**  
  Queries NASA FIRMS API via IPv4 HTTPS. Ingests MODIS Collection 6.1 (`MODIS_NRT`) and VIIRS 375m (`VIIRS_NOAA20_NRT`, `VIIRS_SNPP_NRT`, `VIIRS_NOAA21_NRT`). Parses CSV into `RawSatelliteObservation` records with deterministic PKs and SHA-256 payload checksums.
- **`parseFirmsCsv(csvText: string, sourceProduct: ProductLayer): RawSatelliteObservation[]`**  
  Splits CSV rows, validates latitude/longitude ranges, maps scan/track geometry, and preserves native numeric or categorical confidence.
- **`getStatus(): AdapterStatus`**  
  Returns map key validation and connectivity status.

---

### 2.2 `WeatherAdapter` (`weatherAdapter.ts`)
Fetches high-resolution Numerical Weather Prediction observations from Open-Meteo.

- **`fetchRealWeather(lat: number, lng: number, regionName: string, stationId: string): Promise<WeatherStationSnapshot>`**  
  Queries Open-Meteo API for `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m`, `precipitation`, `soil_moisture_0_to_1cm`, `vapour_pressure_deficit`, and `cape`. Computes Equilibrium Moisture Content (EMC) via Nelson (2000) equations, derives fine fuel dryness, and evaluates CAPE lightning convection probability. Emits zero `NaN` values.
- **`degToCompass(deg: number): string`**  
  Converts meteorological azimuth degrees ($0^\circ–360^\circ$) into 16-point cardinal compass headings (N, NNE, NE, ENE, E, etc.).

---

### 2.3 `LiveFuelsAdapter` (`liveFuelsAdapter.ts`)
Calculates National Fire Danger Rating System (NFDRS) fuel moisture sticks and in-situ soil moisture.

- **`fetchLiveFuelMoisture(lat: number, lng: number, stationId: string, name: string): Promise<FuelMoistureObservation>`**  
  Queries Open-Meteo multi-depth soil moisture grids ($0–1\text{ cm}$, $1–3\text{ cm}$, $3–9\text{ cm}$). Computes 1-hr, 10-hr, and 100-hr dead fuel moisture timelags, Energy Release Component (ERC), and Burning Index (BI).
- **`getAllStations(): RAWSStationMetadata[]`**  
  Returns monitored Remote Automated Weather Stations across benchmark biomes.

---

### 2.4 `NifcPerimetersAdapter` (`nifcPerimeters.ts`)
Queries National Interagency Fire Center (NIFC) WFIGS wildland fire perimeter polygons.

- **`fetchLivePerimeters(options: PerimeterQueryOptions): Promise<LiveNifcPerimeterResult>`**  
  Connects to NIFC ArcGIS FeatureServer. Parses GeoJSON polygons, containment percentages, GIS acres, and active flame front lengths. When credentials are not provisioned or remote endpoint is unreachable, cleanly returns `status: 'UNAVAILABLE'` with fail-closed benchmarks.

---

### 2.5 `CopernicusAdapter` (`copernicusAdapter.ts`)
Discovers Sentinel-2 MSI and Sentinel-1 SAR multispectral scenes via ESA Copernicus Data Space OAuth2.

- **`fetchSentinelScene(request: SentinelImageryRequest): Promise<CopernicusSceneResult>`**  
  Authenticates via OAuth2 client credentials (`COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`). Queries Copernicus OData API for cloud-free Sentinel-2 granules matching target bounding box and acquisition window. Returns genuine metadata or fail-closed `status: 'UNAVAILABLE'`.

---

### 2.6 `OpenSkyAdapter` (`openskyAdapter.ts`)
Tracks aerial wildfire suppression assets using ADS-B transponder telemetry.

- **`fetchAircraftInBbox(bbox: BoundingBox): Promise<OpenSkyResponse>`**  
  Queries OpenSky Network REST API for aircraft state vectors within incident coordinates.
- **`getAerialResponders(regionId: string): Promise<AerialResponderAircraft[]>`**  
  Classifies callsigns, transponder squawk codes, and aircraft ICAO types into air tankers (DC-10, BAe-146, CL-415 Super Scooper), helitack helicopters (Sikorsky S-64 Skycrane, Bell 212), and lead planes.

---

### 2.7 `NotionAdapter` (`notionAdapter.ts`)
Synchronizes incident briefings to command Notion workspace.

- **`syncIncidentBriefing(incident: IncidentRecord): Promise<NotionSyncResult>`**  
  Creates or updates a sovereign Notion database page containing incident severity, coordinates, evacuation orders, and AI briefing text.

---

### 2.8 `GithubAdapter` (`githubAdapter.ts`)
Pushes immutable ledger blocks to an external sovereign audit repository.

- **`commitLedgerState(ledgerBlock: LedgerBlock): Promise<GithubCommitResult>`**  
  Pushes SHA-256 integrity certificates and block entries directly to the target GitHub repository for third-party judicial and executive verification.

---

### 2.9 `NewsAdapter` (`newsAdapter.ts`)
Monitors global environmental news via GDELT Project API v2.

- **`fetchCrisisNews(query: string, lat: number, lng: number): Promise<NewsItem[]>`**  
  Queries GDELT API for disaster declarations, evacuation notices, and infrastructure alerts. Binds news items dynamically to queried regional bounding boxes.

