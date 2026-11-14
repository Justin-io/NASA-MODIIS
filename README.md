# ALEX: Autonomous Live Environmental eXpert (v2.8.0)

[![Test Suite](https://img.shields.io/badge/Tests-49%20Passed-success.svg)](TESTING_REPORT.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Verified-blue.svg)](tsconfig.json)
[![Security Standard](https://img.shields.io/badge/Security-HMAC--SHA256%20JWT%20RBAC-green.svg)](SECURITY_AUDIT.md)
[![Scientific Engine](https://img.shields.io/badge/Orbital-SGP4%20Perturbation-orange.svg)](SCIENTIFIC_METHODS.md)
[![NASA Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-MODIS%20%26%20VIIRS%20Harmonization-red.svg)](DATA_SOURCES.md)
[![Integrations](https://img.shields.io/badge/Integrations-15%20Providers-purple.svg)](INTEGRATION_STATUS.md)

**ALEX (Autonomous Live Environmental eXpert)** is a research-grade Earth-observation intelligence platform engineered specifically for the NASA Space Apps Challenge: **"Harmonization of MODIS and VIIRS Hot Spots."**

Built on strict scientific principles, ALEX eliminates synthetic mocks, enforces cryptographic provenance through an immutable SHA-256 event ledger, and answers the central remote sensing research question:
> *"Are we observing more burning, or are changes in the satellite observing system influencing what we see?"*

---

## Key Capabilities & Scientific Foundations

### 1. Three-Level Sensor Framework & Data Integrity
- **MODIS 1km (Level 1)**: Terra & Aqua Collection 6.1 active fire with scan-angle-dependent bowtie expansion (~1.0 km nadir to ~4.8 km edge).
- **VIIRS 750m Continuity (Level 2)**: M-band active fire product directly inheriting MODIS C6 algorithm logic, maintaining constant 750 m resolution across entire swath.
- **VIIRS 375m Enhanced Resolution (Level 3)**: I-band active fire product with onboard 3:1/2:1 pixel aggregation constraining swath-edge expansion to $\le 750\text{ m}$.
- **Strict Data Truthfulness**:
  - Missing measurements remain `null` — zero silent numeric defaulting.
  - VIIRS categorical confidences (`low`, `nominal`, `high`) preserved natively — zero synthetic percentage conversions.
  - Historical records computed dynamically via `computeEmpiricalMonthlyClimatology()`.

### 2. Multi-Model AI Reasoning Engine (Tier-3 Failover)
- **Primary Inference (Groq Pool)**: Multi-key rotation pool (`GROQ_API_KEY`, `groq1`, `groq2`, `groq3`) running `llama-3.3-70b-versatile` with automatic round-robin and rate-limit mitigation.
- **Secondary Inference (Google Gemini)**: Multimodal reasoning via `gemini-2.0-flash` activated automatically upon Groq pool exhaustion.
- **Tertiary Inference (OpenRouter)**: Multi-model emergency fallback across 435+ models (`meta-llama/llama-3.3-70b-instruct`).

### 3. Footprint-Aware Spatial-Temporal Association
- **Physical Bounding Ellipses**: Replaced arbitrary Euclidean radius clustering with instantaneous field of view (IFOV) ellipse intersection:
  $$a = \frac{\text{scanPixelKm} \times 1000}{2}, \quad b = \frac{\text{trackPixelKm} \times 1000}{2}$$
  $$D_{12} \le \sqrt{a_1^2 + b_1^2} + \sqrt{a_2^2 + b_2^2}$$
- **Multi-Temporal Pass Independence**: Distinct overpasses represent discrete thermodynamic states; FRP is never averaged across passes.
- **Hypothesis Labeling**: Associated clusters are labeled as *"Harmonised Thermal Anomaly Hypotheses"*, strictly distinguishing satellite detections from verified fire perimeters.

### 4. Telemetry, Alerts & Aerial Asset Tracking
- **Telegram Bot Dispatch**: Automated formatted HTML emergency dispatches with active fire locations, coordinates, and priority evacuation routes.
- **OpenSky Network ADS-B Tracking**: Real-time identification of aerial suppression assets (air tankers, helitack helicopters, lead planes).
- **ESA Copernicus Data Space**: Sentinel-2 MSI optical and Sentinel-1 SAR change detection for burned area delineations and NDVI/NBR proxies.
- **Notion Intelligence DB**: Automated synchronization of incident briefings and tactical action items to team Notion workspaces.
- **GitHub Sovereign Audit**: Cryptographic ledger integrity verification notes and commit receipts synced to GitHub.

---

## Environment Configuration

Copy `.env.example` to `.env` and configure credentials:

```env
# ── AI Reasoning Pool ───────────────────────────────────────────
GROQ_API_KEY=gsk_...
groq1=gsk_...
groq2=gsk_...
groq3=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
GEMINI_API_KEY=AIzaSy...

# ── Geospatial & Satellites ─────────────────────────────────────
NASA_FIRMS_MAP_KEY=your_firms_key
FIRMS_MAP_KEY=your_firms_key
GOOGLE_MAPS_API_KEY=AIzaSy...
MAPS_API_KEY=AIzaSy...
COPERNICUS_CLIENT_ID=sh-...
COPERNICUS_CLIENT_SECRET=...
OPENSKY_USERNAME=...
OPENSKY_PASSWORD=...

# ── Communications & Audit ──────────────────────────────────────
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
NOTION_API_KEY=ntn_...
NOTION_DATABASE_ID=...
GITHUB_TOKEN=github_pat_...
GITHUB_DEFAULT_OWNER=Justin-io

# ── Security & Authentication ───────────────────────────────────
ALEX_AUTH_SECRET=your_32_char_signing_secret
ALEX_OPERATOR_SECRET=your_operator_clearance_secret
SERVER_PORT=3001
ALEX_PUBLIC_URL=http://localhost:3001
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## Quickstart & Operational Commands

```bash
# 1. Typecheck & verification
npm run lint

# 2. Run automated test suite (49 passing tests)
npm test

# 3. Production build
npm run build

# 4. Start production server (runs on port 3001)
npm run server
```

---

## Governance & Verification Documents
- [`INTEGRATION_STATUS.md`](INTEGRATION_STATUS.md): External provider health registry and authentication matrix.
- [`UPGRADE_STATE.md`](UPGRADE_STATE.md): Formal verification gates and release status.
- [`ARCHITECTURE.md`](ARCHITECTURE.md): Full architectural diagrams and subsystem contracts.
- [`DATA_SOURCES.md`](DATA_SOURCES.md): Authoritative Earth observation product catalogue.
- [`SCIENTIFIC_METHODS.md`](SCIENTIFIC_METHODS.md): Footprint math, SGP4 orbital mechanics, and MLST formulas.
- [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md): Cryptographic token design and OWASP compliance.
