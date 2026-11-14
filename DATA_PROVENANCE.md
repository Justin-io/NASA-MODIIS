# ALEX Data Provenance & Verification Contracts — v2.7.0

Every observation ingested, processed, or presented by ALEX must satisfy strict provenance traceability and zero-fabrication guarantees per the v2.7.0 trust foundation.

---

## 1. Provenance Schema Contract (`RawSatelliteObservation`)

Every raw satellite observation record maintains the following metadata structure across PostgreSQL/PostGIS and application memory:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique immutable identifier (e.g. `FIRMS-VIIRS_NOAA20_NRT-42-2026-10-31`) |
| `sourceProvider` | `'NASA_FIRMS'` | Authoritative upstream provider |
| `sourceProductId` | `string` | Specific product code (`MODIS_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `VIIRS_SNPP_NRT`) |
| `productLayer` | `'MODIS_1KM' \| 'VIIRS_750M' \| 'VIIRS_375M'` | Exact spatial and radiometric resolution layer |
| `satellite` | `string` | Spacecraft identity (`Terra`, `Aqua`, `N20`, `N21`, `NPP`) |
| `sensor` | `'MODIS' \| 'VIIRS'` | Instrument family |
| `acquisitionTimestampUtc` | `string (ISO-8601)` | Precise satellite scan acquisition epoch in UTC |
| `ingestionTimestampUtc` | `string (ISO-8601)` | Epoch when ALEX ingested and validated the record |
| `lat` / `lng` | `number` (WGS84 EPSG:4326) | Geodetic coordinates / PostGIS `GEOMETRY(Point, 4326)` |
| `frpMw` | `number \| null` | Fire Radiative Power in MW (null if absent in source; **never** defaulted) |
| `brightnessKelvin` | `number \| null` | 4 $\mu\text{m}$ brightness temperature in Kelvin (null if missing) |
| `brightness2Kelvin` | `number \| null` | 11 $\mu\text{m}$ background brightness temperature in Kelvin |
| `scanKm` / `trackKm` | `number \| null` | Ground pixel footprint dimensions accounting for scan angle expansion |
| `modisConfidencePct` | `number \| null` | Native MODIS integer scalar (0–100%) |
| `viirsConfidenceCategory` | `'low' \| 'nominal' \| 'high' \| null` | Native VIIRS categorical confidence (**never** converted to arbitrary %) |
| `dayNight` | `'D' \| 'N' \| null` | Solar illumination condition during overflight |
| `version` | `string \| null` | Upstream algorithm and calibration version (e.g. `6.1NRT`, `2.0NRT`) |

---

## 2. Server-Controlled Verification Lifecycle (Rule P0.3)

In accordance with Non-Negotiable Rule 5 & P0.3, transitions between verification states are controlled exclusively by the backend state machine with transition provenance recorded in the SHA-256 ledger:
- `OBSERVED`: Raw satellite or instrument detection directly from upstream provider without human or field confirmation.
- `REPORTED`: Inbound field ranger report or community submission awaiting corroboration.
- `INFERRED`: Derived analytical projection (e.g. Rothermel elliptical fire spread contour).
- `MODELLED`: Numerical weather prediction (NWP) or simulated counterfactual scenario.
- `CORROBORATED`: Multi-sensor or multi-modal spatial-temporal agreement (e.g. VIIRS + MODIS + AWS weather vector).
- `VERIFIED_BY_AUTHORITY`: Formally confirmed by authorized District Incident Commander or EOC order.
- `SUPERSEDED`: Replaced by a more recent overpass or ground ranger boundary update.
- `INVALIDATED`: Rejected as false alarm (e.g. industrial quarry glint, thermal reflection).
- `UNAVAILABLE`: Provider offline, unconfigured, or lacking credentials. Missing data remains explicitly missing; zero synthetic defaults.

---

## 3. Decoupled Observation Repository (Rule P2.1)
- NASA FIRMS observations are stored in an independent `rawObservations` repository (`raw_observations` PostGIS table), completely decoupled from incidents.
- No observation is ever silently attached to a default or pre-seeded incident.
- Candidate incidents are formed strictly through footprint-aware spatial-temporal clustering hypotheses.

---

## 4. Immutability & Audit Trail
- Raw ingested records are strictly immutable.
- Harmonized associations, cluster hypotheses, and incident linkages create new derived entities referencing parent raw record IDs with complete audit logging in the SHA-256 event ledger (`data/ledger.jsonl`).
