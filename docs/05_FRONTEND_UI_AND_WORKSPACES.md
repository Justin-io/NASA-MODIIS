# Frontend Workspaces, UI Architecture & 3D Visualization

ALEX features a modular React 19 interface comprising 17 top-level operational workspaces, dual-mode 2D/3D geospatial visualization, and a 24 kHz bi-directional voice studio.

---

## 1. Top-Level Shell & Navigation (`src/App.tsx`)

The root application container manages regional contexts, active incident selections, top navigation routing, and global modal overlays.

### State Architecture
- **`currentTab`**: Active navigation route (`dashboard`, `incidents`, `firelens`, `orbital`, `evidence`, `routing`, `weather`, `news`, `voice`, `resources`, `community`, `simulation`, `backtracking`, `learning`, `catalogue`, `diagnostics`, `settings`).
- **`selectedRegion`**: Active Area of Interest (`REG-NILGIRI`, `REG-SIERRA`, `REG-ARCADIA`, `REG-PANTANAL`). Automatically synchronizes 2D map centers, 3D globe coordinates, and API queries.
- **`selectedIncidentId`**: Active incident identifier, shared across Dashboard, Incident Dossier, and Operations views.
- **`currentUserRole`**: Current RBAC user role (`public_viewer` to `system_admin`), gating elevated controls.
- **`isVoicePaletteOpen`**: Toggles the floating Gemini 3.8 Live Voice Command modal.

---

## 2. Command Dashboard (`src/dashboard/CommandDashboardView.tsx`)

Primary tactical overview combining macro metrics, geospatial intelligence, and active detections.

### Core UI Modules
1. **Summary Metric Cards**:
   - **Authority Confirmed Emergencies**: Counts Level 4 and Level 5 validated incidents.
   - **Candidate Incidents**: Tracks thermal anomalies and independently corroborated events.
   - **Peak NASA FIRMS FRP Card**: Features an interactive mode toggle (`[NRT]` vs `[Archive (13k)]`). When set to Archive, loads 13,065 canonical research records (Nilgiris 2019–2026), displaying peak detected radiative power ($382.4\text{ MW}$) and detection counts.
   - **Ridge Wind & Fuel Dryness**: Displays live Open-Meteo wind vectors and Nelson Equilibrium Moisture Content fuel dryness index.
   - **Readiness & Pending Actions**: Counts unfulfilled mutual-aid dispatches and available emergency apparatus.
