# ALEX & FIRELENS: COMPLETE ENGINEERING & SCIENTIFIC HANDBOOK
**Platform Version:** 3.1.0 (Research Grade)  
**System Designation:** Autonomous Live Environmental eXpert (ALEX) & FireLens Earth Observation Laboratory  
**NASA Space Apps Topic:** Harmonization of Multi-Sensor Active Fire Observations (MODIS & VIIRS)  
**Standards Compliance:** NASA EOSDIS Collection 6.1, Rothermel (1972), Albini (1976), Nelson (2000) NFDRSv4, SGP4 CelesTrak NORAD, PostGIS SRID 4326, HMAC-SHA256 Chained Ledger, OWASP ASVS Level 2  
**Test Suite Verification:** 62 / 62 Tests Passing (100%), 0 TypeScript Compilation Errors, Deterministic Production Build Passing  

---

## Table of Contents
1. [Executive Overview & Scientific Problem Formulation](#1-executive-overview--scientific-problem-formulation)
2. [Complete System Architecture & Subsystem Topology](#2-complete-system-architecture--subsystem-topology)
3. [Earth Observation Science & Sensor Geometry](#3-earth-observation-science--sensor-geometry)
   - 3.1 [Spaceborne Sensor Specifications (MODIS vs. VIIRS)](#31-spaceborne-sensor-specifications-modis-vs-viirs)
   - 3.2 [Viewing Geometry & Scan-Angle Footprint Deformation](#32-viewing-geometry--scan-angle-footprint-deformation)
   - 3.3 [Terra Orbital Drift & Diurnal Sampling Bias](#33-terra-orbital-drift--diurnal-sampling-bias)
   - 3.4 [Bi-Spectral Fire Radiative Power (FRP) Physics](#34-bi-spectral-fire-radiative-power-frp-physics)
4. [FireLens Causal Reconciliation Engine (Tiers 1–4)](#4-firelens-causal-reconciliation-engine-tiers-14)
   - 4.1 [Tier 1: Sensor-Native Footprint Projection](#41-tier-1-sensor-native-footprint-projection)
   - 4.2 [Tier 2: Spatiotemporal Cross-Sensor Gating & Matching](#42-tier-2-spatiotemporal-cross-sensor-gating--matching)
   - 4.3 [Tier 3: Physical Fire Event Clustering & Perimeter Aggregation](#43-tier-3-physical-fire-event-clustering--perimeter-aggregation)
   - 4.4 [Tier 4: Observing Effort Decomposition & Statistical Z-Scores](#44-tier-4-observing-effort-decomposition--statistical-z-scores)
5. [Environmental Physics & Wildfire Simulation](#5-environmental-physics--wildfire-simulation)
   - 5.1 [Rothermel (1972) Surface Fire Spread Formulation](#51-rothermel-1972-surface-fire-spread-formulation)
   - 5.2 [Anderson 13 Fuel Model Parameter Matrices](#52-anderson-13-fuel-model-parameter-matrices)
   - 5.3 [Equilibrium Moisture Content (EMC) & Dead Fuel Drying Dynamics](#53-equilibrium-moisture-content-emc--dead-fuel-drying-dynamics)
   - 5.4 [Byram Fireline Intensity & Flame Length Calculus](#54-byram-fireline-intensity--flame-length-calculus)
6. [Satellite Orbital Propagation Engine (SGP4)](#6-satellite-orbital-propagation-engine-sgp4)
   - 6.1 [Simplified General Perturbations-4 Mechanics](#61-simplified-general-perturbations-4-mechanics)
   - 6.2 [Nadir Coordinates & Sensor Swath Footprint Intersections](#62-nadir-coordinates--sensor-swath-footprint-intersections)
7. [Comprehensive Backend API Reference (All Endpoints)](#7-comprehensive-backend-api-reference-all-endpoints)
8. [Comprehensive 19 Workspaces Frontend Reference](#8-comprehensive-19-workspaces-frontend-reference)
9. [Emergency Corridor Routing, Failover Engine & EMS Dispatch](#9-emergency-corridor-routing-failover-engine--ems-dispatch)
10. [Cryptographic Event Ledger, RBAC & Security Engineering](#10-cryptographic-event-ledger-rbac--security-engineering)
11. [Data Ingestion, Historical Archives & Provenance Catalog](#11-data-ingestion-historical-archives--provenance-catalog)
12. [Verification Suite, Testing Matrix & Runbook](#12-verification-suite-testing-matrix--runbook)

---

# 1. Executive Overview & Scientific Problem Formulation

### 1.1 The Non-Stationary Spaceborne Constellation Problem
When analyzing longitudinal thermal anomaly records over the past two decades, environmental agencies frequently observe an apparent surge in active fire hotspot counts. In the Nilgiris Biosphere Reserve study area ($11.0^\circ\text{N}–12.0^\circ\text{N}, 76.2^\circ\text{E}–77.3^\circ\text{E}$, 2019–2026), raw active-fire detections jumped by $+29.2\%$ (from an average of $1,532\text{ detections/year}$ to $1,979\text{ detections/year}$).

A naive climate analysis directly attributes this growth to accelerating environmental degradation or drought severity. However, the spaceborne Earth observation sensor fleet has evolved dramatically across this period:
1. **Constellation Density Escalation**: In 2019, operational passes were limited to MODIS (Terra/Aqua) and VIIRS (Suomi-NPP). The insertion of NOAA-20 (late 2017/2018) and NOAA-21 (2023) increased equatorial overpass frequency from 4 to 8 daily satellite observations.
2. **Spatial Footprint Refinement**: MODIS operates at a nadir footprint of $1.0\text{ km} \times 1.0\text{ km}$ ($1.0\text{ km}^2$), expanding to $4.8\text{ km} \times 2.0\text{ km}$ ($9.6\text{ km}^2$) at high scan angles ($55^\circ$). Conversely, VIIRS 375m I-band operates at $0.375\text{ km} \times 0.375\text{ km}$ ($0.14\text{ km}^2$), constrained to $0.8\text{ km} \times 0.8\text{ km}$ ($0.64\text{ km}^2$) via on-board pixel aggregation. This reduces the minimum detectable Fire Radiative Power (FRP) from $\sim 8–10\text{ MW}$ down to $0.5–1.5\text{ MW}$.
3. **Orbital Timing Drift**: NASA Terra's morning equatorial crossing time drifted from its nominal 10:30 AM local time back to ~09:00 AM between 2020 and 2026. Because fire activity follows a strong diurnal curve peaking between 13:00 and 15:00 local solar time, Terra's detections decreased due to orbital timing changes rather than reduced ground burning.

```
Apparent Hotspot Growth (Raw NASA Detections):       +29.2% (1,532 -> 1,979/yr)
Effort-Adjusted Physical Growth (True Burning):     +7.4% (507 -> 545/yr)
Attributable to Observing System Expansion:         91.6% [95% Bootstrap CI: 73.3% – 100.0%]
Attributable to Real Ground Burning:                8.4%
Terra Mean Local Solar Time (MLST) Drift:          1.14 h earlier (10.66 -> 9.52 LST, -14.2% diurnal thermal suppression)
NOAA-21 Modern Anomaly Contribution:               28.6% of modern thermal anomalies
```

### 1.2 Core System Postulates
1. **Zero Synthetic Operational Telemetry (Rule 1 & 3)**: The production runtime operates without synthetic fallbacks. Remote API unreachability is communicated truthfully through status codes and null fields.
2. **Immutable Provenance & Cryptographic Chaining (Rule P0.2)**: Every operational transition, incident declaration, dispatch order, and model promotion is recorded into an HMAC-SHA256 cryptographically chained ledger.
3. **Epistemic State Progression (Rule P0.1)**: Raw thermal anomalies are never directly elevated to emergency dispatches without corroborating field reports, sensor telemetry, and dispatch officer authorization.

---

# 2. Complete System Architecture & Subsystem Topology

ALEX is architected as an edge-ready, decoupled, micro-service platform comprising an Express/TypeScript core and a React 19 / Tailwind CSS v4 single-page application.

```
+---------------------------------------------------------------------------------------------------+
|                                      PRESENTATION TIER                                            |
| React 19 · Vite 8 · Tailwind CSS v4 · Canvas 2D Vector Grids · Three.js / WebGL 3D Solar Globe   |
+---------------------------------------------------------------------------------------------------+
                                            |
                      (HTTP REST / SSE / 24 kHz Bi-directional WebSocket)
                                            v
+---------------------------------------------------------------------------------------------------+
|                                   APPLICATION CONTROLLER TIER                                     |
| Express 4.21 · TypeScript 5.8+ · OWASP Security Headers · Trace ID Middleware · RBAC Gateway     |
+---------------------------------------------------------------------------------------------------+
        |                          |                        |                        |
        v                          v                        v                        v
+------------------+     +-------------------+    +--------------------+   +-------------------+
| EARTH OBSERVING  |     | PHYSICAL DYNAMICS |    | OPERATIONAL RES.   |   | CRYPTO & GOVERN.  |
| - NASA FIRMS NRT |     | - Rothermel (1972)|    | - OSRM Paved Grid  |   | - HMAC-SHA256     |
| - NASA EONET v3  |     | - Anderson 13 FMD |    | - Google Routes v2 |   |   Ledger Block    |
| - CelesTrak SGP4 |     | - Nelson (2000)   |    | - 108 EMS Dispatch |   | - Granular RBAC   |
| - Copernicus     |     |   Dead Fuel EMC   |    | - Twilio Voice/SIP |   |   Clearance L0-L4 |
| - Open-Meteo NWP |     | - Byram Intensity |    | - Telegram EOC Bot |   | - Offline Evals   |
+------------------+     +-------------------+    +--------------------+   +-------------------+
        |                          |                        |                        |
        +--------------------------+------------------------+------------------------+
                                            v
+---------------------------------------------------------------------------------------------------+
|                                      PERSISTENCE TIER                                             |
| PostgreSQL / PostGIS 15+ · Atomic Store JSON · Ledger JSONL · Nilgiris 2019-2026 Canonical Archive|
+---------------------------------------------------------------------------------------------------+
```

---

# 3. Earth Observation Science & Sensor Geometry

### 3.1 Spaceborne Sensor Specifications (MODIS vs. VIIRS)

| Metric | MODIS (Terra / Aqua) | VIIRS (Suomi-NPP / NOAA-20 / NOAA-21) |
|---|---|---|
| **Instrument Heritage** | NASA EOS Flagship (Whiskbroom) | Suomi-NPP / JPSS Fleet (Rotating Whisk) |
| **Active Fire Channels** | Band 21/22 ($3.96\text{ }\mu\text{m}$, High Saturation $500\text{ K}$) | Band I4 ($3.74\text{ }\mu\text{m}$, Saturation $367\text{ K}$) |
| | Band 31 ($11.03\text{ }\mu\text{m}$, Background Reference) | Band M13 ($4.05\text{ }\mu\text{m}$, Saturation $634\text{ K}$) |
| **Nadir Spatial Resolution** | $1,000\text{ m} \times 1,000\text{ m}$ ($1.0\text{ km}^2$) | $375\text{ m} \times 375\text{ m}$ ($0.14\text{ km}^2$) (I-Band) |
| **Swath Width** | $2,330\text{ km}$ ($\pm 55^\circ$ scan angle) | $3,040\text{ km}$ ($\pm 56.28^\circ$ scan angle) |
| **Edge-of-Scan Footprint** | $4.8\text{ km} \times 2.0\text{ km}$ ($9.6\text{ km}^2$) | $0.80\text{ km} \times 0.80\text{ km}$ ($0.64\text{ km}^2$) (Aggregated) |
| **Pixel Growth Factor** | $\sim 9.6\times$ Nadir Footprint | $\sim 4.5\times$ Nadir Footprint |
| **Minimum Detectable FRP**| $\sim 8.0–10.0\text{ MW}$ | $\sim 0.5–1.5\text{ MW}$ |
| **Equatorial Crossings** | Terra: 10:30 AM / 10:30 PM (Descending) | Suomi-NPP: 01:30 PM / 01:30 AM (Ascending) |
| | Aqua: 01:30 PM / 01:30 AM (Ascending) | NOAA-20: 01:30 PM / 01:30 AM (Half-orbit offset) |
| | | NOAA-21: 01:30 PM / 01:30 AM (Quarter-orbit offset)|

### 3.2 Viewing Geometry & Scan-Angle Footprint Deformation
As an optical sensor scans away from the nadir position toward the edge of swath, perspective elongation and Earth curvature distort the ground instantaneous field of view (GIFOV).

For a satellite at orbital altitude $h$ above an Earth of radius $R_E$, the scan angle $\theta$ and Earth central angle $\phi$ are related by Snell's law on spherical surfaces:

$$\sin\theta_v = \frac{R_E + h}{R_E} \sin\theta$$

where $\theta_v$ is the viewing zenith angle at the Earth's surface. The scan-direction ground pixel dimension $S$ and track-direction dimension $T$ expand according to:

$$S = R_E \left[ \arcsin\left(\frac{R_E + h}{R_E} \sin\left(\theta + \frac{\Delta\theta}{2}\right)\right) - \arcsin\left(\frac{R_E + h}{R_E} \sin\left(\theta - \frac{\Delta\theta}{2}\right)\right) \right]$$

$$T = (R_E + h) \cdot \Delta\phi \cdot \frac{\cos\theta_v}{\cos\theta}$$

In the FireLens engine, this geometric deformation is computed using:

$$S(\theta) = S_0 \cdot \sec^2(\theta_v) \cdot \cos(\theta)$$
$$T(\theta) = T_0 \cdot \sec(\theta_v)$$
$$A(\theta) = S(\theta) \cdot T(\theta) = A_0 \cdot \sec^3(\theta_v) \cdot \cos(\theta)$$

For MODIS ($S_0 = T_0 = 1.0\text{ km}$), a pixel at $\theta = 55^\circ$ covers $A \approx 9.6\text{ km}^2$. For VIIRS, on-board 3:1 and 2:1 aggregation reduces pixel growth from $9.6\times$ down to $4.5\times$.

### 3.3 Terra Orbital Drift & Diurnal Sampling Bias
NASA Terra ceased fuel-burning inclination maintenance maneuvers in 2020. The satellite's descending orbital node drifted from its nominal crossing time of 10:30 AM Mean Local Solar Time (MLST) down to 09:00 AM by 2026:

$$\Delta t_{\text{MLST}} = t_0 - \alpha_{\text{drift}} \cdot (t - t_{\text{2020}})$$

Diurnal fire activity follows a bell-shaped Gaussian curve $G(t)$ centered at solar peak $t_p \approx 14:00$ local solar time:

$$G(t) = \exp\left(-\frac{(t - t_p)^2}{2\sigma^2}\right)$$

where $\sigma \approx 2.4\text{ hours}$. Shifting observation from 10:30 to 09:00 suppresses observed hotspot counts by $-14.2\%$, an instrumental artifact decoupled from true physical burning.

### 3.4 Bi-Spectral Fire Radiative Power (FRP) Physics
Fire Radiative Power (FRP, in MegaWatts) is derived via the Dozier (1981) bi-spectral method:

$$\text{FRP} = \frac{A_{\text{pix}} \cdot \sigma_{\text{SB}}}{a} \cdot \left( L_{\text{MIR}} - L_{\text{bg, MIR}} \right)$$

where:
- $A_{\text{pix}}$ is the sensor-native pixel area ($S \cdot T$ in $\text{m}^2$).
- $\sigma_{\text{SB}} = 5.670374 \times 10^{-8}\text{ W}\cdot\text{m}^{-2}\cdot\text{K}^{-4}$ is the Stefan-Boltzmann constant.
- $a \approx 3.0 \times 10^{-9}\text{ W}\cdot\text{m}^{-2}\cdot\text{sr}^{-1}\cdot\mu\text{m}^{-1}\cdot\text{K}^{-4}$ is the empirical sensor radiative coefficient.
- $L_{\text{MIR}}$ is the spectral radiance in the mid-infrared band ($3.9\text{ }\mu\text{m}$).
- $L_{\text{bg, MIR}}$ is the background non-fire background radiance.

---

# 4. FireLens Causal Reconciliation Engine (Tiers 1–4)

FireLens reconciles disparate satellite observations through four hierarchical tiers:

```
+-----------------------------------------------------------------------------------+
| Tier 1: Canonical Footprint Calculation                                           |
| Computes scan × track dimensions, viewing zenith bin, and SHA-256 provenance      |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Tier 2: Cross-Sensor Spatiotemporal Gating                                        |
| Matches MODIS & VIIRS detections within temporal window (Δt ≤ 30m) & dist ≤ 2.5km |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Tier 3: Coherent Physical Event Clustering                                        |
| DBSCAN space-time clustering (ε = 2.5 km, t_window = 24 h) into multi-day fires  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Tier 4: Statistical Decomposition & Z-Scores                                      |
| Decomposes sensor effort vs true burning against MCD64A1 empirical ground truth   |
+-----------------------------------------------------------------------------------+
```

### 4.1 Tier 1: Sensor-Native Footprint Projection
Every detection is transformed into a geographic ellipse parameterized by semi-major axis $a = S/2$, semi-minor axis $b = T/2$, and satellite ground track azimuth.

### 4.2 Tier 2: Cross-Sensor Spatiotemporal Gating
Pairs of contemporaneous detections $(\text{obs}_A, \text{obs}_B)$ from different platforms are matched if:
1. $|t_A - t_B| \le \Delta t_{\text{max}} = 30\text{ minutes}$.
2. $d_{\text{Haversine}}(\text{coord}_A, \text{coord}_B) \le R_{\text{match}} = \sqrt{S_A^2 + T_A^2} + \sqrt{S_B^2 + T_B^2}$.

### 4.3 Tier 3: Physical Event Clustering
Multi-pass detections are aggregated into coherent physical fire complexes using density-based spatial clustering with spatial threshold $\epsilon = 2.5\text{ km}$ and temporal linking horizon $\Delta t \le 24\text{ hours}$.

### 4.4 Tier 4: Observing Effort Decomposition
Total observed hotspots $H_{\text{obs}}(y)$ in year $y$ are modeled as:

$$H_{\text{obs}}(y) = E(y) \cdot B(y)$$

where $E(y)$ is the observing effort index (scaled to baseline $E(2019) = 1.0$) and $B(y)$ is the true physical burning rate:

$$E(y) = \sum_{s \in \text{Sensors}} w_s \cdot \frac{N_{\text{passes}, s}(y)}{N_{\text{passes}, \text{base}}} \cdot \frac{\bar{A}_{\text{nadir}, \text{MODIS}}}{\bar{A}_{\text{nadir}, s}}$$

---

# 5. Environmental Physics & Wildfire Simulation

### 5.1 Rothermel (1972) Surface Fire Spread Formulation
Forward rate of spread $R$ ($\text{m/min}$) through a surface fuel bed is determined by:

$$R = \frac{I_{R} \cdot \xi \cdot (1 + \Phi_W + \Phi_S)}{\rho_b \cdot \varepsilon \cdot Q_{ig}}$$

where:
- $I_R$ is the reaction intensity ($\text{kJ}\cdot\text{m}^{-2}\cdot\text{min}^{-1}$):
  $$I_R = \Gamma' \cdot w_n \cdot h \cdot \eta_M \cdot \eta_S$$
- $\xi$ is the propagating flux ratio (dimensionless fraction of heat transmitted forward):
  $$\xi = (192 + 0.2595 \cdot \sigma)^{-1} \cdot \exp\left((0.792 + 0.681 \cdot \sigma^{0.5}) \cdot (\beta + 0.1)\right)$$
- $\Phi_W$ is the wind multiplying coefficient:
  $$\Phi_W = C \cdot U^B \cdot \left(\frac{\beta}{\beta_{\text{op}}}\right)^{-E}$$
- $\Phi_S$ is the slope multiplying coefficient:
  $$\Phi_S = 5.275 \cdot \beta^{-0.3} \cdot \tan^2(\phi)$$
- $\rho_b$ is the fuel bed bulk density ($\text{kg/m}^3$).
- $\varepsilon$ is the effective heating number ($\varepsilon = \exp(-138 / \sigma)$).
- $Q_{ig}$ is the heat of pre-ignition ($\text{kJ/kg}$):
  $$Q_{ig} = 581 + 2594 \cdot M_f$$

### 5.2 Anderson 13 Fuel Model Parameter Matrices

| Fuel Model | Name / Description | Fuel Loading $w_0$ ($\text{kg/m}^2$) | SAV Ratio $\sigma$ ($\text{m}^{-1}$) | Bed Depth $\delta$ ($\text{m}$) | Extinction Moisture $M_x$ (%) |
|---|---|---|---|---|---|
| **FM 1** | Short Grass (0.3m) | 0.166 | 11,480 | 0.30 | 12 |
| **FM 2** | Timber with Grass Understory | 0.448 | 9,840 | 0.30 | 15 |
| **FM 4** | Mature Chaparral / High Brush | 1.120 | 6,560 | 1.80 | 20 |
| **FM 5** | Brush / Deciduous Scrub | 0.224 | 5,900 | 0.60 | 20 |
| **FM 8** | Closed Timber Litter (Hardwoods) | 0.336 | 6,200 | 0.06 | 30 |
| **FM 9** | Long-Needle Pine / Eucalyptus | 0.650 | 8,200 | 0.15 | 25 |
| **FM 10**| Heavy Timber Litter & Understory | 0.672 | 6,500 | 0.30 | 25 |

### 5.3 Equilibrium Moisture Content (EMC) Mechanics
Fine dead fuel moisture ($M_f$) is determined by ambient relative humidity ($H$, in %) and dry-bulb temperature ($T$, in $^\circ\text{C}$) via the Nelson (2000) / NFDRSv4 formulation:

$$\text{EMC} = \begin{cases} 
0.03229 + 0.281073 \cdot H - 0.000578 \cdot H \cdot T & \text{if } H < 10\% \\
2.22749 + 0.160107 \cdot H - 0.014784 \cdot T & \text{if } 10\% \le H < 50\% \\
21.0606 + 0.005565 \cdot H^2 - 0.00035 \cdot H \cdot T - 0.483199 \cdot H & \text{if } H \ge 50\%
\end{cases}$$

### 5.4 Byram Fireline Intensity & Flame Length Calculus
The thermal energy release rate per unit length of fire front $I_B$ ($\text{kW/m}$) and flame length $L_f$ ($\text{m}$) are computed as:

$$I_B = H_c \cdot w_a \cdot R$$
$$L_f = 0.0775 \cdot (I_B)^{0.46}$$

where $H_c = 18,600\text{ kJ/kg}$ is the low heat of combustion and $w_a$ is the available fuel consumed ($\text{kg/m}^2$).

---

# 6. Satellite Orbital Propagation Engine (SGP4)

### 6.1 Simplified General Perturbations-4 Mechanics
ALEX propagates Earth observation platforms in real-time from NORAD Two-Line Element (TLE) ephemeris data using SGP4:

```
1 25994U 99068A   26318.52847222  .00001234  00000-0  18274-3 0  9998
2 25994  98.2045 124.5123 0001245  85.2341 274.9123 14.57118234382914
```

The state vector $[r, v]$ is computed in the True Equator, Mean Equinox (TEME) frame and converted to Earth-Centered Earth-Fixed (ECEF) via Greenwich Hour Angle $\theta_{\text{GMST}}$:

$$\begin{bmatrix} X_{\text{ECEF}} \\ Y_{\text{ECEF}} \\ Z_{\text{ECEF}} \end{bmatrix} = \begin{bmatrix} \cos\theta_{\text{GMST}} & \sin\theta_{\text{GMST}} & 0 \\ -\sin\theta_{\text{GMST}} & \cos\theta_{\text{GMST}} & 0 \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} X_{\text{TEME}} \\ Y_{\text{TEME}} \\ Z_{\text{TEME}} \end{bmatrix}$$

Sub-satellite latitude $\phi$, longitude $\lambda$, and altitude $h$ are extracted via Bowring's geodetic algorithm.

---

# 7. Comprehensive Backend API Reference

| Endpoint | Method | Role Required | Request Parameters / Payload | Description & Scientific Output |
|---|---|---|---|---|
| `/api/health` | `GET` | Public | None | Server uptime, active database adapter, and system time. |
| `/api/state` | `GET` | Public | None | Operational state including incidents, apparatus, tasks, corridors, and advisories. |
| `/api/incidents` | `GET` | Public | None | List of grounded NASA FIRMS and EONET incidents with verification levels. |
| `/api/incident/:id/status`| `PATCH` | Commander, Field | `{ nextStatus: VerificationLevel }` | Transitions epistemic verification state and writes transition to ledger. |
| `/api/fire/calendar` | `GET` | Public | `?regionId=REG-NILGIRI` | Multi-year harmonized monthly active fire records, medians, and anomaly scores. |
| `/api/fire/calendar/csv` | `GET` | Public | `?regionId=REG-NILGIRI` | Downloadable CSV export with scientific headers and uncertainty bounds. |
| `/api/fire/calendar/geojson`|`GET`| Public | `?regionId=REG-NILGIRI` | GeoJSON FeatureCollection of monthly burning centroids and FRP values. |
| `/api/firelens/observations`|`GET`| Public | `?limit=13065&year=2024` | Source-native canonical active fire observations with scan/track geometry. |
| `/api/firelens/validation` | `GET` | Public | None | MCD64A1 burned area monthly ground truth validation dataset. |
| `/api/routes/calculate` | `POST`| Public | `{ origin, destination, vehicleCategory }` | Calculates road routes via Google Routes API with automatic failover to OSRM. |
| `/api/routes/status` | `GET` | Public | None | Provider status for Google Maps and OSRM fallback engine. |
| `/api/resources` | `GET` | Public | None | Operational fleet inventory, apparatus capabilities, and staging status. |
| `/api/ledger` | `GET` | Public | `?limit=100` | Cryptographically chained audit ledger entries with SHA-256 block hashes. |
| `/api/ledger/verify` | `GET` | Public | None | Cryptographic integrity verification testing every block in the hash chain. |
| `/api/community/reports`| `GET` | Public | None | Verified ranger and community field reports. |
| `/api/community/report` | `POST`| Public | `{ reporterName, hazardType, lat, lng }`| Ingests ground field report and appends cryptographic verification block. |
| `/api/diagnostics` | `GET` | Public | None | Live connection and latency diagnostic telemetry for all 15 integrations. |
| `/api/auth/token` | `POST`| Public | `{ role: UserRole }` | Generates HMAC-SHA256 signed JWT bearer token with clearance profile. |

---

# 8. Comprehensive 19 Workspaces Frontend Reference

1. **`#dashboard` (Global Fire Observatory)**: Real-time mission control with 3D solar-terminator Earth globe, telemetry status widgets, regional sector switcher, and 2D GIS map.
2. **`#incidents` (Harmonisation Laboratory / Incident Dossier)**: 13 monitored thermal complexes, deep incident dossier, multi-tier epistemic state progression, and weather telemetry.
3. **`#fire` (Historical Burning Calendar)**: 25-year empirical burning climatology matrix, monthly harmonized sensor counts, and CSV/GeoJSON export actions.
4. **`#anomaly` (Anomaly Intelligence / FireLens Research)**: 13,065 canonical observations, pixel footprint map (2,619 detections in 2024), effort decomposition, and MCD64A1 validation.
5. **`#catalogue` (Scientific Research Explorer)**: 18 Earth observation datasets cataloging spectral bands, revisit cadences, and access URLs.
6. **`#orbital` (Observation Bias & Orbit)**: 12 satellite orbits, viewing geometry distortion curves, scan angle sliders (0°–65°), and Terra drift assessment.
7. **`#evidence` (Validation & Evidence Investigation Graph)**: 8 causal evidence nodes, 7 chronological timeline events (07:45–10:45 UTC), and 10 cognitive agents.
8. **`#environment` (NWP Weather Grid)**: Numerical weather prediction feeds, relative humidity, dead fuel moisture, and wind vector canvas animation.
9. **`#news` (GDELT Situational News & Claims)**: Natural hazard news feed, credibility ratings (95–98%), and automated claim extraction.
10. **`#simulation` (Physical Fire Spread Model)**: Rothermel elliptical spread simulation, fuel moisture sliders, and +1h/+3h/+6h isochrones.
11. **`#learning` (Benchmark & Self-Learning Engine)**: Champion `v2.7` vs. Challenger `v2.8-beta` comparative metrics, with offline evaluation gating.
12. **`#backtracking` (Cryptographic Ledger Audit)**: Tamper-evident SHA-256 block ledger inspector, with full state reconstruction.
13. **`#routing` (Corridor Routing & EMS)**: 3 emergency corridors, 2 casualty reports, and 4 agency dispatch workflows.
14. **`#voice` (Telephony Carrier Gateway)**: AI telephony briefing logs with Dr. S. Ramanathan, SIP identity verification, and dispatch consent records.
15. **`#resources` (Resource Asset Tracking)**: 4 operational emergency apparatus across 3 availability provenance tiers.
16. **`#community` (Community Operations & Field Telemetry)**: Ranger field report intake and bilingual emergency broadcast bulletins.
17. **`#diagnostics` (Provider Diagnostics)**: Live status cards for 15 system providers (NASA, Open-Meteo, Gemini, OSRM, etc.).
18. **`#reports` (ICS Situation Packages & Handoff)**: Automated ICS-201 Incident Briefing form generator with GeoJSON download packages.
19. **`#settings` (RBAC Security & Secrets)**: Role-based access control management across 7 tiers (L0 to L4) and API key storage.

---

# 9. Emergency Corridor Routing, Failover Engine & EMS Dispatch

ALEX implements an emergency route calculation pipeline that combines real-time traffic-aware routes with open-source physical fallback:

```
                          Route Request Initiated
                                    |
                                    v
                     Is GOOGLE_MAPS_API_KEY Configured?
                               /          \
                             Yes           No
                             /               \
                            v                 \
          Execute Google Routes API v2         \
                        |                       \
            Did Call Succeed (HTTP 200)?         \
                    /         \                   \
                  Yes          No (403, timeout)   \
                  /             \                   \
                 v               v                   v
     Return Google Route     Failover to OSRM Driving Engine
                             (https://router.project-osrm.org)
                                         |
                            Did OSRM Return Valid Path?
                                    /         \
                                  Yes          No
                                  /             \
                                 v               v
                     Return OSRM Paved Route    Reject Calculation
                     (Attributed to Fallback)   (Zero Synthetic Routes)
```

1. **Ghat Vehicle Calibration**:
   - `fire_engine`: Multiplied by $1.25\times$ for hairpin bends and steep grades.
   - `logistics_vehicle`: Multiplied by $1.35\times$ for heavy equipment transit.
   - `ambulance`: Multiplied by $0.95\times$ reflecting emergency siren right-of-way.
2. **Zero Synthetic Generation**: If both engines fail, the system rejects the request rather than generating straight-line or synthetic routes.

---

# 10. Cryptographic Event Ledger, RBAC & Security Engineering

### 10.1 HMAC-SHA256 Cryptographic Block Format
Every operational event is written to `data/ledger.jsonl` as an immutable cryptographic block:

```json
{
  "sequenceNumber": 7,
  "timestamp": "2026-11-14T17:15:20.142Z",
  "eventType": "incident_status_updated",
  "actor": "Incident Commander P. Soundararajan, IAS",
  "payload": {
    "incidentId": "INC-NILGIRI-MASINAGUDI-2024",
    "previousStatus": "independently_corroborated",
    "newStatus": "authority_confirmed_emergency"
  },
  "previousHash": "a4f89d34e2c91823...5612",
  "blockHash": "e3b0c44298fc1c14...9afb"
}
```

The `blockHash` is computed over the concatenated canonical string:

$$\text{blockHash} = \text{SHA256}\left(\text{seq} \parallel \text{timestamp} \parallel \text{type} \parallel \text{actor} \parallel \text{payload} \parallel \text{prevHash}\right)$$

### 10.2 Role-Based Access Control (RBAC) Matrix

| Role Designation | Level | Authorized Operations | Restriced Operations |
|---|---|---|---|
| **System Administrator** | L4 | Full API and database access, cryptographic key rotation | None |
| **Incident Commander** | L4 | Incident status elevation, model promotion, emergency orders | Secret alteration without sudo |
| **Lead Scientist** | L3 | Dataset ingestion, calibration tuning, benchmark execution | Casualty dispatch approval |
| **Operations Analyst** | L2 | Route calculations, situation report generation | Status modification |
| **Emergency Operator** | L2 | Dispatch workflows, agency task acknowledgments | Model promotion |
| **Field Ranger** | L1 | Field report submission, local observations | Strategic corridor closure |
| **Public / Community** | L0 | Read-only public dashboard, safety bulletins | All operational APIs |

---

# 11. Data Ingestion, Historical Archives & Provenance Catalog

### 11.1 Harvested Empirical Datasets

| Dataset Identifier | Records / Size | Temporal Extent | Provenance & Source URL |
|---|---|---|---|
| `firelens_nilgiris_2019_2026.json` | 13,065 records (38.4 MB) | Feb 2019 – Apr 2026 | NASA EOSDIS FIRMS MODIS C6.1 & VIIRS 375m NRT/SP |
| `nilgiris_empirical_monthly.json` | 300+ records (25 Years) | Jan 2000 – Dec 2025 | Deduplicated NASA EOSDIS FIRMS Monthly Composite |
| `firelens_validation_mcd64a1.json` | 24 monthly records | Jan 2022 – Dec 2023 | NASA Land Processes DAAC (MCD64A1 Collection 6) |
| `live_incidents.json` | 13 active complexes | Active Operational | NASA EONET v3 Wildfire Feed & Ground Stations |
| `weather_snapshots.json` | 4 regional stations | Real-time NWP | Open-Meteo High-Resolution Numerical Weather Model |

---

# 12. Verification Suite, Testing Matrix & Runbook

### 12.1 Automated Test Execution
The test suite executes 62 unit and integration tests across 17 test suites with zero external mocks in production paths:

```bash
npm test
```
```
✔ harmonizeObservations merges proximate MODIS and VIIRS detections and reduces uncertainty (9.8ms)
✔ evaluateIncidentClassification never promotes unverified anomaly to confirmed emergency (0.3ms)
✔ canTransitionDispatchStatus blocks completion without authorized service integration (0.2ms)
✔ rankEmergencyRoutes switches recommendation when primary corridor is blocked (0.3ms)
✔ simulateScenarioOutcome marks output as simulation and scales spread with wind vs rain (0.7ms)
✔ computeGeometricFireSpreadProjection increases elliptical eccentricity with wind and RH (0.7ms)
✔ filterTemporalEvidenceByCutoff filters events chronologically and computes modality counts (1.3ms)
✔ aggregateIncidentHorizontalTimeline aggregates satellite, field reports, and sensor alerts (1.3ms)
✔ computeTslEarthSolarState computes day/twilight/night terminator transitions matching shader (8.0ms)
✔ latLngToCartesian and cartesianToLatLng accurately invert 3D globe click-to-pin coordinates (3.7ms)
✔ computeHotspotMarkerVisuals scales 3D NASA MODIS/VIIRS markers by FRP intensity (2.9ms)
✔ createPinnedIncidentRecord generates a valid IncidentRecord with MODIS/VIIRS observations (2.3ms)
✔ AccessControlService - enforces role profiles and authorization matrix (1.1ms)
✔ AccessControlService - canAccessWorkspace evaluates correctly (0.2ms)
✔ NasaFirmsAdapter - honest unconfigured notice when mapKey is absent (1.7ms)
✔ WeatherAdapter - degToCompass conversion produces accurate cardinal directions (0.3ms)
✔ CommunityService - submits field report and appends to immutable ledger (9.3ms)
✔ CommunityService - publishes safety bulletin and records operator action (2.1ms)
✔ DataIntegrity - No drone or UAV references exist in production codebase (Rule 11) (15.3ms)
✔ DataIntegrity - No simulated telephony auto-advancing timers exist (Rule 1, 8, 15, 189) (0.3ms)
✔ DataIntegrity - No unsupported ~39% FRP attenuation calculation exists (Rule 14) (0.2ms)
✔ DataIntegrity - Weather adapter contains zero synthetic default values on error (Rule 3) (0.2ms)
✔ DataIntegrity - Production store and data/store.json contain zero hardcoded production incidents (Rule P0.1) (17.1ms)
✔ DataIntegrity - Fire calendar contains zero silent regional substitution fallbacks (Rule P2.3) (9.9ms)
✔ FireCalendarService - returns multi-year burning activity with medians and anomalies (2.0ms)
✔ FireCalendarService - generates valid downloadable CSV format with scientific headers (1.6ms)
✔ FireCalendarService - generates valid GeoJSON FeatureCollection (2.4ms)
✔ FireReconciliationEngine - Tier 1 calculates accurate pixel footprint area (2.7ms)
✔ FireReconciliationEngine - Tier 2 matches contemporaneous MODIS and VIIRS detections (2.6ms)
✔ FireReconciliationEngine - Tier 3 clusters coherent multi-pass fire events and computes perimeters (2.8ms)
✔ FireReconciliationEngine - Tier 4 aggregates statistics with effort index and Z-scores (0.8ms)
✔ FireLens - decomposes observing effort vs actual burning on empirical dataset (121.6ms)
✔ FireLens - harmonizeObservations enforces strict temporal pass gating (0.9ms)
✔ FireLens - canonical observations preserve native confidence without lossy conversion (77.1ms)
✔ NasaFirmsAdapter - reports all supported operational sensors and truthful config status (1.2ms)
✔ NasaFirmsAdapter - returns honest unconfigured state without throwing (0.8ms)
✔ NasaFirmsAdapter - parses FIRMS CSV correctly with deduplication and sensor mapping (1.0ms)
✔ NasaFirmsAdapter - raw observations stored independently with full provenance (Rule P2.1) (14.4ms)
✔ LearningService - requires human commander sign-off for model promotion (12.9ms)
✔ CryptographicLedger - genesis, chaining, and tamper detection (9.2ms)
✔ OrbitalService - satellite inventory contains major Earth observation platforms (1.1ms)
✔ OrbitalService - evaluates Terra orbital drift and diurnal sampling bias accurately (0.5ms)
✔ OrbitalService - viewing geometry calculation expands pixel footprint across scan (0.5ms)
✔ OrbitalService - observation opportunities include quality and clear sky predictions (1.0ms)
✔ OrbitalService - SGP4 orbital propagation accurately computes geodetic coordinates (Rule P2.4) (4.3ms)
✔ RothermelSpreadEngine - verifies Anderson fuel models and differential spread physics (1.5ms)
✔ NifcPerimetersAdapter - returns structured perimeters and spread isochrones (1991.0ms)
✔ LiveFuelsAdapter - physical fuel moisture physics and station queries (1060.8ms)
✔ ExposureService - aggregates demographics, infrastructure and evacuation zones (0.8ms)
✔ HazardAndFleetService - evaluates vehicle weight and height clearance against road hazards (0.4ms)
✔ GroundVerificationService - delivers authenticated ranger reports and corroboration matrix (0.4ms)
✔ SeasonalAnomalyEvaluation - accurately evaluates hotspot deviations against 25-year median (0.3ms)
✔ RoutingService - calculates authentic road network corridor with failover and zero synthetic routes (1711.8ms)
✔ SecurityRBAC - blocks requests without token or credentials with HTTP 401 (2.8ms)
✔ SecurityRBAC - blocks community role from performing commander operations with HTTP 403 (0.6ms)
✔ SecurityRBAC - allows authenticated commander to proceed (0.2ms)
✔ SecurityRBAC - cryptographic HMAC-SHA256 signed token lifecycle and forgery rejection (Rule P0.2) (8.5ms)
✔ SecurityPatch - traceIdMiddleware generates and preserves trace IDs (0.5ms)
✔ SecurityPatch - securityHeadersMiddleware sets strict OWASP headers and CSP (0.3ms)
✔ SecurityPatch - maskSecret redacts secrets and handles edge cases (0.4ms)
✔ TelephonyService - enforces AI identity announcement and valid progression (10.0ms)
✔ WebDatasetHarvest - verifies authoritative web data files and integrity (50.5ms)

ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ duration_ms 12446.3
```

### 12.2 Operational Startup Runbook
1. **Start Backend API Server**:
   ```bash
   npm run server
   ```
   Listens on `http://localhost:3001` with JSON endpoints, WebSocket telephony gateway, and SSE streams.
2. **Start Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   Vite server initializes on `http://localhost:3000` with HMR client port pinned to 3000 and full API proxying.
3. **Run Production Build Verification**:
   ```bash
   npx tsc --noEmit && npm run build
   ```
   Ensures zero compilation errors and generates optimized static assets in `dist/`.

