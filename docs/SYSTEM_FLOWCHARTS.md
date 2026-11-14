# ALEX & FIRELENS: SYSTEM FLOWCHARTS & SCIENTIFIC ARCHITECTURE MAP
**Platform:** Autonomous Live Environmental eXpert (ALEX) & FireLens Earth Observation Laboratory  
**Version:** 3.1.0 (Research Grade)  
**Formats Available:** Native Interactive Mermaid Diagrams + Vector SVGs (in [`docs/flowcharts/`](file:///home/justin/Desktop/NASA/docs/flowcharts/))  

---

## Index of Flowcharts
1. [Master End-to-End System Architecture](#1-master-end-to-end-system-architecture) — [`01_master_system_architecture.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/01_master_system_architecture.svg)
2. [NASA Earth Observation & Data Ingestion Pipeline](#2-nasa-earth-observation--data-ingestion-pipeline) — [`02_nasa_earth_observation_pipeline.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/02_nasa_earth_observation_pipeline.svg)
3. [FireLens 4-Tier Causal Reconciliation Engine](#3-firelens-4-tier-causal-reconciliation-engine) — [`03_firelens_4tier_reconciliation.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/03_firelens_4tier_reconciliation.svg)
4. [Rothermel (1972) Wildfire Spread Physics Engine](#4-rothermel-1972-wildfire-spread-physics-engine) — [`04_rothermel_wildfire_physics.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/04_rothermel_wildfire_physics.svg)
5. [Epistemic State Progression & Verification Lifecycle](#5-epistemic-state-progression--verification-lifecycle) — [`05_epistemic_verification_lifecycle.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/05_epistemic_verification_lifecycle.svg)
6. [Emergency Corridor Routing & Dual-Engine Failover](#6-emergency-corridor-routing--dual-engine-failover) — [`06_routing_and_failover_engine.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/06_routing_and_failover_engine.svg)
7. [HMAC-SHA256 Cryptographic Ledger & RBAC Security](#7-hmac-sha256-cryptographic-ledger--rbac-security) — [`07_cryptographic_ledger_and_rbac.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/07_cryptographic_ledger_and_rbac.svg)
8. [AI Telephony Carrier Gateway & Voice Operations](#8-ai-telephony-carrier-gateway--voice-operations) — [`08_ai_telephony_and_voice_gateway.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/08_ai_telephony_and_voice_gateway.svg)

---

## 1. Master End-to-End System Architecture

High-level topological flow tracing data from spaceborne sensors through backend reconciliation, physics simulation, operational routing, cryptographic sealing, and presentation across 19 workspaces.

```mermaid
flowchart TD
    subgraph Ingress["1. SATELLITE & TELEMETRY INGRESS"]
        F1["NASA FIRMS (MODIS C6.1 & VIIRS 375m)"]
        F2["NASA EONET v3 (Active Wildfires)"]
        F3["CelesTrak NORAD (SGP4 Orbital Ephemeris)"]
        F4["Open-Meteo NWP (Hourly Weather Grid)"]
        F5["GDELT Natural Hazards (Situational News)"]
    end

    subgraph Controller["2. CONTROLLER & APPLICATION CORE"]
        GW["Express 4.21 Gateway (Trace IDs & Security Headers)"]
        ADP["NASA FIRMS Adapter (Deduplication & Provenance)"]
        ENG["Intelligence & Reconciliation Engine"]
        SIM["Rothermel Spread Engine (Anderson 13 Fuels)"]
        RTE["Emergency Router (Google Routes v2 + OSRM Failover)"]
        TEL["Telephony Service (AI Disclosure & SIP Trunk)"]
    end

    subgraph Science["3. FIRELENS SCIENTIFIC RECONCILIATION"]
        T1["Tier 1: Footprint Modeling (Scan x Track Expansion)"]
        T2["Tier 2: Cross-Sensor Gating (Spatial 2.5km / Time 30m)"]
        T3["Tier 3: Space-Time Clustering (DBSCAN Fire Fronts)"]
        T4["Tier 4: Effort Decomposition (Constellation Infill vs Ground Burn)"]
    end

    subgraph Storage["4. PERSISTENCE & CRYPTOGRAPHY"]
        LED["HMAC-SHA256 Chained Cryptographic Ledger"]
        STR["Production State Store (Incidents, Tasks, Routes, Fleet)"]
        ARC["Empirical 2019-2026 Archive (13,065 Observations)"]
    end

    subgraph Frontend["5. PRESENTATION & 19 WORKSPACES"]
        GLB["3D Earth Solar Globe (WebGPU Day/Night Terminator)"]
        DOS["Incident Dossier & Lab (Multi-Tier Verification)"]
        CAL["Burning Activity Calendar (25-Yr Baseline & Heatmap)"]
        ANOM["FireLens Anomaly Lab (2,619 Footprints in 2024)"]
        OPS["Operational Modules (Corridors, Telephony, Fleet)"]
    end

    F1 --> ADP
    F2 --> ENG
    F3 --> ENG
    F4 --> SIM
    F5 --> ENG

    ADP --> GW
    ENG --> GW
    SIM --> GW
    RTE --> GW
    TEL --> GW

    ADP --> T1
    T1 --> T2 --> T3 --> T4
    T4 --> GW
    ARC --> T4

    GW --> LED
    GW --> STR

    GW --> GLB
    GW --> DOS
    GW --> CAL
    GW --> ANOM
    GW --> OPS
```

Vector SVG: [`01_master_system_architecture.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/01_master_system_architecture.svg)

---

## 2. NASA Earth Observation & Data Ingestion Pipeline

Detailed ingestion flow from NASA satellites through NRT and Science Quality streams down to canonical coordinate normalization and spatial storage.

```mermaid
flowchart LR
    subgraph Constellation["NASA Earth Observation Constellation"]
        SAT1["Terra (MODIS) - 10:30 Descending (Drifting)"]
        SAT2["Aqua (MODIS) - 13:30 Ascending (Solar Peak)"]
        SAT3["Suomi-NPP (VIIRS) - 13:30 Ascending (375m I-Band)"]
        SAT4["NOAA-20 (VIIRS) - 13:30 (50-min separation)"]
        SAT5["NOAA-21 (VIIRS) - 13:30 (Quarter-orbit offset)"]
    end

    subgraph Downlink["NASA EOSDIS Downlink & Processing"]
        NRT["FIRMS NRT Stream (Latency < 3 Hours)"]
        STD["Standard Science Quality (Collection 6.1 Calibration)"]
    end

    subgraph Processing["ALEX Normalization & Validation"]
        VAL["Coordinate & Bounds Validation (WGS84 EPSG:4326)"]
        DEDUP["Spatial-Temporal Pass Deduplication"]
        CHECKSUM["SHA-256 Payload Checksumming & Provenance"]
    end

    subgraph Stores["Persistence Layer"]
        STORE["Canonical FireLens Dataset (13,065 Observations)"]
        GIS["PostGIS Geodatabase (Spatial Indexing)"]
    end

    SAT1 --> NRT
    SAT2 --> NRT
    SAT3 --> NRT
    SAT4 --> NRT
    SAT5 --> NRT

    SAT1 --> STD
    SAT2 --> STD
    SAT3 --> STD
    SAT4 --> STD
    SAT5 --> STD

    NRT --> VAL
    STD --> VAL

    VAL --> DEDUP
    DEDUP --> CHECKSUM
    CHECKSUM --> STORE
    CHECKSUM --> GIS
```

Vector SVG: [`02_nasa_earth_observation_pipeline.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/02_nasa_earth_observation_pipeline.svg)

---

## 3. FireLens 4-Tier Causal Reconciliation Engine

Hierarchical decomposition decoupling spaceborne observing capacity upgrades from genuine ground burning trends.

```mermaid
flowchart TD
    RAW["Raw Satellite Active Fire Telemetry (MODIS & VIIRS)"] --> T1

    subgraph T1["TIER 1: SENSOR-NATIVE FOOTPRINT MODELING"]
        direction TB
        F1["Compute IFOV Geometry: S(θ) and T(θ)"]
        F2["MODIS: 1.0 km nadir -> 9.6 km² limb"]
        F3["VIIRS: 0.14 km² nadir -> 0.64 km² limb (On-board Aggregation)"]
        F1 --> F2 --> F3
    end

    T1 --> T2

    subgraph T2["TIER 2: CROSS-SENSOR CONTEMPORANEOUS GATING"]
        direction TB
        G1["Temporal Gate: |tA - tB| <= 30 minutes"]
        G2["Spatial Gate: d(coordA, coordB) <= R_match = sqrt(SA² + TA²) + sqrt(SB² + TB²)"]
        G3["Eliminates Overlapping Detections Across Overpasses"]
        G1 --> G2 --> G3
    end

    T2 --> T3

    subgraph T3["TIER 3: SPACE-TIME DBSCAN EVENT CLUSTERING"]
        direction TB
        C1["Spatial Epsilon: ε = 2.5 km"]
        C2["Time Linking Horizon: Δt <= 24 Hours"]
        C3["Clusters Hotspots into Continuous Fire Front Perimeters"]
        C1 --> C2 --> C3
    end

    T3 --> T4

    subgraph T4["TIER 4: OBSERVING EFFORT DECOMPOSITION"]
        direction TB
        D1["Mathematical Model: H_obs(y) = E(y) · B(y)"]
        D2["Calibrate Against NASA MCD64A1 Burned Area Ground Truth"]
        D3["Results: Apparent Growth +29.2% | True Growth +7.4% (91.6% Infill)"]
        D1 --> D2 --> D3
    end

    T4 --> OUT["Scientifically Reconciled Active Fire Intelligence (Z-Scores & Verified Perimeters)"]
```

Vector SVG: [`03_firelens_4tier_reconciliation.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/03_firelens_4tier_reconciliation.svg)

---

## 4. Rothermel (1972) Wildfire Spread Physics Engine

Surface fuel bed physics, thermodynamics, fuel moisture calculations, and forward rate-of-spread elliptical projections.

```mermaid
flowchart LR
    subgraph In["Environmental Parameters"]
        FUEL["Anderson 13 Fuel Model (w0, σ, δ)"]
        WX["Open-Meteo Weather (T, H, Wind U)"]
        TOPO["Topographic Slope (φ) & Aspect"]
    end

    subgraph Thermo["Thermodynamics & Moisture"]
        EMC["Nelson (2000) EMC Model"]
        QIG["Heat of Pre-Ignition: Qig = 581 + 2594·Mf (kJ/kg)"]
        FACTORS["Wind Factor Φ_W & Slope Factor Φ_S"]
    end

    subgraph Engine["Rothermel (1972) Surface Engine"]
        REACT["Reaction Intensity: IR = Γ' · wn · h · ηM · ηS"]
        ROS["Rate of Spread: R = (IR · ξ · (1 + ΦW + ΦS)) / (ρb · ε · Qig)"]
    end

    subgraph Out["Spatial Hazard Projections"]
        BYRAM["Byram Intensity: IB = Hc · wa · R\nFlame Length: Lf = 0.0775 · IB^0.46"]
        ISO["Elliptical Isochrone Forecasting (+1h, +3h, +6h)"]
    end

    FUEL --> REACT
    WX --> EMC
    EMC --> QIG
    WX --> FACTORS
    TOPO --> FACTORS

    QIG --> ROS
    FACTORS --> ROS
    REACT --> ROS

    ROS --> BYRAM
    ROS --> ISO
    FACTORS --> ISO
```

Vector SVG: [`04_rothermel_wildfire_physics.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/04_rothermel_wildfire_physics.svg)

---

## 5. Epistemic State Progression & Verification Lifecycle

State transition safeguards prohibiting premature promotion of spaceborne thermal anomalies to emergency dispatch without human verification.

```mermaid
flowchart TD
    L1["LEVEL 1: SATELLITE THERMAL ANOMALY\nRaw Infrared Brightness / FRP Anomaly\nSource: Spaceborne Overpass (MODIS/VIIRS)"]
    
    Q1{"Multi-Source Corroboration?\nSecond Pass OR Sensor Alert?"}
    
    L2["LEVEL 2: INDEPENDENTLY CORROBORATED\nConfirmed Across Multiple Sensors\nSpatial Uncertainty Halved (±280m)"]
    
    Q2{"Ground Verification Ingested?\nSigned Beat Ranger Patrol Log?"}
    
    L3["LEVEL 3: FIELD-CONFIRMED INCIDENT\nAuthenticated Ranger / CAD 112 Report\nCryptographically Signed Evidence"]
    
    Q3{"Incident Commander Sign-off?\nStatutory Authority Approval?"}
    
    L4["LEVEL 4: AUTHORITY-CONFIRMED EMERGENCY\nOfficial Declaration by District Collectorate\nFull EMS & Apparatus Mobilization"]
    
    SEAL["HMAC-SHA256 Cryptographic Block Sealed\nTamper-Proof Audit Record Written to Ledger"]

    DISCARD["Quarantined Anomaly\nIndustrial Flare or Transient Glint"]

    L1 --> Q1
    Q1 -- "Yes" --> L2
    Q1 -- "No" --> DISCARD

    L2 --> Q2
    Q2 -- "Yes" --> L3
    Q2 -- "Awaiting Ground Team" --> L2

    L3 --> Q3
    Q3 -- "Authorized" --> L4
    Q3 -- "Contained Locally" --> L3

    L4 --> SEAL
```

Vector SVG: [`05_epistemic_verification_lifecycle.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/05_epistemic_verification_lifecycle.svg)

---

## 6. Emergency Corridor Routing & Dual-Engine Failover

Failover routing engine providing real-time Google Routes API navigation with automated fallback to physical OSRM road geometry, adhering to zero synthetic route creation.

```mermaid
flowchart TD
    REQ["Route Request: Origin [lat,lng] -> Destination [lat,lng] | Vehicle Category"] --> KEY_CHK{"GOOGLE_MAPS_API_KEY Configured?"}

    KEY_CHK -- "Yes" --> GOOGLE["Execute Google Routes API v2\n(https://routes.googleapis.com)"]
    KEY_CHK -- "No" --> OSRM["FAILOVER TO OSRM PHYSICAL DRIVING ENGINE\n(https://router.project-osrm.org)"]

    GOOGLE --> GOOGLE_CHK{"Call Succeeded (HTTP 200)?"}
    GOOGLE_CHK -- "Yes" --> CALIB["Ghat Vehicle Calibration\nFire Engine 1.25x | Logistics 1.35x | Ambulance 0.95x"]
    GOOGLE_CHK -- "HTTP 403 / Timeout / Fail" --> OSRM

    OSRM --> OSRM_CHK{"OSRM Returned Valid Path?"}
    OSRM_CHK -- "Yes" --> CALIB
    OSRM_CHK -- "No" --> REJECT["Reject Calculation (HTTP 503)\nZero Synthetic Routes per Rules 1 & 3"]

    CALIB --> HAZ_CHK["Hazard & Road Restriction Check\nBridge Weight Limits & Hairpin Clearances"]
    HAZ_CHK --> PUB["Publish Route Option\nWaypoints, Duration, & Cryptographic Ledger Event"]
```

Vector SVG: [`06_routing_and_failover_engine.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/06_routing_and_failover_engine.svg)

---

## 7. HMAC-SHA256 Cryptographic Ledger & RBAC Security

Security architecture enforcing secret masking, role-based authorization gates, and hash-chained blockchain integrity.

```mermaid
flowchart LR
    subgraph Events["Operational Event Triggers"]
        E1["Incident Status Transition"]
        E2["Emergency Route Calculation"]
        E3["Casualty 108 Dispatch"]
        E4["Model Promotion Approval"]
    end

    subgraph Security["Security Middleware"]
        MASK["Secret Redaction (Mask Keys & PII)"]
        RBAC["RBAC Gate (Verify Level L0-L4 Signature)"]
    end

    subgraph Ledger["Cryptographic Block Chain"]
        PREV["Block N-1 (Hash: a4f8...9123)"]
        NEW["Block N (Hash: e3b0...9afb)"]
        DISK["data/ledger.jsonl (Append-Only Log)"]
    end

    subgraph Audit["Audit & Forensics"]
        AUDIT["Integrity Audit Engine (/api/ledger/verify)"]
        REPLAY["State Replay & Forensic Reconstruction"]
    end

    E1 --> MASK
    E2 --> MASK
    E3 --> MASK
    E4 --> MASK

    MASK --> RBAC
    RBAC --> NEW
    PREV --> NEW
    NEW --> DISK

    DISK --> AUDIT
    AUDIT --> REPLAY
```

Vector SVG: [`07_cryptographic_ledger_and_rbac.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/07_cryptographic_ledger_and_rbac.svg)

---

## 8. AI Telephony Carrier Gateway & Voice Operations

Statutory disclosure, recording consent verification, bi-directional 24 kHz audio streaming, tool calling, and action acceptance.

```mermaid
flowchart TD
    TRIG["Casualty Dispatch Trigger\nRecipient: Dr. S. Ramanathan (Hospital Chief of Trauma)"] --> SIP["SIP / PSTN Carrier Gateway (Twilio / WebRTC)\nCaller ID: +91-423-EOC-ALEX"]

    SIP --> CONSENT{"STATUTORY ANNOUNCEMENT\n'This is ALEX on behalf of District EOC. Call is recorded.'\nConsent Verified?"}

    CONSENT -- "Consent Refused" --> ABORT["Call Terminated Safely\nNon-Consent Recorded Without Action"]
    CONSENT -- "Consent Granted" --> WS["Bi-directional 24 kHz PCM WebSocket Stream\nAudioWorklet -> Live Speech-to-Speech / Gemini 2.0"]

    WS --> TOOL["AI Tool Execution\nQuery Beds, Confirm ETA, Check Blockages"]
    TOOL --> ACCEPT["Recipient Commitment Formally Recorded\nBed Reserved · Code AUTH-OOTY-88 · Transcript Signed"]
    ACCEPT --> LEDGER["Immutable Ledger Audit Record\nAppends Voice Transcript & Outcome to Ledger"]
```

Vector SVG: [`08_ai_telephony_and_voice_gateway.svg`](file:///home/justin/Desktop/NASA/docs/flowcharts/08_ai_telephony_and_voice_gateway.svg)
