# ALEX Prioritised Engineering Backlog — v2.7.0

This backlog defines the architectural, cryptographic, geospatial, and scientific requirements governing the ALEX platform, ordered by strict dependency and risk.

---

### Priority 0 — Security, Data Integrity, and Authentication Rebuild
- **P0.1 [VERIFIED] Production Data Purification**:
  - *Defect Remediation*: Complete elimination of hardcoded production incidents (zero Nilgiris/Sigur emergency auto-seeding). Pure truthful empty states on blank database.
  - *Status*: **VERIFIED**. `server/db/store.ts` and `data/store.json` purified. Test fixtures strictly isolated in `test/fixtures/`. Contamination tests pass in `test/dataIntegrity.test.ts`.
- **P0.2 [VERIFIED] Authentication & RBAC Cryptographic Rebuild (SEC-01 & SEC-02)**:
  - *Defect Remediation*: Fixed privilege escalation on `POST /api/auth/token`. Only `public_viewer` is self-serviceable; elevated roles (`field_responder`, `incident_commander`, `system_administrator`) strictly require server-side `ALEX_OPERATOR_SECRET`.
  - *Status*: **VERIFIED**. Implemented in `server/auth/tokens.ts` and `server/index.ts`. All state-mutating endpoints protected by `requireRole`.
- **P0.3 [VERIFIED] Complete Drone / UAV Purge (Rule 11)**:
  - *Status*: **VERIFIED**. 0 drone/UAV operational terms across codebase, verified by automated regex scan.

---

### Priority 1 — Real Database & Scientific Data Provenance
- **P1.1 [VERIFIED] PostgreSQL + PostGIS Schema & Migrations**:
  - *Status*: **VERIFIED**. PostGIS SRID 4326 migration (`server/db/migrations/001_initial_schema.sql`) with spatial GIST indexes on raw observations, incidents, and harmonized events. Transactional connection manager in `server/db/postgresClient.ts`.
- **P1.2 [VERIFIED] Immutable Scientific Observation Schema**:
  - *Status*: **VERIFIED**. `RawSatelliteObservation` schema preserves source provider (`NASA_FIRMS`), source product ID, product layer, satellite, UTC acquisition timestamp, scan/track dimensions, brightness Kelvin, FRP, and native confidence.

---

### Priority 2 & 3 — Real NASA Acquisition & Three-Level Sensor Science
- **P2.1 [VERIFIED] NASA FIRMS Ingestion Rebuild (DATA-05 & DATA-06)**:
  - *Defect Remediation*: Eradicated artificial mapping of VIIRS confidence categories to numeric percentages (DATA-05). Missing measurements stored as `null` rather than defaulted (DATA-06).
  - *Status*: **VERIFIED**. Implemented in `server/adapters/nasaFirms.ts` with RFC 4180 CSV parser.
- **P3.1 [VERIFIED] Three-Level Sensor Framework (MODIS 1km, VIIRS 750m, VIIRS 375m)**:
  - *Status*: **VERIFIED**. Defined in `ProductLayer` enum. Explicitly models MODIS Collection 6.1 (1km nadir), VIIRS 750m continuity (M-band heritage), and VIIRS 375m high-resolution (I-band).

---

### Priority 4 & 5 — Footprint Harmonisation & Observation Effort
- **P4.1 [VERIFIED] Footprint-Aware Spatial-Temporal Association**:
  - *Status*: **VERIFIED**. Replaced simplistic distance clustering with physical IFOV bounding ellipse intersection in `src/shared/intelligenceEngine.ts`. Preserves sensor-specific FRP and counts. Labeled as "Harmonised Thermal Event Hypotheses".
- **P5.1 [VERIFIED] Observation Opportunity & Bias Model**:
  - *Status*: **VERIFIED**. Distinguishes hotspot counts from observation effort. Unobserved or cloudy passes are not fabricated; explicit `UNAVAILABLE` status for coverage denominator when uncalculated.

---

### Priority 6 & 7 — Cross-Sensor Calibration & Empirical Fire Calendar
- **P6.1 [VERIFIED] Empirical Cross-Sensor Calibration**:
  - *Status*: **VERIFIED**. Side-by-side native sensor statistics alongside harmonized metrics.
