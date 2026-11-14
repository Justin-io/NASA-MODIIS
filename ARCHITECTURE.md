# ALEX System Architecture & Subsystem Boundaries — v2.7.0

**Version**: 2.7.0 (Real Scientific Data, Sensor Harmonisation & NASA Space Apps Research-Grade Reconstruction)  
**Architecture Style**: Modular Event-Driven Environmental Intelligence Platform with Relational-Spatial Persistence and Cryptographic Assurance  
**Compliance Standard**: NASA Earth Science Data and Information System (ESDIS) & Open Geospatial Consortium (OGC)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ALEX PRESENTATION & RESEARCH WORKSPACES                         │
│   React 19 + TypeScript + Vite + Tailwind CSS 4 + Three.js / React Three Fiber + D3   │
├──────────────────┬──────────────────┬──────────────────┬───────────────────────────────┤
│ 1. OBS EXPLORER  │ 2. HARMONISATION │ 3. FIRE CALENDAR │ 4. OBS BIAS & ORBIT           │
│ Real NASA FIRMS  │ 3-Level Science  │ Empirical Months │ SGP4 Propagation              │
│ AOI Bounding Box │ Footprint Ellipse│ Median Anomaly   │ Terra MLST Drift              │
│ Native Modalities│ Residual Math    │ Zero-Fallback    │ LEO vs GEO Regimes            │
├──────────────────┴──────────────────┴──────────────────┴───────────────────────────────┤
│ 5. VALIDATION & EVIDENCE GRAPH                                                         │
│ Independent Benchmarks (Landsat/Sentinel) + Causal Restraint + Provenance Inspector     │
└────────┬──────────────────┬──────────────────┬─────────────────────────┬───────────────┘
         │                  │                  │                         │
         ▼                  ▼                  ▼                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY, RBAC & CRYPTOGRAPHIC SECURITY                      │
│   Express / TS Gateway + HMAC-SHA256 JWT Auth + Fail-Closed RBAC + OWASP Security Hdr  │
│   Self-Service Capped to public_viewer; Elevated Roles Require ALEX_OPERATOR_SECRET    │
└────────┬──────────────────┬──────────────────┬─────────────────────────┬───────────────┘
         │                  │                  │                         │
         ▼                  ▼                  ▼                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               ALEX SERVICE SUBSYSTEMS                                  │
├──────────────────┬──────────────────┬──────────────────┬───────────────────────────────┤
│ ALEX SENSE       │ ALEX FIRE        │ ALEX ORBITAL     │ ALEX INTELLIGENCE             │
│ NASA FIRMS NRT   │ Footprint Ellipse│ SGP4 Propagation │ Server Verification Lifecycle │
│ Open-Meteo NWP   │ 3-Level Science  │ J2 Nodal Rates   │ Spatial Spread Isochrones     │
│ Multi-Feed Hub   │ Empirical History│ LEO / GEO Models │ Multi-Evidence Corroboration  │
├──────────────────┼──────────────────┼──────────────────┼───────────────────────────────┤
│ ALEX RESPONSE    │ ALEX COGNITION   │ ALEX COMMUNITY   │ ALEX HEALTH                   │
│ Dynamic Hazards  │ Empirical Bench  │ Field Reports    │ PostGIS & Provider Audits     │
│ Fail-Closed Twilio│ Model Promotion │ Public Bulletins │ Real-time SSE Diagnostic Bus  │
│ Resource Ledger  │ Immutable Ledger │ Tamper Ledger    │ SHA-256 Ledger Blockchain     │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴───────────────┬───────────────┘
         │                  │                  │                         │
         ▼                  ▼                  ▼                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PERSISTENCE & IMMUTABLE PROVENANCE TIER                         │
│  PostgreSQL 16 + PostGIS (SRID 4326) + Spatial GIST Indexes + Local Transactional Store│
│  Raw Observations (raw_observations) + Harmonised Events (harmonized_events)           │
│  SHA-256 Block-Chained Cryptographic Audit Event Ledger (data/ledger.jsonl)            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Subsystem Specifications

### 1. ALEX SENSE (NASA FIRMS & Multi-Source Observation Ingestion)
- **Three-Level Sensor Product Tracking**:
  - `MODIS_1KM`: MODIS Terra & Aqua Collection 6.1 active fire (~1 km nadir).
  - `VIIRS_750M`: VIIRS continuity-oriented active fire (M-band, 750 m constant resolution).
  - `VIIRS_375M`: VIIRS high-resolution active fire (I-band, 375 m nadir, $\le 750\text{ m}$ edge).
- **Immutable Raw Observation Schema**: Every record in `RawSatelliteObservation` stores:
  `id`, `sourceProvider`, `sourceProductId`, `productLayer`, `satellite`, `sensor`, `acquisitionTimestampUtc`, `lat`, `lng`, `frpMw`, `brightnessKelvin`, `scanKm`, `trackKm`, `modisConfidencePct`, `viirsConfidenceCategory`, `dayNight`.
- **Integrity Rule**: Missing values remain `null`; zero synthetic defaults. Categorical VIIRS confidences (`low`/`nominal`/`high`) are preserved natively.

### 2. ALEX FIRE (Footprint Harmonisation & Empirical Calendar)
- **Footprint-Aware Spatial-Temporal Association**: Replaced fixed 0.015° clustering with instantaneous field of view (IFOV) bounding ellipse intersection:
  $$a = \frac{\text{scanPixelKm} \times 1000}{2}, \quad b = \frac{\text{trackPixelKm} \times 1000}{2}$$
  $$D_{12} \le \sqrt{a_1^2 + b_1^2} + \sqrt{a_2^2 + b_2^2}$$
- **Pass Independence**: FRP is never averaged across distinct satellite overpasses. Instantaneous radiant power measurements are preserved separately per sensor.
- **Empirical Climatological Calendar**: Climatological medians are calculated exclusively from ingested observations using `computeEmpiricalMonthlyClimatology()`. Unmonitored AOIs truthfully report `dataAvailability: 'UNAVAILABLE'`.

### 3. ALEX ORBITAL (Orbital Ephemerides & SGP4 Propagation)
- **SGP4 Analytical Propagation**: Uses `satellite.js` driven by authentic NORAD Two-Line Element (TLE) parameter sets to compute TEME coordinates, Greenwich Mean Sidereal Time (GMST), and WGS-84 ellipsoidal geodetic coordinates.
- **Regime Differentiation**: Accurately distinguishes sun-synchronous polar LEO satellites (~705–824 km) from geostationary meteorological sentinels (~35,786 km, Himawari-9, GOES-16).
- **Terra MLST Drift Analysis**: Models the secular shift in Terra's equatorial crossing time from 10:30 AM to ~09:05 AM descending without arbitrary percentage attenuation multipliers.

### 4. ALEX SECURITY & CRYPTOGRAPHIC RBAC
- **HMAC-SHA256 Token Gateway**: Replaced unauthenticated role issuance with operator-secret gating. Self-service tokens are capped to `public_viewer`. Elevated operational roles require `ALEX_OPERATOR_SECRET`.
- **Constant-Time Verification**: Uses `crypto.timingSafeEqual` to prevent side-channel timing attacks on token signatures.
- **SHA-256 Chained Event Ledger**: Every state transition, incident mutation, and model promotion is immutably appended to `data/ledger.jsonl`.
