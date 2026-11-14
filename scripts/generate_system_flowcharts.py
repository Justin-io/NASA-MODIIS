#!/usr/bin/env python3
"""
ALEX & FireLens Complete System Flowchart & Architecture Generator
Generates clean, publication-grade SVG flowcharts using Graphviz
and exports corresponding Mermaid diagram specifications.
"""

import os
import subprocess
import shutil

OUTPUT_DIR = "/home/justin/Desktop/NASA/docs/flowcharts"
ARTIFACT_DIR = "/home/justin/.gemini/antigravity/brain/31d7af80-47fe-4c79-ae5c-9c8facc009e9/flowcharts"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

DOT_DIAGRAMS = {
    "01_master_system_architecture": """
digraph MasterArchitecture {
    graph [rankdir=TB, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, compound=true, nodesep=0.6, ranksep=0.7];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.2,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    // Clusters
    subgraph cluster_ingress {
        label = "1. SATELLITE & TELEMETRY INGRESS";
        style = "dashed,rounded";
        color = "#0284C7";
        bgcolor = "#F0F9FF";
        fontcolor = "#0369A1";
        fontsize = 13;

        firms [label="NASA FIRMS\\nMODIS C6.1 & VIIRS 375m", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        eonet [label="NASA EONET v3\\nActive Wildfire Events", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        sgp4 [label="CelesTrak NORAD\\nSGP4 Satellite Ephemeris", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        meteo [label="Open-Meteo NWP Grid\\nHourly Weather Telemetry", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        gdelt [label="GDELT Natural Hazards\\nSituational News & Claims", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
    }

    subgraph cluster_backend {
        label = "2. APPLICATION CONTROLLER & SERVICES";
        style = "dashed,rounded";
        color = "#475569";
        bgcolor = "#F8FAFC";
        fontcolor = "#1E293B";
        fontsize = 13;

        router [label="Express 4.21 API Gateway\\nTrace IDs · Security Headers · RBAC", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
        firms_adapter [label="NASA FIRMS Adapter\\nDeduplication & Provenance Checksums", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
        intel_engine [label="Intelligence & Reconciliation Engine\\nMulti-Modal Evidence Corroboration", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
        spread_engine [label="Rothermel Spread Engine\\nAnderson 13 Fuels & Isochrones", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
        routing_service [label="Emergency Routing Engine\\nGoogle Routes v2 + OSRM Failover", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
        telephony [label="Voice Operations Gateway\\nAI Disclosure & SIP Trunking", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
    }

    subgraph cluster_science {
        label = "3. FIRELENS SCIENTIFIC LABORATORY";
        style = "dashed,rounded";
        color = "#D97706";
        bgcolor = "#FFFBEB";
        fontcolor = "#B45309";
        fontsize = 13;

        tier1 [label="Tier 1: Footprint Modeling\\nScan x Track IFOV Expansion", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
        tier2 [label="Tier 2: Cross-Sensor Gating\\nSpatial (2.5km) & Time (30m) Window", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
        tier3 [label="Tier 3: Space-Time Clustering\\nDBSCAN Multi-Pass Fire Complexes", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
        tier4 [label="Tier 4: Effort Decomposition\\nConstellation Expansion vs Ground Burn", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
    }

    subgraph cluster_persistence {
        label = "4. PERSISTENCE & CRYPTOGRAPHY";
        style = "dashed,rounded";
        color = "#059669";
        bgcolor = "#ECFDF5";
        fontcolor = "#047857";
        fontsize = 13;

        ledger [label="Cryptographic Ledger\\nHMAC-SHA256 Chained Hash Blocks", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
        store [label="Production State Store\\nIncidents · Tasks · Routes · Inventory", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
        archive [label="Empirical 2019-2026 Archive\\n13,065 Observations & 25-Yr Baseline", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
    }

    subgraph cluster_frontend {
        label = "5. PRESENTATION & 19 WORKSPACES";
        style = "dashed,rounded";
        color = "#4F46E5";
        bgcolor = "#EEF2FF";
        fontcolor = "#3730A3";
        fontsize = 13;

        globe [label="3D Earth Solar Globe\\nWebGPU Terminator & Spatial Pins", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];
        incident_view [label="Incident Dossier & Lab\\nMulti-Tier Verification & Telemetry", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];
        calendar_view [label="Burning Activity Calendar\\n25-Year Climatology & Heatmap", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];
        anomaly_view [label="FireLens Anomaly Lab\\n2,619 Footprints & MCD64A1 Validation", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];
        ops_views [label="Operations & Logistics\\nCorridors · Assets · Voice · Audits", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];
    }

    // Ingress to Controller
    firms -> firms_adapter [label="Active Hotspots"];
    eonet -> intel_engine [label="Wildfire Perimeters"];
    sgp4 -> intel_engine [label="Orbital Passes"];
    meteo -> spread_engine [label="Wind & Humidity"];
    gdelt -> intel_engine [label="Corroborating News"];

    // Controller Connections
    firms_adapter -> router;
    intel_engine -> router;
    spread_engine -> router;
    routing_service -> router;
    telephony -> router;

    // Science Layer
    firms_adapter -> tier1 [label="Raw Passes"];
    tier1 -> tier2 -> tier3 -> tier4;
    tier4 -> router [label="Calibrated Signals"];

    // Persistence Layer
    router -> ledger [label="Cryptographic Seal"];
    router -> store [label="State Transitions"];
    archive -> tier4 [label="25-Yr Ground Truth"];

    // Presentation Layer
    router -> globe [label="REST / SSE"];
    router -> incident_view;
    router -> calendar_view;
    router -> anomaly_view;
    router -> ops_views;
}
""",

    "02_nasa_earth_observation_pipeline": """
digraph NasaPipeline {
    graph [rankdir=LR, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, nodesep=0.5, ranksep=0.7];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.18,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    subgraph cluster_satellites {
        label = "Spaceborne Earth Observation Constellation";
        style = "dashed,rounded"; color = "#0284C7"; bgcolor = "#F0F9FF"; fontcolor = "#0369A1";
        terra [label="Terra (MODIS)\\n10:30 Descending (Drifting)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        aqua [label="Aqua (MODIS)\\n13:30 Ascending (Solar Peak)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        snpp [label="Suomi-NPP (VIIRS)\\n13:30 Ascending (375m)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        noaa20 [label="NOAA-20 (VIIRS)\\n13:30 (50-min separation)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        noaa21 [label="NOAA-21 (VIIRS)\\n13:30 (Quarter-orbit offset)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
    }

    subgraph cluster_downlink {
        label = "NASA EOSDIS & LANCE Processing";
        style = "dashed,rounded"; color = "#475569"; bgcolor = "#F8FAFC"; fontcolor = "#1E293B";
        nrt_feed [label="FIRMS NRT Stream\\nLatency < 3 Hours", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
        sp_archive [label="Standard Science Quality\\nCollection 6.1 Calibration", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
    }

    subgraph cluster_normalization {
        label = "ALEX Ingestion & Normalization Core";
        style = "dashed,rounded"; color = "#D97706"; bgcolor = "#FFFBEB"; fontcolor = "#B45309";
        parser [label="CSV & API Parsing\\nCoordinate Validation (WGS84)", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
        dedup [label="Spatial-Temporal Deduplication\\nSensor Pass Preservation", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
        checksum [label="SHA-256 Checksumming\\nNative Confidence Retention", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
    }

    subgraph cluster_storage {
        label = "Grounded Data Stores";
        style = "dashed,rounded"; color = "#059669"; bgcolor = "#ECFDF5"; fontcolor = "#047857";
        canonical_store [label="Canonical FireLens Dataset\\n13,065 Verified Records", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
        postgis [label="PostGIS Geodatabase\\nSRID 4326 Spatial Index", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
    }

    terra -> nrt_feed;
    aqua -> nrt_feed;
    snpp -> nrt_feed;
    noaa20 -> nrt_feed;
    noaa21 -> nrt_feed;

    terra -> sp_archive;
    aqua -> sp_archive;
    snpp -> sp_archive;
    noaa20 -> sp_archive;
    noaa21 -> sp_archive;

    nrt_feed -> parser [label="NRT Poll"];
    sp_archive -> parser [label="Historical Backfill"];

    parser -> dedup [label="Validated Tuples"];
    dedup -> checksum [label="Unique Hotspots"];
    checksum -> canonical_store [label="JSON Ingest"];
    checksum -> postgis [label="ST_Point(lng,lat)"];
}
""",

    "03_firelens_4tier_reconciliation": """
digraph FireLensTiers {
    graph [rankdir=TB, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, nodesep=0.5, ranksep=0.6];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.2,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    input_obs [label="Raw Satellite Active Fire Telemetry\\n(MODIS Terra/Aqua + VIIRS SNPP/NOAA-20/NOAA-21)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];

    // Tier 1
    t1_geom [label="TIER 1: SENSOR-NATIVE FOOTPRINT MODELING\\nS(θ) = S0 · sec²(θv) · cos(θ)\\nT(θ) = T0 · sec(θv)\\nMODIS: 1.0 km nadir -> 9.6 km² limb | VIIRS: 0.14 km² -> 0.64 km² limb", fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];

    // Tier 2
    t2_gating [label="TIER 2: CROSS-SENSOR CONTEMPORANEOUS GATING\\nTemporal Gating: |tA - tB| <= 30 minutes\\nSpatial Gating: d(coordA, coordB) <= Rmatch = sqrt(SA² + TA²) + sqrt(SB² + TB²)\\nEliminates Double-Counting Across Concurrent Satellite Passes", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];

    // Tier 3
    t3_cluster [label="TIER 3: SPACE-TIME DBSCAN EVENT CLUSTERING\\nSpatial Epsilon: ε = 2.5 km | Time Linking Horizon: Δt <= 24 Hours\\nAggregates Multi-Pass Hotspots into Coherent Physical Fire Fronts\\nComputes Geometric Perimeter Polygons & Front Velocity", fillcolor="#F59E0B", color="#B45309", fontcolor="#FFFFFF"];

    // Tier 4
    t4_decomp [label="TIER 4: OBSERVING EFFORT DECOMPOSITION\\nH_obs(y) = E(y) · B(y)\\nDecomposes Constellation Growth vs Actual Burning\\nValidated Against NASA MCD64A1 Burned Area Ground Truth\\nApparent Growth: +29.2% | True Growth: +7.4% (91.6% Constellation Infill)", fillcolor="#D97706", color="#92400E", fontcolor="#FFFFFF"];

    output_reconciled [label="Scientifically Reconciled Active Fire Intelligence\\nDe-biased Hotspot Counts · True Anomaly Z-Scores · Verified Perimeters", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];

    input_obs -> t1_geom [label="Raw Latitude/Longitude/FRP"];
    t1_geom -> t2_gating [label="IFOV Ellipses"];
    t2_gating -> t3_cluster [label="Deduplicated Matches"];
    t3_cluster -> t4_decomp [label="Coherent Fire Complexes"];
    t4_decomp -> output_reconciled [label="Published Intelligence"];
}
""",

    "04_rothermel_wildfire_physics": """
digraph RothermelPhysics {
    graph [rankdir=LR, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, nodesep=0.5, ranksep=0.7];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.2,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    subgraph cluster_inputs {
        label = "Environmental Inputs";
        style = "dashed,rounded"; color = "#0284C7"; bgcolor = "#F0F9FF"; fontcolor = "#0369A1";
        fuel [label="Anderson 13 Fuel Model\\nLoading (w0), SAV Ratio (σ), Bed Depth (δ)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        weather [label="Open-Meteo Weather\\nTemp (T), Relative Humidity (H), Wind Speed (U)", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        topography [label="Topographic Slope\\nSlope Angle (φ) & Aspect Bearing", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
    }

    subgraph cluster_thermo {
        label = "Thermodynamics & Fuel Moisture";
        style = "dashed,rounded"; color = "#D97706"; bgcolor = "#FFFBEB"; fontcolor = "#B45309";
        emc [label="Nelson (2000) EMC\\nEquilibrium Moisture Content (Mf)", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
        qig [label="Heat of Pre-Ignition (Qig)\\nQig = 581 + 2594 · Mf (kJ/kg)", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
        phi_wind [label="Wind & Slope Factors\\nΦ_W = C · U^B · (β/β_op)^(-E)\\nΦ_S = 5.275 · β^(-0.3) · tan²(φ)", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];
    }

    subgraph cluster_rothermel {
        label = "Rothermel (1972) Surface Engine";
        style = "dashed,rounded"; color = "#EF4444"; bgcolor = "#FEF2F2"; fontcolor = "#B91C1C";
        reaction [label="Reaction Intensity (IR)\\nIR = Γ' · wn · h · ηM · ηS\\n(kJ / m² / min)", fillcolor="#FECACA", color="#EF4444", fontcolor="#7F1D1D"];
        ros [label="Rate of Spread (R)\\nR = (IR · ξ · (1 + ΦW + ΦS)) / (ρb · ε · Qig)\\nForward Front Speed (m/min)", fillcolor="#FCA5A5", color="#DC2626", fontcolor="#450A0A"];
    }

    subgraph cluster_outputs {
        label = "Spatial Hazard Projections";
        style = "dashed,rounded"; color = "#059669"; bgcolor = "#ECFDF5"; fontcolor = "#047857";
        byram [label="Byram Fireline Intensity (IB)\\nIB = Hc · wa · R\\nFlame Length Lf = 0.0775 · IB^0.46", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
        isochrones [label="Elliptical Isochrone Forecasting\\n+1h, +3h, +6h Evacuation Contours", fillcolor="#6EE7B7", color="#059669", fontcolor="#064E3B"];
    }

    fuel -> reaction;
    weather -> emc;
    emc -> qig;
    weather -> phi_wind;
    topography -> phi_wind;

    qig -> ros;
    phi_wind -> ros;
    reaction -> ros;

    ros -> byram;
    ros -> isochrones;
    phi_wind -> isochrones [label="Elliptical Eccentricity"];
}
""",

    "05_epistemic_verification_lifecycle": """
digraph EpistemicLifecycle {
    graph [rankdir=TB, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, nodesep=0.5, ranksep=0.7];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.2,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    l1 [label="LEVEL 1: SATELLITE THERMAL ANOMALY\\nRaw Infrared Brightness Temperature / FRP Spike\\nSource: MODIS or VIIRS Overpass\\nStatus: Unverified Spaceborne Detection", fillcolor="#F1F5F9", color="#94A3B8", fontcolor="#334155"];
    
    corrob_check [label="Spatial-Temporal Corroboration\\nSecond Satellite Pass OR Ground Sensor Telemetry?", shape=diamond, fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];
    
    l2 [label="LEVEL 2: INDEPENDENTLY CORROBORATED\\nConfirmed Across Multiple Satellites / Remote Sensors\\nSpatial Uncertainty Halved (±280m)\\nStatus: High-Probability Active Combustion", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];

    ground_check [label="Human Ground Verification\\nBeat Ranger or CAD 112 Report Ingested?", shape=diamond, fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];

    l3 [label="LEVEL 3: FIELD-CONFIRMED INCIDENT\\nAuthenticated Ranger Patrol / EOC Field Log\\nCryptographically Signed Ground Report\\nStatus: Verified Fire Ground Front", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];

    cmd_check [label="Incident Commander Evaluation\\nStatutory Authority Approval Granted?", shape=diamond, fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];

    l4 [label="LEVEL 4: AUTHORITY-CONFIRMED EMERGENCY\\nStatutory Declaration by District Incident Commander\\nFull EMS, Fire Apparatus & Hospital Mobilization\\nStatus: Active Major Emergency", fillcolor="#FECACA", color="#EF4444", fontcolor="#7F1D1D"];

    ledger_seal [label="HMAC-SHA256 Cryptographic Block Sealed\\nTamper-Proof Audit Record Written to Ledger", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];

    discard [label="Anomaly Flagged / Quarantined\\nIndustrial Heat, Flare, or Transient Glint", fillcolor="#E2E8F0", color="#64748B", fontcolor="#475569"];

    l1 -> corrob_check;
    corrob_check -> l2 [label="Corroborated"];
    corrob_check -> discard [label="Single Pass Only"];
    
    l2 -> ground_check;
    ground_check -> l3 [label="Signed Field Report"];
    ground_check -> l2 [label="Awaiting Ground Team"];

    l3 -> cmd_check;
    cmd_check -> l4 [label="Commander Authorized"];
    cmd_check -> l3 [label="Contained / Handled Locally"];

    l4 -> ledger_seal;
}
""",

    "06_routing_and_failover_engine": """
digraph RoutingFailover {
    graph [rankdir=TB, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, nodesep=0.5, ranksep=0.6];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.2,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    req [label="Emergency Route Request (POST /api/routes/calculate)\\nOrigin [lat,lng] -> Destination [lat,lng] | Vehicle Category", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
    
    key_check [label="GOOGLE_MAPS_API_KEY Configured?", shape=diamond, fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];
    
    google_api [label="Execute Google Routes API v2\\n(https://routes.googleapis.com/directions/v2:computeRoutes)\\nTraffic-Aware Real-Time Routing", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];

    google_success [label="Google Call Succeeded (HTTP 200)?", shape=diamond, fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];

    osrm_fallback [label="FAILOVER TO OSRM PHYSICAL DRIVING ENGINE\\n(https://router.project-osrm.org/route/v1/driving)\\nOpenStreetMap Verified Topology", fillcolor="#FDE68A", color="#D97706", fontcolor="#78350F"];

    osrm_success [label="OSRM Returned Valid Route?", shape=diamond, fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];

    vehicle_calc [label="Ghat Vehicle Class Calibration\\nFire Engine: 1.25x | Logistics: 1.35x | Ambulance: 0.95x", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];

    hazard_check [label="Hazard & Road Restriction Check\\nBridge Weight Limits · Hairpin Clearances · Active Fire Buffer", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];

    route_ok [label="Publish Operational Route Option\\nPolyline Waypoints · Duration · Turn Guidance · Ledger Event", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];

    reject [label="Reject Calculation (HTTP 503)\\nZero Synthetic Fallbacks per Rules 1 & 3", fillcolor="#FECACA", color="#EF4444", fontcolor="#7F1D1D"];

    req -> key_check;
    key_check -> google_api [label="Yes"];
    key_check -> osrm_fallback [label="No (Unset)"];

    google_api -> google_success;
    google_success -> vehicle_calc [label="HTTP 200 OK"];
    google_success -> osrm_fallback [label="HTTP 403 / Timeout / Fail"];

    osrm_fallback -> osrm_success;
    osrm_success -> vehicle_calc [label="Path Found"];
    osrm_success -> reject [label="Both Engines Unreachable"];

    vehicle_calc -> hazard_check;
    hazard_check -> route_ok;
}
""",

    "07_cryptographic_ledger_and_rbac": """
digraph CryptoLedger {
    graph [rankdir=LR, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, nodesep=0.5, ranksep=0.7];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.2,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    subgraph cluster_events {
        label = "Operational Event Stream";
        style = "dashed,rounded"; color = "#0284C7"; bgcolor = "#F0F9FF"; fontcolor = "#0369A1";
        evt1 [label="Incident Status Transition", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        evt2 [label="Emergency Route Calculation", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        evt3 [label="Casualty 108 Dispatch", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
        evt4 [label="Model Challenger Promotion", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];
    }

    subgraph cluster_security {
        label = "Security Middleware & RBAC";
        style = "dashed,rounded"; color = "#475569"; bgcolor = "#F8FAFC"; fontcolor = "#1E293B";
        sanitize [label="Secret Redaction\\nMask API Keys & PII", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
        rbac [label="RBAC Token Gate\\nVerify Level L0-L4 Signature", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];
    }

    subgraph cluster_blockchain {
        label = "HMAC-SHA256 Cryptographic Chain";
        style = "dashed,rounded"; color = "#059669"; bgcolor = "#ECFDF5"; fontcolor = "#047857";
        prev_block [label="Block N-1\\nHash: a4f8...9123", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
        new_block [label="Block N\\nHash: e3b0...9afb\\nPrevious: a4f8...9123", fillcolor="#6EE7B7", color="#059669", fontcolor="#064E3B"];
        disk [label="data/ledger.jsonl\\nImmutable Append-Only Log", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];
    }

    subgraph cluster_audit {
        label = "Backtracking & Audit View";
        style = "dashed,rounded"; color = "#4F46E5"; bgcolor = "#EEF2FF"; fontcolor = "#3730A3";
        verify [label="Integrity Audit Engine\\nCheck Chain Consistency", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];
        replay [label="State Replay & Forensics\\nReconstruct Any Historical Instant", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];
    }

    evt1 -> sanitize;
    evt2 -> sanitize;
    evt3 -> sanitize;
    evt4 -> sanitize;

    sanitize -> rbac [label="Sanitized Event"];
    rbac -> new_block [label="Authorized Event"];
    prev_block -> new_block [label="Hash Chaining"];
    new_block -> disk [label="Atomic Append"];

    disk -> verify [label="GET /api/ledger/verify"];
    verify -> replay [label="100% Tamper-Proof Verified"];
}
""",

    "08_ai_telephony_and_voice_gateway": """
digraph TelephonyGateway {
    graph [rankdir=TB, bgcolor="transparent", fontname="Helvetica,Arial,sans-serif", fontsize=12, nodesep=0.5, ranksep=0.6];
    node [shape=box, style="rounded,filled", fontname="Helvetica,Arial,sans-serif", fontsize=11, penwidth=1.5, margin="0.2,0.12"];
    edge [fontname="Helvetica,Arial,sans-serif", fontsize=10, color="#64748B", penwidth=1.5, arrowsize=0.8];

    trigger [label="Casualty Dispatch / Urgent Briefing Trigger\\nIncident: Masinagudi Complex | Recipient: Dr. Ramanathan", fillcolor="#BAE6FD", color="#0284C7", fontcolor="#0C4A6E"];

    consent_gate [label="MANDATORY STATUTORY ANNOUNCEMENT\\n'This is ALEX on behalf of District EOC. Call is recorded.'\\nRecipient Legal Consent Verified?", shape=diamond, fillcolor="#FEF3C7", color="#D97706", fontcolor="#78350F"];

    sip_trunk [label="SIP / PSTN Carrier Gateway (Twilio / WebRTC)\\nCaller ID: +91-423-EOC-ALEX | Verified SIP Signaling", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];

    ws_pipeline [label="Bi-directional 24 kHz PCM WebSocket Stream\\nAudioWorklet -> Live Speech-to-Speech / Gemini 2.0 Flash", fillcolor="#C7D2FE", color="#4F46E5", fontcolor="#1E1B4B"];

    tool_call [label="AI Intelligence Tool Execution\\nQuery Bed Availability · Confirm ETA · Check Road Blockages", fillcolor="#E2E8F0", color="#475569", fontcolor="#0F172A"];

    action_accept [label="Recipient Commitment Formally Recorded\\nBed Reserved · Code AUTH-OOTY-88 · Transcript Signed", fillcolor="#A7F3D0", color="#059669", fontcolor="#064E3B"];

    ledger_log [label="Immutable Ledger Audit Record\\nAppends Telephony Transcript & Commitment to Ledger", fillcolor="#6EE7B7", color="#059669", fontcolor="#064E3B"];

    abort [label="Call Terminated Safely\\nNon-Consent Logged Without Action", fillcolor="#FECACA", color="#EF4444", fontcolor="#7F1D1D"];

    trigger -> sip_trunk;
    sip_trunk -> consent_gate [label="Call Answered"];
    consent_gate -> ws_pipeline [label="Consent Confirmed"];
    consent_gate -> abort [label="Consent Refused"];

    ws_pipeline -> tool_call [label="Voice Dialog"];
    tool_call -> action_accept [label="Action Agreed"];
    action_accept -> ledger_log;
}
"""
}

def render_diagrams():
    print(f"[*] Compiling {len(DOT_DIAGRAMS)} publication-grade SVG flowcharts using Graphviz...")
    for name, dot_content in DOT_DIAGRAMS.items():
        dot_file = os.path.join(OUTPUT_DIR, f"{name}.dot")
        svg_file = os.path.join(OUTPUT_DIR, f"{name}.svg")
        artifact_svg = os.path.join(ARTIFACT_DIR, f"{name}.svg")

        with open(dot_file, "w") as f:
            f.write(dot_content.strip())

        cmd = ["dot", "-Tsvg", dot_file, "-o", svg_file]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[!] Error compiling {name}: {res.stderr}")
        else:
            print(f"[+] Successfully generated: {svg_file}")
            shutil.copy2(svg_file, artifact_svg)

    print("[*] All flowcharts rendered and mirrored to artifact directory successfully.")

if __name__ == "__main__":
    render_diagrams()
