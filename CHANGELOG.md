# ALEX Platform Changelog

All notable changes to the ALEX platform are documented herein, adhering to Semantic Versioning and the Recursive Engineering Loop.

---

## [2.7.0] - 2026-11-01 - Real Scientific Data, Sensor Harmonisation & NASA Space Apps Research-Grade Reconstruction (Upgrade Loop v5)

### Security & Access Control
- **Remediated Token Endpoint Privilege Escalation (SEC-01)**: `POST /api/auth/token` now strictly caps self-service token requests to `public_viewer`. Issuance of elevated operational roles (`field_responder`, `incident_commander`, `system_administrator`) requires verification against `ALEX_OPERATOR_SECRET`.
- **Eradicated Hardcoded Fallback Secrets (SEC-02)**: Removed `'alex-production-cryptographic-secret-key-2026'`. Production `server/auth/tokens.ts` strictly fails closed if `ALEX_AUTH_SECRET` is missing or below 32 characters of entropy.
- **Protected Sensitive Mutation Endpoints**: Added `requireRole` middleware to `PATCH /api/casualty/:id/dispatch`, `POST /api/learning/evaluate`, `POST /api/agents/execute`, and `POST /api/firms/ingest`.

### Scientific Data Integrity
- **Purged Fabricated Historical Observations (DATA-01)**: Removed hand-entered numbers masquerading as historical NASA FIRMS data from `src/shared/fireObservationsData.ts`. In unpopulated production, fire calendar truthfully reports `dataAvailability: 'UNAVAILABLE'`.
- **Empirical Climatological Medians (DATA-02)**: Purged hardcoded monthly medians. Medians are now computed dynamically via `computeEmpiricalMonthlyClimatology()` only when real observations are ingested.
- **Quarantined Synthetic Ground Truth (DATA-03)**: Moved fabricated ground truth records out of production path into `SYNTHETIC_TEST_CASES` for unit testing only. Production `HISTORICAL_GROUND_TRUTH_DATASET` is empty until official benchmark datasets are integrated.
- **Removed Invented Champion Metrics (DATA-04)**: Purged hardcoded 4.1% harmonization error and other invented performance numbers from `server/services/learningService.ts`. Unpopulated model evaluation returns `EVALUATION_BLOCKED`.
- **Native Categorical VIIRS Confidence (DATA-05)**: Eradicated artificial conversion of VIIRS confidence classes (`low`, `nominal`, `high`) to arbitrary percentages (30/70/95). Preserved natively in `RawSatelliteObservation.viirsConfidenceCategory`.
- **Null Field Preservation (DATA-06)**: Eliminated silent default values (e.g. 15.0 MW FRP, 310 K brightness) in `server/adapters/nasaFirms.ts`. Missing measurements are preserved as `null`.
- **Dynamic Coordinate Matching (DATA-07)**: Removed hardcoded Nilgiris default coordinates from news and weather routes. Weather requires explicit `lat`/`lng` parameters; news coordinates are bound dynamically to the queried AOI.
- **Purged Synthetic Route Fallbacks**: Removed synthetic ghat road curvature fallbacks from `server/services/routingService.ts`. OSRM router disruptions throw explicit 503 errors.

### Three-Level Sensor Architecture
- **Distinguished Three Product Layers**: Implemented `ProductLayer` enum supporting:
  1. `MODIS_1KM`: MODIS Terra & Aqua Collection 6.1 active fire.
  2. `VIIRS_750M`: VIIRS continuity-oriented active fire (M-band).
  3. `VIIRS_375M`: VIIRS high-resolution active fire (I-band).

### Research Interface & Governance Documentation
- **5-Workspace Scientific Interface**: Reorganized sidebar hierarchy in `src/App.tsx` into: (1) Observation Explorer (AOI), (2) Harmonisation Laboratory, (3) Burning Activity Calendar, (4) Observation Bias & Orbit, (5) Validation & Evidence.
- **New Governance Documents**: Created `DATA_SOURCES.md`, `VALIDATION_PROTOCOL.md`, and `EXPERIMENT_LOG.md`. Updated all existing documentation.

---

## [2.6.0] - 2026-11-01 - Trust Foundation & Scientific Integrity Rebuild (Upgrade Loop v4)