- **P7.1 [VERIFIED] Empirical Burning-Activity Calendar (DATA-01 & DATA-02)**:
  - *Defect Remediation*: Purged hardcoded historical fire observations and static medians from `fireObservationsData.ts`. Medians calculated empirically via `computeEmpiricalMonthlyClimatology()`.
  - *Status*: **VERIFIED**. Unpopulated AOIs report `dataAvailability: 'UNAVAILABLE'` without silent cross-region substitution. Verified in `test/fireCalendar.test.ts`.

---

### Priority 8 — Orbital Mechanics & SGP4 Propagation
- **P8.1 [VERIFIED] Analytical SGP4 Ephemerides**:
  - *Status*: **VERIFIED**. SGP4 propagation (`satellite.js`) driven by NORAD TLE parameters in `server/services/orbitalService.ts`. Differentiates LEO sun-synchronous platforms (~705-824 km) from geostationary monitors (~35,786 km, Himawari-9, GOES-16).
- **P8.2 [VERIFIED] Terra MLST Drift Science**:
  - *Status*: **VERIFIED**. Models equatorial crossing time drift from 10:30 AM to ~09:05 AM descending without arbitrary percentage attenuation multipliers.

---

### Priority 9 — Independent Validation & Model Governance
- **P9.1 [VERIFIED] Ground Truth Quarantine (DATA-03 & DATA-04)**:
  - *Defect Remediation*: Quarantined fabricated ground-truth dataset into `SYNTHETIC_TEST_CASES` for unit tests only. Purged hardcoded champion metrics (`4.1% error`).
  - *Status*: **VERIFIED**. Evaluation in unpopulated production returns `EVALUATION_BLOCKED`. Superior challenger models require human commander sign-off before promotion. Verified in `test/learning.test.ts`.

---

### Priority 10 & 11 — Environmental Context & AI Investigator
- **P10.1 [VERIFIED] Dynamic Coordinate Geographic Matching**:
  - *Defect Remediation*: Removed hardcoded Nilgiris default coordinates from news and weather routes (DATA-07).
  - *Status*: **VERIFIED**. Weather requires explicit `lat`/`lng` query params. News coordinates bound dynamically to queried AOI.
- **P11.1 [VERIFIED] Scientific AI Investigator Gating**:
  - *Status*: **VERIFIED**. AI conductor cites actual record IDs and timestamps; deterministic engines execute physical calculations.

---

### Priority 12 & 13 — Research Interface & Demonstration Delivery
- **P12.1 [VERIFIED] 5-Workspace Research Interface**:
  - *Status*: **VERIFIED**. Sidebar reorganized into: (1) Observation Explorer (AOI), (2) Harmonisation Laboratory, (3) Burning Activity Calendar, (4) Observation Bias & Orbit, (5) Validation & Evidence.
- **P13.1 [VERIFIED] Challenge Question Alignment**:
  - *Status*: **VERIFIED**. Demonstration addresses core research question: *"Are we observing more burning, or are changes in the satellite observing system influencing what we see?"*

---

### Priority 14 & 15 — Engineering, Release Control & Documentation
- **P14.1 [VERIFIED] 12 Comprehensive Scientific Documents**:
  - *Status*: **VERIFIED**. Created `DATA_SOURCES.md`, `VALIDATION_PROTOCOL.md`, `EXPERIMENT_LOG.md`. Updated `UPGRADE_STATE.md`, `UPGRADE_BACKLOG.md`, `ARCHITECTURE.md`, `SCIENTIFIC_METHODS.md`, `DATA_PROVENANCE.md`, `INTEGRATION_STATUS.md`, `SECURITY_AUDIT.md`, `TESTING_REPORT.md`, `CHANGELOG.md`, `README.md`.
- **P15.1 [VERIFIED] Full Verification Gate**:
  - *Status*: **VERIFIED**. 43/43 automated tests passing, 0 TypeScript errors, clean Vite production build. Synchronized to `/sdcard/Download/NASA/`.