2. **Dual-Mode Geospatial Intelligence**:
   - Seamlessly toggles between the Canvas 2D [ScientificMap2D](file:///home/justin/Desktop/NASA/src/dashboard/ScientificMap2D.tsx) and the WebGL [EarthGlobe3D](file:///home/justin/Desktop/NASA/src/earth/EarthGlobe3D.tsx).
   - Floating action pill (`ESC / R3F 3D`) triggers full-screen 3D immersion.
3. **Monitored Detections Ledger**:
   - Chronological incident list with verification tier badges, severity indicators, and click-to-focus navigation.

---

## 3. Geospatial Visualization Engines

### 3.1 Scientific 2D Map Canvas (`src/dashboard/ScientificMap2D.tsx`)
Custom HTML5 Canvas 2D geospatial map designed for high-density rendering without third-party mapping library dependencies.

- **Coordinate Projection**: Converts spherical geographic coordinates $(\text{lng}, \text{lat})$ into Mercator world pixels using standard EPSG:3857 projection:
  $$x = \frac{\text{lng} + 180}{360} \cdot 256 \cdot 2^{\text{zoom}}$$
  $$y = \left(1 - \frac{\ln(\tan(\text{lat} \cdot \pi / 180) + \sec(\text{lat} \cdot \pi / 180))}{\pi}\right) \cdot 128 \cdot 2^{\text{zoom}}$$
- **Layer Toggles**:
  - `showFirms`: Real NASA FIRMS thermal anomaly dots scaled by Fire Radiative Power (MW).
  - `showEonet`: NASA EONET natural disaster event icons.
  - `showPerimeters`: Rothermel 1h/3h/6h spread isochrone polygons.
  - `showFuels`: RAWS automated weather stations.
  - `showExposure`: WorldPop gridded demographic cells.
  - `showHazardsFleet`: Emergency vehicles and road hazard bottlenecks.
  - `showGroundCad`: 112 emergency calls and ranger ICS-201 field reports.

### 3.2 3D Earth Globe (`src/earth/EarthGlobe3D.tsx`)
React Three Fiber (`@react-three/fiber`) and Three.js 3D planetary visualization.

- **Solar Terminator Mathematics**: Computes the exact subsolar point $(\delta_\odot, \alpha_\odot)$ and renders real-time day, civil twilight, and night shading.
- **3D Thermal Spikes**: Extrudes vertical glowing cylinder meshes at active fire coordinates, where height and color luminosity scale with Fire Radiative Power (MW).
- **Satellite Orbital Tracks**: Renders 3D Keplerian elliptical orbits and ground-track nadir projections for tracked Earth observation platforms.
- **Raycasting & Coordinate Inversion**: Inverts 3D sphere raycast intersection coordinates back into geodetic latitude/longitude:
  $$\text{lat} = \arcsin(y / R), \quad \text{lng} = \arctan2(x, z)$$

---

## 4. FireLens Research Center (`src/fire/FireLensResearchView.tsx`)

The peer-review research interface dedicated to causal observing effort decomposition.

### 1. Source-Native Observation Map
- Displays 13,065 genuine NASA FIRMS detections across Nilgiris Biosphere Reserve (2019–2026).
- Renders sensor-specific bowtie bounding ellipses ($\text{scanKm} \times \text{trackKm}$) oriented along ground-track azimuths, illustrating how swath-edge pixel footprints grow off-nadir.
- Filters observations by calendar year (2019 to 2026), sensor (MODIS vs. VIIRS), and day/night pass.

### 2. Quantitative Decomposition Waterfall & 95% CI
- Visualizes the mathematical breakdown of apparent $+29.2\%$ hotspot growth into true ground burning ($+7.4\%$) and observing system expansion ($91.6\%$).
- Displays 1,000-iteration Monte Carlo bootstrap confidence intervals ($50.0\%–81.1\%$).
- Charts NASA Terra's Mean Local Solar Time (MLST) drift curve (10:30 AM to ~09:00 AM) and diurnal thermal suppression factor.

### 3. Independent Validation & Data Release Card
- Renders linear regression scatter plots of Raw Counts vs. MCD64A1 ($R^2 = 0.225$) and Effort-Adjusted Rates vs. MCD64A1 ($R^2 = 0.864$).
- One-click export of the frozen research dataset:
  - `Export Canonical CSV` (3.0 MB, 13,065 rows)
  - `Export Canonical GeoJSON` (FeatureCollection)
  - `Export Full JSON Release` (15.2 MB)

---

## 5. Incident Intelligence Dossier (`src/incidents/IncidentIntelligenceView.tsx`)

Multi-tab command dossier providing deep investigative and corroborative intelligence.

### 6 Specialized Sub-Workspaces
1. **`dossier`**: Comprehensive incident brief, timeline events, AI threat reasoning, and status update controls.
2. **`calendar`**: NASA Multi-Sensor Harmonized Burning Activity Calendar. Binds directly to `NILGIRIS_EMPIRICAL_MONTHLY_ARCHIVE` (24 monthly periods, 2019–2026), computing genuine seasonal anomaly scores without synthetic sinusoids.
3. **`perimeters`**: NIFC WFIGS perimeter boundaries and Rothermel progression isochrones. Features `ProvenanceNoticeBanner` clearly identifying tactical simulation benchmarks.
4. **`fuels`**: RAWS automated fire weather stations and Nelson NFDRS physical fuel moisture sticks ($1\text{h}$, $10\text{h}$, $100\text{h}$, ERC, BI). Features `ProvenanceNoticeBanner`.
5. **`exposure`**: WorldPop gridded demographics, OSM building footprints with structural vulnerability ratings, and evacuation corridors. Features `ProvenanceNoticeBanner`.
6. **`verification`**: Emergency 112 CAD dispatch logs, authenticated ICS-201 field ranger assessments with 64-char SHA-256 digital signatures, and multi-source corroboration matrix. Features `ProvenanceNoticeBanner`.

---

## 6. Voice Operations & Quick Palette (`src/voice/VoiceOperationsView.tsx`)

Real-time audio command studio connecting to the Gemini 3.8 Live API over WebSocket.

- **Audio Capture Worklet**: Utilizes `public/pcm-capture-worklet.js` to capture raw microphone input via Web Audio API, downsampling in real-time to 24 kHz 16-bit linear PCM chunks.
- **Audio Playback Buffer**: Queues and streams synthesized 24 kHz audio chunks emitted by Gemini Live. Supports instant user barge-in (interruption) by flushing the audio buffer on speech detection.
- **Operational Palette Tools**: Quick voice actions for incident queries, Rothermel simulation triggers, evacuation dispatching, and map panning.

---

## 7. Operations & Rothermel Simulation (`src/missions/OperationsAndSimulationView.tsx`)

Digital twin scenario simulator for hypothetical weather and operational interventions.

- **Rothermel Differential Spread Integration**: Dynamically executes `RothermelSpreadEngine.calculateSpread()` across Anderson 13 fuel models, terrain slopes ($0^\circ–60^\circ$), wind speed deltas, and fuel moisture fractions.
- **Intervention Controls**: Sliders for wind speed adjustment, wind shift azimuth, precipitation rate, primary road closures, and secondary ignitions.
- **Resource Allocation Calculus**: Automatically calculates required Type 3 tactical fire engines, heavy water tenders, and ambulances based on simulated spread area growth ($ha/hr$).

---

## 8. Additional Operational Workspaces

- **Orbital Intelligence (`OrbitalIntelligenceView.tsx`)**: Real-time SGP4 satellite ground-track tracker, CelesTrak NORAD elements, viewing geometry calculator, and pass planner.
- **Evidence & Agents (`EvidenceAndAgentsView.tsx`)**: Multi-agent deliberation room, evidence graph visualization, and consensus evaluator.
- **Routing & Hazards (`RoutingAndCasualtyView.tsx`)**: Emergency corridor planning, bridge load limit evaluations, and casualty triage queues.
- **Environmental News (`EnvironmentalNewsView.tsx`)**: Live GDELT Project v2 crisis news feed binned to regional coordinates.
- **Immutable Ledger Backtracking (`BacktrackingView.tsx`)**: Cryptographic block verification, backward state inspection, and ledger certificate validation.
- **Self-Learning Benchmarks (`SelfLearningView.tsx`)**: Human-in-the-loop ML model benchmark reviews and commander sign-offs.
- **Data Catalogue (`DataCatalogueView.tsx`)**: Catalog of data products, update cadences, spatial resolutions, and NASA EOSDIS collection citations.
- **System Diagnostics (`DiagnosticsView.tsx`)**: Automated diagnostics for all 15 external providers.
- **Settings & RBAC (`SettingsAndAccessView.tsx`)**: Role-based access control switcher and system configuration inspector.