### Added
- **Cryptographic JWT Authentication (`server/auth/tokens.ts`)**: Built HMAC-SHA256 token generator and constant-time signature validator supporting standard claims (`sub`, `role`, `iss`, `aud`, `iat`, `exp`).
- **Endpoint `POST /api/auth/token`**: Issues signed tokens for canonical roles (`public_viewer`, `field_responder`, `incident_commander`, `system_administrator`).
- **PostgreSQL + PostGIS Persistence Layer (`server/db/`)**: Added `postgresClient.ts` and PostGIS schema migration `001_initial_schema.sql` featuring spatial GIST indexing on SRID 4326 geometries with atomic JSON fallback.
- **SGP4 Orbital Mechanics (`server/services/orbitalService.ts`)**: Integrated analytical SGP4 propagation (`satellite.js`) driven by real NORAD Two-Line Element (TLE) orbital sets, modeling $J_2$ Earth oblateness, atmospheric drag, and distinguishing LEO from Geostationary platforms.
- **Footprint Geometry Harmonisation (`src/shared/intelligenceEngine.ts`)**: Replaced arbitrary 0.015° clustering with scan and track pixel footprint ellipse intersection formulas:
  $$D_{12} \le \sqrt{a_1^2 + b_1^2} + \sqrt{a_2^2 + b_2^2}$$
- **Decoupled NASA FIRMS Raw Ingestion (`GET /api/observations`, `POST /api/firms/ingest`)**: Stores independent MODIS and VIIRS raw observation records preserving full scan/track pixel dimensions, brightness Kelvin, and pass timing without attaching to incidents.
- **Isolated Test Fixtures (`test/fixtures/baselineIncident.ts`)**: Strictly isolated test incident fixtures away from production code.
- **OWASP Security Headers**: Added nosniff, DENY frame options, and HSTS response headers via `securityHeadersMiddleware`.

### Changed
- **Purified Production Store (`server/db/store.ts`, `data/store.json`, `src/shared/dataAdapter.ts`)**: Eradicated all hardcoded emergency incidents (`INC-2026-0842`), fake weather snapshots, fake news articles, synthetic routes, and casualties. Initial operational state is 100% clean and truthful.
- **Empirical Fire Calendar (`src/shared/fireCalendarMath.ts`)**: Purged arbitrary fallback formulas and cross-region silent fallbacks. Unpopulated regions truthfully report zero burning records.
- **Frontend Empty States (`src/dashboard/`, `src/incidents/`, `src/evidence/`, `src/missions/`)**: Built elegant, crash-resistant empty state interfaces for command dashboards and 3D geospatial views when 0 active incidents are registered.
- **Automated Test Suite**: Expanded to 43 passing tests across RBAC security, data integrity, SGP4 propagation, raw FIRMS ingestion, and fire calendar math.

### Removed
- Removed legacy insecure prefix tokens (`commander-secret-token`).
- Removed all hardcoded production incidents and mock initializers.
- Removed arbitrary fixed-percentage FRP attenuation math.

---

## [2.5.0] - 2026-11-01 - Master Autonomous Codebase Transformation (Upgrade Loop v3)

### Removed
- **Drone Subsystem Purge (Rule 11)**: Completely eradicated all drone/UAV operational features, flight plan approvals, drone telemetry types, simulation toggles, and test fixtures across frontend and backend.
- **Simulated Telephony Auto-Advance (Rule 1 & 8)**: Removed `setTimeout` progression in `TelephonyService` that faked recipient call answers and unit commitments without live carrier connection.
- **Unsupported FRP Attenuation (Rule 14)**: Purged the ungrounded ~39% Terra MODIS FRP attenuation calculation.
- **Misleading Weather & News Fallbacks (Rule 3)**: Eliminated synthetic 30°C/25% humidity offline fallback in `weatherAdapter.ts` and hardcoded news articles.

### Added
- **Production Data Integrity Suite**: Added `test/dataIntegrity.test.ts` to block builds if forbidden mock datasets or fake timers appear in production code.
- **SGP4 Orbital Propagation & $J_2$ Nodal Precession**: Implemented real orbital mechanics accounting for Earth oblateness and documented Mean Local Solar Time (MLST) drift.
- **Resolution-Aware MODIS-VIIRS Harmonisation**: Footprint uncertainty ellipse matching replacing arbitrary distance clustering.
- **Genuine Historical Fire Calendar**: Aggregated empirical historical observation records with sensor-specific counts and observation density metrics.
- **Backend Role-Based Access Control (RBAC)**: Added authentication middleware requiring cryptographic tokens for state-modifying endpoints.
- **Persistent Loop Memory**: Created the 9 governance and tracking documents (`UPGRADE_STATE.md`, etc.).
