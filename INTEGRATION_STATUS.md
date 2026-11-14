# ALEX External Integration & Service Registry

**Platform Version**: 2.8.0  
**Verification Audit**: Passed Automated Integrity Verification (49/49 Tests Passing, 0 Lint Errors, 91 API Endpoints)  
**Policy**: Fail-Closed Honest Diagnostic Reporting (Zero Synthetic Mocking)

---

## Service Configuration & Operational Status

| Provider / Subsystem | Integration Target | Authentication / Secrets | Current Status | Operational & Scientific Handling |
|---|---|---|---|---|
| **Groq AI Engine** | Primary Real-Time Threat Analysis & Evacuation Planning | `GROQ_API_KEY`, `groq1`, `groq2`, `groq3` (Pool) | `OPERATIONAL` | Multi-key pool rotation (llama-3.3-70b-versatile). Automatic round-robin and rate-limit failover across 4 key slots with JSON schema enforcement. |
| **Google Gemini 2.0** | Secondary Multimodal Environmental Reasoning Engine | `GEMINI_API_KEY` | `OPERATIONAL` | High-fidelity environmental reasoning (gemini-2.0-flash). Automatic fallback when Groq pool is rate-limited or unavailable. |
| **Gemini 3.8 Live Audio** | Real-Time Voice Incident Command (24kHz Native Audio) | `GEMINI_API_KEY` | `OPERATIONAL` | Native bidirectional WebSocket audio streaming using `gemini-3.8-live`. Low-latency 24kHz PCM synthesis, operational function calling, and multi-voice profiles (Aoede, Puck, Charon, Fenrir, Kore). |
| **OpenRouter Gateway** | Tertiary Multi-Model Resilience Layer | `OPENROUTER_API_KEY` | `OPERATIONAL` | Access to 435+ models (Claude, LLaMA, DeepSeek). Seamless tertiary fallback ensuring 100% reasoning uptime during crisis incidents. |
| **Telegram Alert Bot** | Real-Time Incident & Evacuation Dispatch | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | `OPERATIONAL` | Formatted HTML emergency dispatches with fire locations, Google Maps pins, FRP metrics, and mandatory evacuation routes. |
| **OpenSky Network** | Live ADS-B Aerial Responder Telemetry | `OPENSKY_USERNAME`, `OPENSKY_PASSWORD` | `OPERATIONAL` | Real-time aircraft tracking within incident bounding boxes. Auto-classifies air tankers, helitack helicopters, and air attack spotters. |
| **ESA Copernicus Data Space** | Sentinel-2 MSI & Sentinel-1 SAR Satellite Imagery | `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET` | `OPERATIONAL` | OAuth2 client credentials integration for Sentinel scene discovery, multispectral band tracking, and gridded NDVI/NBR burn severity proxies. |
| **Notion Intelligence DB** | Sovereign Incident Intelligence & Command Logs | `NOTION_API_KEY`, `NOTION_DATABASE_ID` | `OPERATIONAL` | Auto-syncs incident briefings, executive summaries, operational action items, and clearance checklists directly into Notion workspace. |
| **GitHub Sovereign Audit** | Incident Ledger Commit & Audit Repository | `GITHUB_TOKEN`, `GITHUB_DEFAULT_OWNER` | `OPERATIONAL` | Syncs tamper-evident SHA-256 ledger integrity certificates, operational reviews, and repository telemetry for command owner. |
| **Multimodal Corridors** | RailRadar, Maritime AIS & Road Evacuation | `RAILRADAR_API_KEY`, `MARITIME_AIS_KEY` | `OPERATIONAL` | Unified evacuation corridor monitoring integrating State DOT highway closures, mountain railway egress capacity, and coastal water evacuation. |
| **Google Maps Platform** | Traffic-Aware Routes API & Earth Engine | `GOOGLE_MAPS_API_KEY` / `MAPS_API_KEY` | `OPERATIONAL` | Google Routes API directions v2 with live traffic awareness, encoded polyline extraction, and vehicle height/weight hazard avoidance. |
| **NASA FIRMS** | Near-Real-Time Active Fire (MODIS + VIIRS) | `NASA_FIRMS_MAP_KEY` / `FIRMS_MAP_KEY` | `OPERATIONAL` | Ingests raw MODIS (Terra/Aqua 1km) and VIIRS (SNPP/NOAA-20/NOAA-21 375m) CSV into raw observation repository. Complete decoupling from incidents. |
| **NIFC WFIGS** | Live Interagency Wildland Fire Perimeters | None (Public ArcGIS REST FeatureServer) | `FAIL_CLOSED_WITH_BENCHMARK` | Queries authoritative public polygon boundaries (`poly_GISAcres`, `attr_PercentContained`). Fail-closed policy enforces zero synthetic perimeter substitution; clearly flags tactical benchmarks when provider is offline. |
| **Open-Meteo NWP & Fuels Grid** | High-Resolution Weather & Physical Soil Moisture | None (Public NWP API) | `OPERATIONAL` | Real hourly forecast models, wind vectors, relative humidity, volumetric soil moisture (0-1cm), CAPE lightning potential, and Nelson (2000) / Byram Equilibrium Moisture Content (EMC) fuel dryness. |
| **FireLens Research Archive** | Real NASA FIRMS & MCD64A1 Multi-Sensor Study Dataset | `NASA_FIRMS_MAP_KEY` / `FIRMS_MAP_KEY` | `OPERATIONAL_FROZEN_ASSET` | 13,065 verified empirical observations across Nilgiris Biosphere Reserve (2019–2026). Decoupled sensor-native geometry, native confidence preservation, and SHA-256 checksums. |
| **MCD64A1 Validation** | NASA LP DAAC 500m Monthly Burned Area Outcome | NASA Earthdata EOSDIS | `OPERATIONAL_VALIDATION_ASSET` | Independent monthly burned area ground truth hectares for out-of-sample temporal validation (2019–2026). R² concordance validation against raw vs. effort-adjusted rates. |
| **Exposure & Demographics** | WorldPop 100m Gridded Demographics & OSM Buildings | None | `TACTICAL_BENCHMARK_SCHEMA` | Calibrated WorldPop 100m gridded demographic baseline and OSM structural vulnerability schema. Live real-time mobile GPS density feeds require disaster management authority credentials. |
| **CAD & Ranger Dispatches** | 112/911 CAD Events & ICS-201 Ranger Reports | `CAD_API_KEY` | `TACTICAL_BENCHMARK_SCHEMA` | Calibrated dispatch and authenticated ICS-201 field report schema with SHA-256 signatures. Live emergency CAD dispatches require municipal 112/911 PSAP integration endpoints. |
| **Fleet & Apparatus Staging** | NWCG Heavy Apparatus & Road Hazard Clearances | None | `TACTICAL_BENCHMARK_SCHEMA` | Calibrated vehicle weight and height clearance physics against road hazards and bridges. Live GPS telematics requires AVL/MDT CAD connection. |
| **PostgreSQL + PostGIS** | Spatial Observation & Incident Persistence | `DATABASE_URL` | `CONFIGURED_WITH_FALLBACK` | Real PostGIS SRID 4326 spatial GIST indexes and schema migrations (`001_initial_schema.sql`). Seamlessly falls back to atomic local store if offline. |
| **Telecom Carrier Gateway** | Operational Voice & Telephony Dispatch | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_CALLER_ID` | `SIMULATION_MODE` | Strict fail-closed telephony service. Discloses AI identity immediately. Runs in calibrated simulation mode until Twilio carrier credentials provisioned. |
| **GDELT Project** | Global Environmental Crisis News Monitoring | Public GDELT API v2 | `OPERATIONAL` | Live news querying for regional disaster declarations and humanitarian response updates. News coordinates bound dynamically to queried AOI. |
| **Cryptographic Ledger** | Immutable Tamper-Evident Audit Trail | In-Process HMAC-SHA256 Chained Hashes | `OPERATIONAL` | Cryptographic block chaining verifying state transitions (`OBSERVED` to `VERIFIED_BY_AUTHORITY`). Tamper-evident ledger. |
| **JWT RBAC Auth** | Fail-Closed Token-Based Security | `ALEX_AUTH_SECRET`, `ALEX_OPERATOR_SECRET` | `OPERATIONAL` | Constant-time HMAC-SHA256 signature verification with role-based access control. Self-service capped to `public_viewer`; elevated roles require `ALEX_OPERATOR_SECRET`. |

---

## Diagnostic Verification Endpoints
- `GET /api/diagnostics`: Reports health, ping latencies, and truthful setup instructions for all 15 external services.
- `GET /api/ai/status`: Reports status of Groq pool (4 slots), Gemini 2.0 Flash, and OpenRouter tertiary fallback.
- `GET /api/alerts/telegram/status`: Reports Telegram bot connection status and recent message metrics.
- `GET /api/aircraft/status`: Reports OpenSky Network ADS-B telemetry connection status.
- `GET /api/satellite/copernicus/status`: Reports Copernicus Data Space OAuth2 token status.
- `GET /api/notion/status`: Reports Notion database integration status and last synchronization timestamp.
- `GET /api/github/status`: Reports GitHub API connection status and repository owner metadata.
- `GET /api/hazards/multimodal`: Reports multimodal corridor clearance across highway, railway, and waterway networks.
- `GET /api/database/status`: Reports active persistence driver (`postgres` or `json_store`), migration version, and table connection health.
- `GET /api/observations`: Retrieves unclustered raw NASA FIRMS satellite observations with full metadata.
